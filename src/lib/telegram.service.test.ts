import test from "node:test";
import assert from "node:assert/strict";

import { buildLandingCtaTelegramMessage } from "./telegram.service.ts";

test("buildLandingCtaTelegramMessage includes the clicked button and source", () => {
  const message = buildLandingCtaTelegramMessage({
    buttonLabel: "Criar Minha Canção",
    source: "home_hero",
    url: "https://example.com/",
  });

  assert.match(message, /Criar Minha Canção/i);
  assert.match(message, /home_hero/i);
  assert.match(message, /https:\/\/example.com\//i);
});
