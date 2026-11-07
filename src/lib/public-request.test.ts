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

test("assertPublicRequest rejects a forged localhost origin for a production host", () => {
  const request = new Request("https://app.example.com/", {
    method: "POST",
    headers: {
      origin: "http://localhost:5173",
      host: "app.example.com",
    },
  });

  assert.throws(() => assertPublicRequest(request, { scope: "landing_cta" }), /origem/i);
});

test("assertPublicRequest rejects a hostname containing localhost", () => {
  const request = new Request("https://app.example.com/", {
    method: "POST",
    headers: {
      origin: "https://localhost.evil.example",
      host: "app.example.com",
    },
  });

  assert.throws(() => assertPublicRequest(request, { scope: "landing_cta" }), /origem/i);
});

test("assertPublicRequest accepts a same-host production request", () => {
  const request = new Request("https://app.example.com/", {
    method: "POST",
    headers: {
      origin: "https://app.example.com",
      host: "app.example.com",
      "x-forwarded-for": "192.0.2.10",
    },
  });

  assert.doesNotThrow(() => assertPublicRequest(request, { scope: "order_submission" }));
});

test("assertPublicRequest enforces the order limit for a client", () => {
  const request = new Request("https://app.example.com/", {
    method: "POST",
    headers: {
      origin: "https://app.example.com",
      host: "app.example.com",
      "x-forwarded-for": "192.0.2.11",
    },
  });

  for (let i = 0; i < 5; i++) {
    assert.doesNotThrow(() => assertPublicRequest(request, { scope: "order_submission" }));
  }
  assert.throws(() => assertPublicRequest(request, { scope: "order_submission" }), /muitas requisições/i);
});
