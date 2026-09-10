import test from "node:test";
import assert from "node:assert/strict";

import { buildLandingCtaTelegramMessage, buildPedidoTelegramMessage } from "./telegram.service.ts";

test("buildLandingCtaTelegramMessage includes the clicked button and source", () => {
  const message = buildLandingCtaTelegramMessage({
    buttonLabel: "Criar Minha Canção",
    source: "home_hero",
    url: "https://example.com/",
  });

  assert.match(message, /CLIQUE NO BOTÃO/i);
  assert.match(message, /Evento: Criar Minha Canção/i);
  assert.match(message, /home_hero/i);
  assert.match(message, /https:\/\/example.com\//i);
});

test("buildLandingCtaTelegramMessage includes a page visit when the visitor lands on the site", () => {
  const message = buildLandingCtaTelegramMessage({
    buttonLabel: "Acesso ao site",
    source: "page_visit",
    url: "https://example.com/",
  });

  assert.match(message, /VISITA AO SITE/i);
  assert.match(message, /Evento: Acesso ao site/i);
  assert.match(message, /page_visit/i);
  assert.match(message, /https:\/\/example.com\//i);
});

test("buildPedidoTelegramMessage includes how the client found us", () => {
  const message = buildPedidoTelegramMessage(
    {
      id: "123",
      nome_cliente: "João",
      como_conheceu: "alguem",
      nome_conheceu: "Maria",
    },
    "Pedido recebido",
  );

  assert.match(message, /Como conheceu: Alguém/i);
  assert.match(message, /Nome da pessoa: Maria/i);
});
