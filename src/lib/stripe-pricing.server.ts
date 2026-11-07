import { MUSIC_PRICE_CENTS, SECOND_VERSION_PRICE_CENTS } from "./pricing.ts";

type PaymentRecord = {
  status: string;
  stripe_session_id: string | null;
  stripe_checkout_url: string | null;
  stripe_payment_intent_id: string | null;
  segunda_versao: boolean | null;
};

type PriceSource = {
  checkout: {
    sessions: {
      retrieve(id: string): Promise<{
        amount_total: number | null;
        currency: string | null;
        metadata: { [key: string]: string } | null;
      }>;
    };
  };
  paymentIntents: {
    retrieve(id: string): Promise<{
      amount: number;
      currency: string;
      metadata: { [key: string]: string };
    }>;
  };
};

export async function getOrderBasePriceCents(stripe: PriceSource, order: PaymentRecord) {
  if (!["previa", "pagamento"].includes(order.status)) return MUSIC_PRICE_CENTS;

  const intentId = (order.stripe_payment_intent_id?.startsWith("pi_") ? order.stripe_payment_intent_id : null) ??
    (order.stripe_session_id?.startsWith("pi_") ? order.stripe_session_id : null);
  const sessionId = order.stripe_session_id?.startsWith("cs_") ? order.stripe_session_id :
    (order.stripe_payment_intent_id?.startsWith("cs_") ? order.stripe_payment_intent_id : null);
  let amount: number | null;
  let currency: string | null;
  let secondVersion: boolean;

  if (intentId) {
    const intent = await stripe.paymentIntents.retrieve(intentId);
    amount = intent.amount;
    currency = intent.currency;
    secondVersion = intent.metadata.segunda_versao === undefined
      ? Boolean(order.segunda_versao)
      : intent.metadata.segunda_versao === "true";
  } else if (sessionId) {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    amount = session.amount_total;
    currency = session.currency;
    secondVersion = session.metadata?.segunda_versao === undefined
      ? Boolean(order.segunda_versao)
      : session.metadata.segunda_versao === "true";
  } else {
    if (order.stripe_checkout_url || order.stripe_session_id || order.stripe_payment_intent_id) {
      throw new Error("Não foi possível verificar o preço do pagamento existente no Stripe.");
    }
    return MUSIC_PRICE_CENTS;
  }

  const basePrice = amount === null ? null : amount - (secondVersion ? SECOND_VERSION_PRICE_CENTS : 0);
  if (currency !== "brl" || basePrice === null || !Number.isSafeInteger(basePrice) || basePrice <= 0) {
    throw new Error("O valor do pagamento existente no Stripe é inválido.");
  }
  return basePrice;
}
