import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MERCADO_PAGO_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const MERCADO_PAGO_BASE_URL = process.env.MERCADO_PAGO_BASE_URL ?? "https://api.mercadopago.com";
const MERCADO_PAGO_ITEM_TITLE = process.env.MERCADO_PAGO_ITEM_TITLE ?? "Canção de Fé Exclusiva";
const MERCADO_PAGO_ITEM_PRICE = Number(process.env.MERCADO_PAGO_ITEM_PRICE ?? "149.9");
const MERCADO_PAGO_APP_URL = process.env.MERCADO_PAGO_APP_URL;

if (!MERCADO_PAGO_ACCESS_TOKEN) {
  console.error("MERCADO_PAGO_ACCESS_TOKEN is not configured.");
}

if (!MERCADO_PAGO_APP_URL) {
  console.error("MERCADO_PAGO_APP_URL is not configured.");
}

function getHeaders() {
  if (!MERCADO_PAGO_ACCESS_TOKEN) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado.");
  }

  return {
    Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function getBackUrls(orderId: string) {
  if (!MERCADO_PAGO_APP_URL) {
    throw new Error("MERCADO_PAGO_APP_URL não configurado.");
  }

  return {
    success: `${MERCADO_PAGO_APP_URL}/acompanhar?id=${orderId}`,
    failure: `${MERCADO_PAGO_APP_URL}/acompanhar?id=${orderId}`,
    pending: `${MERCADO_PAGO_APP_URL}/acompanhar?id=${orderId}`,
  };
}

export async function criarCheckoutMercadoPago(pedidoId: string) {
  const { data: pedido, error } = await supabaseAdmin
    .from("pedidos")
    .select("id, nome_cliente, email_cliente, telefone_cliente, genero_musical, descricao, status")
    .eq("id", pedidoId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar pedido: ${error.message}`);
  }

  if (!pedido) {
    throw new Error("Pedido não encontrado.");
  }

  if (!["letra_aprovada", "previa", "pagamento"].includes(pedido.status)) {
    throw new Error("O pedido precisa ter a letra aprovada antes de criar o checkout.");
  }

  const payload = {
    items: [
      {
        title: `${MERCADO_PAGO_ITEM_TITLE} - ${pedido.nome_cliente ?? "Cliente"}`,
        quantity: 1,
        currency_id: "BRL",
        unit_price: MERCADO_PAGO_ITEM_PRICE,
      },
    ],
    payer: {
      email: pedido.email_cliente ?? "no-reply@mercadopago.com",
      first_name: pedido.nome_cliente ?? "Cliente",
      phone: {
        area_code: pedido.telefone_cliente?.replace(/\D/g, "").slice(0, 2) || "55",
        number: pedido.telefone_cliente?.replace(/\D/g, "").slice(2) || "000000000",
      },
    },
    external_reference: pedidoId,
    notification_url: `${MERCADO_PAGO_APP_URL}/webhooks/mercadopago/payment`,
    back_urls: getBackUrls(pedidoId),
    auto_return: "approved",
    payment_methods: {
      excluded_payment_types: [{ id: "atm" }],
      installments: 1,
    },
    metadata: {
      pedido_id: pedidoId,
      origem: "Canção de Fé",
    },
  };

  const response = await fetch(`${MERCADO_PAGO_BASE_URL}/checkout/preferences`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao criar preferência Mercado Pago: ${response.status} ${body}`);
  }

  const data = await response.json();
  const checkoutUrl = data.sandbox_init_point ?? data.init_point;
  const preferenceId = String(data.id ?? "");

  if (!checkoutUrl) {
    throw new Error("Resposta inválida do Mercado Pago: checkout URL ausente.");
  }

  const agora = new Date().toISOString();

  const { data: updatedPedido, error: updateError } = await supabaseAdmin
    .from("pedidos")
    .update({
      mercado_pago_checkout_url: checkoutUrl,
      mercado_pago_preference_id: preferenceId,
      mercado_pago_status: "pending",
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
    mensagem_whatsapp: "Checkout Mercado Pago criado e aguardando pagamento",
    criado_em: agora,
  });

  return {
    checkoutUrl,
    preferenceId,
    status: updatedPedido.status,
  };
}

export async function handleMercadoPagoWebhook(request: Request) {
  if (request.method === "GET") {
    return new Response("ok", { status: 200 });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  const url = new URL(request.url);
  const params = url.searchParams;
  const topic = params.get("topic") ?? "";
  const id = params.get("id") ?? params.get("data.id");

  let payload: unknown = null;
  try {
    const text = await request.text();
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  const paymentId =
    id ||
    (payload && typeof payload === "object" && "data" in payload && typeof payload["data"] === "object"
      ? String((payload as any).data.id ?? "")
      : "") ||
    (payload && typeof payload === "object" && "id" in payload ? String((payload as any).id ?? "") : "");

  if (!paymentId) {
    return new Response(JSON.stringify({ error: "Payment ID not found" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const paymentResponse = await fetch(`${MERCADO_PAGO_BASE_URL}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: getHeaders(),
  });

  if (!paymentResponse.ok) {
    const body = await paymentResponse.text();
    console.error("Failed to fetch Mercado Pago payment", paymentId, body);
    return new Response(JSON.stringify({ error: "Failed to fetch payment details" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  const payment = await paymentResponse.json();
  const externalReference = String(payment.external_reference ?? "").trim();
  const status = String(payment.status ?? "").toLowerCase();
  const paymentIdentifier = String(payment.id ?? "");
  const pagoEm = String(payment.date_approved ?? payment.date_created ?? new Date().toISOString());

  if (!externalReference) {
    console.warn("Mercado Pago webhook payload missing external_reference", paymentId);
    return new Response(JSON.stringify({ ok: true, message: "Missing external_reference" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const { data: pedido, error: pedidoError } = await supabaseAdmin
      .from("pedidos")
      .select("id, status")
      .eq("id", externalReference)
      .maybeSingle();

    if (pedidoError) {
      throw new Error(`Falha ao buscar pedido: ${pedidoError.message}`);
    }

    if (!pedido) {
      console.warn("Mercado Pago webhook did not find order", externalReference);
      return new Response(JSON.stringify({ ok: true, message: "No matching order found" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    const novoStatus = status === "approved" ? (pedido.status === "entregue" ? pedido.status : "pago") : pedido.status;
    const updates: Record<string, unknown> = {
      mercado_pago_status: status,
      mercado_pago_payment_id: paymentIdentifier,
    };

    if (status === "approved") {
      updates.pago_em = pagoEm;
      updates.status = novoStatus;
      updates.status_atualizado_em = new Date().toISOString();
    }

    const { error: updateError } = await supabaseAdmin
      .from("pedidos")
      .update(updates)
      .eq("id", pedido.id);

    if (updateError) {
      throw new Error(`Falha ao atualizar pedido: ${updateError.message}`);
    }

    if (pedido.status !== novoStatus && novoStatus === "pago") {
      await supabaseAdmin.from("status_history").insert({
        pedido_id: pedido.id,
        status_anterior: pedido.status,
        status_novo: novoStatus,
        mensagem_whatsapp: "Pagamento confirmado via Mercado Pago",
        criado_em: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({ ok: true, message: "Payment processed" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("Mercado Pago webhook error:", error);
    return new Response(JSON.stringify({ error: "Failed to process webhook" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
