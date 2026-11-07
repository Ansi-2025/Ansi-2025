import test from "node:test";
import assert from "node:assert/strict";
import { gerarLetraComFlatkey } from "./client.server.ts";

test("uses the chosen Flatkey model and accepts a server-side override", async () => {
  const originalKey = process.env.FLATKEY_API_KEY;
  const originalModel = process.env.FLATKEY_MODEL;
  const originalFetch = globalThis.fetch;
  const models: string[] = [];

  try {
    process.env.FLATKEY_API_KEY = "test-key";
    delete process.env.FLATKEY_MODEL;
    globalThis.fetch = async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { model: string };
      models.push(body.model);
      return Response.json({
        choices: [{ message: { content: "Uma canção especial" } }],
        usage: { total_tokens: 10 },
      });
    };

    assert.equal((await gerarLetraComFlatkey("História de teste")).letra, "Uma canção especial");
    process.env.FLATKEY_MODEL = "outro-modelo-disponivel";
    assert.equal((await gerarLetraComFlatkey("História de teste")).letra, "Uma canção especial");
    assert.deepEqual(models, ["gpt-6-luna-pro", "outro-modelo-disponivel"]);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.FLATKEY_API_KEY;
    else process.env.FLATKEY_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.FLATKEY_MODEL;
    else process.env.FLATKEY_MODEL = originalModel;
  }
});

test("reports a missing Flatkey API key without making a request", async () => {
  const originalKey = process.env.FLATKEY_API_KEY;
  try {
    delete process.env.FLATKEY_API_KEY;
    await assert.rejects(gerarLetraComFlatkey("História de teste"), /FLATKEY_API_KEY/);
  } finally {
    if (originalKey !== undefined) process.env.FLATKEY_API_KEY = originalKey;
  }
});

test("rejects an empty lyric returned by the provider", async () => {
  const originalKey = process.env.FLATKEY_API_KEY;
  const originalFetch = globalThis.fetch;
  try {
    process.env.FLATKEY_API_KEY = "test-key";
    globalThis.fetch = async () => Response.json({ choices: [] });
    await assert.rejects(gerarLetraComFlatkey("História de teste"), /não retornou uma letra/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.FLATKEY_API_KEY;
    else process.env.FLATKEY_API_KEY = originalKey;
  }
});
