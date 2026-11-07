import { gerarLetraComFlatkey } from "../src/integrations/flatkey/client.server.ts";

if (!process.env.FLATKEY_API_KEY?.trim()) {
  console.error("Configure FLATKEY_API_KEY no terminal antes de executar o teste.");
  process.exitCode = 1;
} else {
  console.log(`Modelo: ${process.env.FLATKEY_MODEL?.trim() || "gpt-6-luna"}`);
  console.log("Enviando uma história fictícia para a Flatkey. A requisição pode gerar cobrança.");

  try {
    const result = await gerarLetraComFlatkey(
      "Crie uma letra curta sobre uma família fictícia celebrando um aniversário em casa.",
    );
    console.log("\nLetra recebida:\n");
    console.log(result.letra);
  } catch (error) {
    console.error("O teste falhou:", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
