import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { generateOrderAccessToken, validateOrderAccess } from "./order-access.server.ts";

test("order access requires the matching signed token", () => {
  const previous = process.env.ORDER_ACCESS_SECRET;
  process.env.ORDER_ACCESS_SECRET = "test-order-access-secret";
  try {
    const id = "e1462b7b-5739-4620-865d-c22fd502696d";
    const token = generateOrderAccessToken(id);
    assert.equal(token, createHmac("sha256", "test-order-access-secret").update(id).digest("hex"));
    assert.doesNotThrow(() => validateOrderAccess(id, token));
    assert.throws(() => validateOrderAccess(id), /token/i);
    assert.throws(() => validateOrderAccess(id, "é".repeat(64)), /token/i);
    assert.throws(() => validateOrderAccess(id, "0".repeat(64)), /token/i);
    assert.throws(() => validateOrderAccess("another-order", token), /token/i);
  } finally {
    if (previous === undefined) delete process.env.ORDER_ACCESS_SECRET;
    else process.env.ORDER_ACCESS_SECRET = previous;
  }
});

test("production refuses the public development secret when no server secret exists", () => {
  const keys = ["NODE_ENV", "ORDER_ACCESS_SECRET", "APP_SECRET", "SUPABASE_SERVICE_ROLE", "SUPABASE_SERVICE_ROLE_KEY", "STRIPE_SECRET_KEY"] as const;
  const original = keys.map((key) => process.env[key]);
  try {
    for (const key of keys) delete process.env[key];
    process.env.NODE_ENV = "production";
    assert.throws(() => generateOrderAccessToken("order"), /ORDER_ACCESS_SECRET/);
  } finally {
    keys.forEach((key, index) => {
      const value = original[index];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  }
});
