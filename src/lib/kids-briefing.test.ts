import test from "node:test";
import assert from "node:assert/strict";

import { buildKidsBriefing, buildKidsOrderData } from "./kids-briefing.ts";

test("buildKidsBriefing inclui dados da criança, objetivos e interações", () => {
  const briefing = buildKidsBriefing({
    childName: "Laura",
    ageGroup: "3–4 anos",
    objectives: ["Animais", "Cores"],
    interactions: ["Bater palmas", "Repetir palavras"],
    favoriteAnimal: "Cachorro",
    childStory: "Ela está aprendendo os nomes dos animais e ama cachorro.",
    focusWord: "Cachorro",
  });

  assert.match(briefing, /Laura/i);
  assert.match(briefing, /3–4 anos/i);
  assert.match(briefing, /Animais/i);
  assert.match(briefing, /Cores/i);
  assert.match(briefing, /Bater palmas/i);
  assert.match(briefing, /Cachorro/i);
});

test("buildKidsOrderData reaproveita o mesmo fluxo de pedido atual", () => {
  const payload = buildKidsOrderData({
    childName: "Laura",
    ageGroup: "3–4 anos",
    objectives: ["Animais", "Cores"],
    interactions: ["Bater palmas", "Repetir palavras"],
    focusWord: "Cachorro",
    favoriteAnimal: "Cachorro",
    childStory: "Ela está aprendendo os nomes dos animais e ama cachorro.",
  }, {
    phone: "(11) 99999-8888",
    email: "laura@example.com",
  });

  assert.equal(payload.nome_cliente, "Laura");
  assert.equal(payload.para_quem, "Laura");
  assert.equal(payload.genero_musical, "Infantil");
  assert.equal("como_conheceu" in payload, false);
  assert.equal("nome_conheceu" in payload, false);
  assert.match(payload.ocasiao, /aprendizado|brincadeira/i);
  assert.match(payload.descricao, /Laura/i);
  assert.match(payload.descricao, /Animais/i);
  assert.match(payload.descricao, /Cachorro/i);
});
