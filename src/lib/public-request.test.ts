import test from "node:test";
import assert from "node:assert/strict";

import { assertPublicRequest } from "./public-request.ts";

test("assertPublicRequest rejects unexpected origins", () => {
  const request = new Request("https://app.example.com/", {
    method: "POST",
    headers: {
      origin: "https://evil.example.com",
      host: "app.example.com",
    },
  });

  assert.throws(() => {
    assertPublicRequest(request, { scope: "landing_cta" });
  }, /origem/i);
});

test("assertPublicRequest allows local development origin", () => {
  const request = new Request("http://localhost:5173/", {
    method: "POST",
    headers: {
      origin: "http://localhost:5173",
      host: "localhost:5173",
    },
  });

  assert.doesNotThrow(() => {
    assertPublicRequest(request, { scope: "landing_cta" });
  });
});
