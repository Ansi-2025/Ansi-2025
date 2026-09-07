import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAffiliateSaleTelegramMessage,
  buildAffiliateUrl,
  normalizeAffiliateCode,
} from "./affiliate.service.ts";

test("normalizeAffiliateCode normalizes and truncates referral codes", () => {
  assert.equal(normalizeAffiliateCode("  joao-123  "), "JOAO-123");
  assert.equal(normalizeAffiliateCode("joao_456"), "JOAO-456");
  assert.equal(normalizeAffiliateCode("muyyyyyyyyyyyyyyyyyyyyyyyyyyy"), "MUYYYYYYYYYYYYYYYYYYYYYYYYYY");
});

test("buildAffiliateSaleTelegramMessage includes affiliate info and amount", () => {
  const message = buildAffiliateSaleTelegramMessage({
    affiliateCode: "JOAO123",
    orderId: "2d2f8d5c-5dd1-4d36-9b5d-b2c4de2e4a4d",
    customerName: "Maria",
    amount: 49,
    commission: 14.7,
  });

  assert.match(message, /JOAO123/i);
  assert.match(message, /Maria/i);
  assert.match(message, /Pedido: 2d2f8d5c-5dd1-4d36-9b5d-b2c4de2e4a4d/i);
  assert.match(message, /R\$\s*14,70|R\$\s*14.70/i);
});

test("buildAffiliateUrl preserves the referral parameter and normalizes the code", () => {
  const link = buildAffiliateUrl("https://exemplo.com/", "  joao-123  ");

  assert.equal(new URL(link).searchParams.get("ref"), "JOAO-123");
  assert.match(link, /https:\/\/exemplo\.com\/?\?ref=JOAO-123/i);
});
