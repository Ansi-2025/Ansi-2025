import test from "node:test";
import assert from "node:assert/strict";
import { formatPrice, getMusicPriceCents, MUSIC_PRICE_CENTS } from "./pricing.ts";
import { getOrderBasePriceCents } from "./stripe-pricing.server.ts";

const order = {
  status: "pagamento",
  stripe_session_id: "cs_old",
  stripe_checkout_url: "https://checkout.example.test",
  stripe_payment_intent_id: null,
  segunda_versao: false,
};

function stripeWithAmount(amount: number | null, metadata: { [key: string]: string } = {}) {
  return {
    checkout: { sessions: { retrieve: async () => ({ amount_total: amount, currency: "brl", metadata }) } },
    paymentIntents: { retrieve: async () => ({ amount: amount ?? 0, currency: "brl", metadata }) },
  };
}

test("new prices are exact in cents and formatted for the customer", () => {
  assert.equal(MUSIC_PRICE_CENTS, 1990);
  assert.equal(getMusicPriceCents(), 1990);
  assert.equal(getMusicPriceCents(true), 2490);
  assert.equal(formatPrice(getMusicPriceCents()), "R$ 19,90");
  assert.equal(formatPrice(getMusicPriceCents(true)), "R$ 24,90");
  assert.equal(formatPrice(500), "R$ 5,00");
});

test("existing checkout price is kept when the customer changes the version selection", async () => {
  const base = await getOrderBasePriceCents(stripeWithAmount(1000, { segunda_versao: "false" }), order);
  assert.equal(base, 1000);
  assert.equal(getMusicPriceCents(false, base), 1000);
  assert.equal(getMusicPriceCents(true, base), 1500);
});

test("existing two-version checkout preserves the original base price", async () => {
  const base = await getOrderBasePriceCents(
    stripeWithAmount(1500, { segunda_versao: "true" }),
    { ...order, segunda_versao: true },
  );
  assert.equal(getMusicPriceCents(false, base), 1000);
  assert.equal(getMusicPriceCents(true, base), 1500);
});

test("payment intent prices and older records without version metadata are supported", async () => {
  const base = await getOrderBasePriceCents(stripeWithAmount(1500), {
    ...order,
    stripe_payment_intent_id: "pi_old",
    segunda_versao: true,
  });
  assert.equal(base, 1000);
});

test("expired checkouts retain their original price when the order returns to preview", async () => {
  const base = await getOrderBasePriceCents(stripeWithAmount(1000), { ...order, status: "previa" });
  assert.equal(base, 1000);
  const legacyBase = await getOrderBasePriceCents(stripeWithAmount(1000), {
    ...order,
    status: "previa",
    stripe_payment_intent_id: "cs_old",
  });
  assert.equal(legacyBase, 1000);
});

test("new orders use the new price and invalid existing prices fail explicitly", async () => {
  assert.equal(await getOrderBasePriceCents(stripeWithAmount(1000), {
    ...order,
    status: "previa",
    stripe_session_id: null,
    stripe_checkout_url: null,
  }), 1990);
  await assert.rejects(getOrderBasePriceCents(stripeWithAmount(null), order), /valor.*inválido/i);
  await assert.rejects(
    getOrderBasePriceCents(stripeWithAmount(1000), { ...order, stripe_session_id: null }),
    /verificar o preço/i,
  );
  const failingStripe = stripeWithAmount(1000);
  failingStripe.checkout.sessions.retrieve = async () => { throw new Error("Stripe indisponível"); };
  await assert.rejects(getOrderBasePriceCents(failingStripe, order), /Stripe indisponível/);
});
