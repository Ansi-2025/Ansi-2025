import { gerarRoteiroMusical, DadosPedidoParaRoteiro } from "@/lib/motor-regras-musica";
import { gerarLetraComGemini } from "@/integrations/gemini/client";

export async function gerarLetraDoPedido(pedido: DadosPedidoParaRoteiro) {
  const roteiro = gerarRoteiroMusical(pedido);

  const prompt = `Você é um compositor de letras para músicas gospel personalizadas. Produza uma letra emotiva, inspiradora e estruturada, com versos, refrão e ponte, respeitando o contexto abaixo:

${roteiro}

Regras:
- Escreva em português.
- Use linguagem acolhedora e espiritual.
- Inclua imagens de fé, oração, família, vitória ou gratidão quando fizer sentido.
- O texto deve ser adequado para uma música de aproximadamente ${pedido.duracao_segundos} segundos.
- A letra deve ser coesa, com começo, meio e fim.

Agora escreva a letra completa.`;

  const letra = await gerarLetraComGemini(prompt);
  return { roteiro, letra };
}
