export type ShopifyCheckoutPayload = {
  variantId: string;
  quantity: number;
  customAttributes?: Array<{ key: string; value: string }>;
};

export type ShopifyCheckoutResult = {
  checkoutId: string;
  checkoutUrl: string;
};

export async function createShopifyCheckout(payload: ShopifyCheckoutPayload): Promise<ShopifyCheckoutResult> {
  const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const shopifyApiVersion = process.env.SHOPIFY_API_VERSION ?? "2024-10";
  const shopifyToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!shopifyDomain || !shopifyToken) {
    throw new Error("SHOPIFY_STORE_DOMAIN ou SHOPIFY_ACCESS_TOKEN não configurados.");
  }

  const url = `https://${shopifyDomain}/admin/api/${shopifyApiVersion}/checkouts.json`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": shopifyToken,
    },
    body: JSON.stringify({
      checkout: {
        line_items: [
          {
            variant_id: payload.variantId,
            quantity: payload.quantity,
            custom_attributes: payload.customAttributes || [],
          },
        ],
        note: "Pedido Canção de Fé",
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao criar checkout Shopify: ${response.status} ${body}`);
  }

  const json = await response.json();
  const checkout = json.checkout;
  if (!checkout || !checkout.web_url || !checkout.token) {
    throw new Error("Resposta inválida do Shopify checkout.");
  }

  return {
    checkoutId: checkout.token,
    checkoutUrl: checkout.web_url,
  };
}
