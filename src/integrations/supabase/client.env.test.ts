import test from "node:test";
import assert from "node:assert/strict";

import { supabase } from "./client.ts";

test("supabase client should not crash when env vars are missing", async () => {
  assert.equal(typeof supabase.auth.getSession, "function");

  await assert.rejects(
    async () => supabase.auth.getSession(),
    /Missing Supabase environment variable\(s\)|Configure Supabase variables/i,
  );
});
