import { createHmac, timingSafeEqual } from "node:crypto";

function getOrderAccessSecret() {
  const secret =
    process.env.ORDER_ACCESS_SECRET ??
    process.env.APP_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.STRIPE_SECRET_KEY;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ORDER_ACCESS_SECRET não configurada no servidor.");
    }
    return "dev-order-access-secret";
  }
  return secret;
}

export function generateOrderAccessToken(orderId: string) {
  return createHmac("sha256", getOrderAccessSecret()).update(orderId).digest("hex");
}

export function validateOrderAccess(orderId: string, token?: string | null) {
  if (!token || !/^[0-9a-f]{64}$/.test(token)) {
    throw new Error("Token de acesso do pedido inválido. Reabra o link completo do pedido.");
  }

  const expected = Buffer.from(generateOrderAccessToken(orderId), "hex");
  const provided = Buffer.from(token, "hex");

  if (!timingSafeEqual(provided, expected)) {
    throw new Error("Token de acesso do pedido inválido. Reabra o link completo do pedido.");
  }
}
