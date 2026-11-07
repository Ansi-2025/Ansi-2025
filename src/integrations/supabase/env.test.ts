import test from "node:test";
import assert from "node:assert/strict";

import { resolveSupabaseServiceRoleKey } from "./env.ts";

test("service role uses only server-side environment variables", () => {
  const keys = [
    "SUPABASE_SERVICE_ROLE",
    "SUPABASE_SERVICE_ROLE_KEY",
    "VITE_SUPABASE_SERVICE_ROLE",
    "VITE_SUPABASE_SERVICE_ROLE_KEY",
  ] as const;
  const original = keys.map((key) => process.env[key]);

  try {
    for (const key of keys) delete process.env[key];
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY = "public-test-value";
    assert.equal(resolveSupabaseServiceRoleKey(), undefined);

    process.env.SUPABASE_SERVICE_ROLE_KEY = "server-test-value";
    assert.equal(resolveSupabaseServiceRoleKey(), "server-test-value");
    process.env.SUPABASE_SERVICE_ROLE = "preferred-server-test-value";
    assert.equal(resolveSupabaseServiceRoleKey(), "preferred-server-test-value");
  } finally {
    keys.forEach((key, index) => {
      const value = original[index];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  }
});
