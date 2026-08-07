import { criarPedidoAutomatizado, type PedidoEntrada } from "./pedido.service";

const SHOPIFY_HMAC_HEADER = "x-shopify-hmac-sha256";
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);

  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return typeof btoa === "function" ? btoa(binary) : "";
}

function safeCompare(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function computeHmacBase64(rawBody: ArrayBuffer, secret: string) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, rawBody);
  return arrayBufferToBase64(signature);
}

export async function handleShopifyWebhook(request: Request) {
  if (!SHOPIFY_WEBHOOK_SECRET) {
    console.error("Missing SHOPIFY_WEBHOOK_SECRET environment variable.");
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  if (request.method === "GET") {
    return new Response("ok", { status: 200 });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  // Debug: log that we received a POST for tracing in Vercel logs
  console.info('[shopify.webhook] received request', { method: request.method, url: request.url });

  const rawBody = await request.arrayBuffer();
  const headerSignature = request.headers.get(SHOPIFY_HMAC_HEADER);

  if (!headerSignature) {
    console.warn('[shopify.webhook] missing signature header');
  }

  if (!headerSignature) {
    return new Response(JSON.stringify({ error: "Missing Shopify HMAC header" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const expectedSignature = await computeHmacBase64(rawBody, SHOPIFY_WEBHOOK_SECRET);

  const signatureMatches = safeCompare(expectedSignature, headerSignature || "");
  console.info('[shopify.webhook] signature check', { hasHeader: !!headerSignature, signatureMatches });

  if (!signatureMatches) {
    console.warn('[shopify.webhook] signature mismatch');
    return new Response(JSON.stringify({ error: "Invalid Shopify webhook signature" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const bodyText = new TextDecoder().decode(rawBody);
  let payload: unknown;

  try {
    payload = JSON.parse(bodyText);
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const order = typeof payload === "object" && payload !== null && "order" in payload ? (payload as any).order : payload;

  try {
    const pedidoEntrada = mapShopifyOrderToPedidoEntrada(order as Record<string, unknown>);
    const pedido = await criarPedidoAutomatizado(pedidoEntrada);

    console.info('[shopify.webhook] pedido criado', { pedidoId: pedido.id });

    return new Response(JSON.stringify({ ok: true, id: pedido.id }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to process Shopify webhook:", error);
    return new Response(JSON.stringify({ error: "Failed to create order" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

function mapShopifyOrderToPedidoEntrada(order: Record<string, unknown>): PedidoEntrada {
  const customer = order.customer as Record<string, unknown> | undefined;
  const billing = order.billing_address as Record<string, unknown> | undefined;
  const shipping = order.shipping_address as Record<string, unknown> | undefined;
  const lineItems = Array.isArray(order.line_items) ? (order.line_items as unknown[]) : [];

  const nome_cliente = [
    customer?.first_name as string | undefined,
    customer?.last_name as string | undefined,
  ]
    .filter(Boolean)
    .join(" ")
    .trim() || (order.email as string) || "Cliente Shopify";

  const email_cliente = (order.email as string) || (customer?.email as string) || "no-reply@shopify.com";
  const telefone_cliente =
    (order.phone as string) ||
    (customer?.phone as string) ||
    (billing?.phone as string) ||
    (shipping?.phone as string) ||
    "0000000000";

  const productSummary = lineItems
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;
      const product = item as Record<string, unknown>;
      const quantity = Number(product.quantity ?? 1);
      const name = String(product.name ?? "item");
      return `${quantity}x ${name}`;
    })
    .filter(Boolean)
    .join(", ");

  const genero_musical =
    String(lineItems[0] && typeof lineItems[0] === "object" ? (lineItems[0] as Record<string, unknown>).name ?? "Gospel" : "Gospel").slice(0, 80) ||
    "Gospel";

  const descricao = `Pedido Shopify ${String(order.name ?? order.order_number ?? "").trim()}. Itens: ${productSummary || "Não informado"}. Cliente: ${nome_cliente}.`; 

  return {
    nome_cliente: nome_cliente.slice(0, 120),
    email_cliente: email_cliente.slice(0, 120),
    telefone_cliente: telefone_cliente.slice(0, 30),
    genero_musical: genero_musical.slice(0, 80),
    duracao_segundos: 45,
    descricao: descricao.slice(0, 2000),
  };
}
