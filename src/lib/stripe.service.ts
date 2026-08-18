import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

type PedidoStatus = Database["public"]["Enums"]["pedido_status"];

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_APP_URL = process.env.STRIPE_APP_URL ?? process.env.APP_URL;
const STRIPE_ITEM_TITLE = process.env.STRIPE_ITEM_TITLE ?? "Canção de Fé Exclusiva";
const parseMoneyValue = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const clean = value.trim().replace("R$", "").replace(" ", "").replace(",", ".");
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const STRIPE_ITEM_PRICE = parseMoneyValue(process.env.STRIPE_ITEM_PRICE, 19.9);
const STRIPE_TEST_PRICE = parseMoneyValue(process.env.STRIPE_TEST_PRICE, 1);

export function getStripePriceForCheckout({ secondVersion, forceTestPrice = false }: { secondVersion?: boolean; forceTestPrice?: boolean } = {}) {
  const basePrice = forceTestPrice ? STRIPE_TEST_PRICE : STRIPE_ITEM_PRICE;
  return Number((basePrice + (secondVersion ? 9.9 : 0)).toFixed(2));
}

if (!STRIPE_SECRET_KEY) {
  console.error("STRIPE_SECRET_KEY is not configured.");
}

if (!STRIPE_APP_URL) {
  console.error("STRIPE_APP_URL is not configured.");
}

const stripe = new Stripe(STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-07-29.dahlia",
});

function getSuccessUrl(orderId: string) {
  if (!STRIPE_APP_URL) {
    throw new Error("STRIPE_APP_URL não configurado.");
  }
  return `${STRIPE_APP_URL}/acompanhar?id=${orderId}&session_id={CHECKOUT_SESSION_ID}`;
}

function getCancelUrl(orderId: string) {
  if (!STRIPE_APP_URL) {
    throw new Error("STRIPE_APP_URL não configurado.");
  }
  return `${STRIPE_APP_URL}/acompanhar?id=${orderId}`;
}

export async function criarCheckoutStripe(pedidoId: string, secondVersion = false, forceTestPrice = false) {
  const { data: pedido, error } = await supabaseAdmin
    .from("pedidos")
    .select(
      "id, nome_cliente, email_cliente, telefone_cliente, genero_musical, descricao, status, stripe_checkout_url, stripe_session_id, stripe_payment_intent_id, stripe_payment_status, segunda_versao",
    )
    .eq("id", pedidoId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar pedido: ${error.message}`);
  }

  if (!pedido) {
    throw new Error("Pedido não encontrado.");
  }

  if ((pedido.status as string) === "pagamento" && pedido.stripe_checkout_url && !secondVersion && !pedido.segunda_versao) {
    return {
      checkoutUrl: pedido.stripe_checkout_url,
      sessionId: pedido.stripe_session_id,
      status: pedido.status,
    };
  }

  if (!["letra_aprovada", "pagamento"].includes(pedido.status as string)) {
    throw new Error("O pedido precisa ter a letra aprovada antes de criar o checkout.");
  }

  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY não configurado. Configure a variável de ambiente STRIPE_SECRET_KEY.");
  }

  if (!STRIPE_APP_URL) {
    throw new Error("STRIPE_APP_URL não configurado. Configure a URL pública do app em STRIPE_APP_URL.");
  }

  const totalItemPrice = getStripePriceForCheckout({ secondVersion, forceTestPrice });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "brl",
          product_data: {
            name: `${STRIPE_ITEM_TITLE}${secondVersion ? " + Segunda versão" : ""} - ${pedido.nome_cliente ?? "Cliente"}`,
          },
          unit_amount: Math.round(totalItemPrice * 100),
        },
        quantity: 1,
      },
    ],
    customer_email: pedido.email_cliente ?? undefined,
    metadata: {
      pedido_id: pedidoId,
      origem: "Canção de Fé",
      segunda_versao: String(secondVersion),
    },
    success_url: getSuccessUrl(pedidoId),
    cancel_url: getCancelUrl(pedidoId),
    locale: "pt-BR",
  });

  const checkoutUrl = session.url;
  const sessionId = session.id;
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

  if (!checkoutUrl) {
    throw new Error("Resposta inválida do Stripe: checkout URL ausente.");
  }

  const agora = new Date().toISOString();

  const { data: updatedPedido, error: updateError } = await supabaseAdmin
    .from("pedidos")
    .update({
      stripe_checkout_url: checkoutUrl,
      stripe_session_id: sessionId,
      stripe_payment_intent_id: paymentIntentId,
      stripe_payment_status: session.payment_status ?? "open",
      segunda_versao: secondVersion,
      status: "pagamento",
      status_atualizado_em: agora,
    })
    .eq("id", pedidoId)
    .select("*")
    .single();

  if (updateError || !updatedPedido) {
    throw new Error(`Falha ao salvar checkout do pedido: ${updateError?.message ?? "pedido não encontrado"}`);
  }

  await supabaseAdmin.from("status_history").insert({
    pedido_id: pedidoId,
    status_anterior: pedido.status,
    status_novo: "pagamento",
    mensagem_whatsapp: "Checkout Stripe criado e aguardando pagamento",
    criado_em: agora,
  });

  return {
    checkoutUrl,
    sessionId,
    status: updatedPedido.status,
  };
}

export async function criarPaymentIntentStripe(pedidoId: string, secondVersion = false, forceTestPrice = false) {
  const { data: pedido, error } = await supabaseAdmin
    .from("pedidos")
    .select("id, nome_cliente, email_cliente, telefone_cliente, genero_musical, descricao, status, stripe_payment_intent_id, stripe_payment_status, segunda_versao")
    .eq("id", pedidoId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar pedido: ${error.message}`);
  }

  if (!pedido) {
    throw new Error("Pedido não encontrado.");
  }

  if (!['letra_aprovada', 'pagamento'].includes(pedido.status as string)) {
    throw new Error("O pedido precisa ter a letra aprovada antes de criar o checkout.");
  }

  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY não configurado. Configure a variável de ambiente STRIPE_SECRET_KEY.");
  }

  if (!STRIPE_APP_URL) {
    throw new Error("STRIPE_APP_URL não configurado. Configure a URL pública do app em STRIPE_APP_URL.");
  }

  const totalAmount = Math.round(getStripePriceForCheckout({ secondVersion, forceTestPrice }) * 100);
  const description = `${STRIPE_ITEM_TITLE}${secondVersion ? ' + Segunda versão' : ''} - ${pedido.nome_cliente ?? 'Cliente'}`;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalAmount,
    currency: "brl",
    payment_method_types: ["card"],
    metadata: {
      pedido_id: pedidoId,
      origem: "Canção de Fé",
      segunda_versao: String(secondVersion),
    },
    description,
    receipt_email: pedido.email_cliente ?? undefined,
  });

  if (!paymentIntent.client_secret) {
    throw new Error("Não foi possível criar o pagamento no Stripe.");
  }

  const agora = new Date().toISOString();
  const { data: updatedPedido, error: updateError } = await supabaseAdmin
    .from("pedidos")
    .update({
      stripe_session_id: pedido.stripe_session_id ?? paymentIntent.id,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_payment_status: paymentIntent.status,
      segunda_versao: secondVersion,
      status: "pagamento",
      status_atualizado_em: agora,
    })
    .eq("id", pedidoId)
    .select("*")
    .single();

  if (updateError || !updatedPedido) {
    throw new Error(`Falha ao salvar payment intent do pedido: ${updateError?.message ?? "pedido não encontrado"}`);
  }

  await supabaseAdmin.from("status_history").insert({
    pedido_id: pedidoId,
    status_anterior: pedido.status,
    status_novo: "pagamento",
    mensagem_whatsapp: "Pagamento Stripe criado e aguardando confirmação",
    criado_em: agora,
  });

  return {
    clientSecret: paymentIntent.client_secret,
    amount: totalAmount,
    currency: "brl",
    paymentIntentId: paymentIntent.id,
  };
}

export async function handleStripeWebhook(request: Request) {
  if (request.method === "GET") {
    return new Response("ok", { status: 200 });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured.");
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const object = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent;
  const paymentStatus = "payment_status" in object
    ? String(object.payment_status ?? "").toLowerCase()
    : "status" in object
      ? String(object.status ?? "").toLowerCase()
      : "";
  const metadata = "metadata" in object ? object.metadata : undefined;
  const pedidoId = metadata?.pedido_id ? String(metadata.pedido_id) : "";
  const sessionId = event.type === "checkout.session.completed" && "id" in object ? object.id : undefined;
  const paymentIntentId = "payment_intent" in object && typeof object.payment_intent === "string"
    ? object.payment_intent
    : "id" in object && object.id
      ? object.id
      : undefined;
  const isSuccessfulPayment = event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded";
  const isFailedOrExpiredPayment =
    event.type === "checkout.session.expired" ||
    event.type === "payment_intent.payment_failed" ||
    ["failed", "canceled", "incomplete", "expired"].includes(paymentStatus);

  let resolvedPedidoId = pedidoId;

  if (!resolvedPedidoId && (sessionId || paymentIntentId)) {
    const lookupCandidates: Array<["stripe_session_id" | "stripe_payment_intent_id", string]> = [];

    if (sessionId) {
      lookupCandidates.push(["stripe_session_id", sessionId]);
    }

    if (paymentIntentId) {
      lookupCandidates.push(["stripe_payment_intent_id", paymentIntentId]);
    }

    for (const [field, value] of lookupCandidates) {
      const { data: matchingPedido, error: lookupError } = await supabaseAdmin
        .from("pedidos")
        .select("id")
        .eq(field, value)
        .maybeSingle();

      if (lookupError) {
        throw new Error(`Falha ao localizar pedido por ${field}: ${lookupError.message}`);
      }

      if (matchingPedido) {
        resolvedPedidoId = matchingPedido.id;
        break;
      }
    }
  }

  if (!resolvedPedidoId) {
    console.warn("Stripe webhook missing pedido_id metadata and no Stripe session/payment intent match", {
      eventType: event.type,
      sessionId,
      paymentIntentId,
    });
    return new Response(JSON.stringify({ ok: true, message: "Missing pedido_id" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const { data: pedido, error: pedidoError } = await supabaseAdmin
      .from("pedidos")
      .select("id, status, stripe_payment_status, stripe_session_id, stripe_payment_intent_id, suno_task_id, letra_gerada")
      .eq("id", resolvedPedidoId)
      .maybeSingle();

    if (pedidoError) {
      throw new Error(`Falha ao buscar pedido: ${pedidoError.message}`);
    }

    if (!pedido) {
      console.warn("Stripe webhook did not find order", resolvedPedidoId);
      return new Response(JSON.stringify({ ok: true, message: "No matching order found" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    let novoStatus: PedidoStatus = pedido.status;
    const updates = {
      stripe_payment_status: paymentStatus || pedido.stripe_payment_status,
      stripe_session_id: sessionId ?? pedido.stripe_session_id,
      stripe_payment_intent_id: paymentIntentId ?? pedido.stripe_payment_intent_id,
    } as any;

    if (isSuccessfulPayment && (paymentStatus === "paid" || event.type === "payment_intent.succeeded")) {
      updates.status = "pago";
      updates.pago_em = new Date().toISOString();
      updates.status_atualizado_em = new Date().toISOString();
      novoStatus = "pago";

      if (!pedido.suno_task_id && pedido.letra_gerada) {
        try {
          const { gerarMusicaFinal } = await import("./pedido.service");
          await gerarMusicaFinal(pedido.id);
        } catch (error) {
          console.error("Erro ao disparar geração da música após pagamento:", error);
        }
      }
    } else if (isFailedOrExpiredPayment) {
      updates.status = (pedido.status === "entregue" ? pedido.status : "letra_aprovada") as any;
      updates.status_atualizado_em = new Date().toISOString();
      novoStatus = updates.status as PedidoStatus;
    }

    const { error: updateError } = await supabaseAdmin
      .from("pedidos")
      .update(updates)
      .eq("id", pedido.id);

    if (updateError) {
      throw new Error(`Falha ao atualizar pedido: ${updateError.message}`);
    }

    if (pedido.status !== novoStatus) {
      await supabaseAdmin.from("status_history").insert({
        pedido_id: pedido.id,
        status_anterior: pedido.status,
        status_novo: novoStatus,
        mensagem_whatsapp:
          novoStatus === "pago"
            ? "Pagamento confirmado via Stripe. Música em geração."
            : "Status do pedido atualizado pelo webhook da Stripe.",
        criado_em: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({ ok: true, message: "Payment processed" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return new Response(JSON.stringify({ error: "Failed to process webhook" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}


