import { gerarRoteiroMusical, DadosPedidoParaRoteiro } from "@/lib/motor-regras-musica";
import { gerarLetraComFlatkey } from "@/integrations/flatkey/client.server";

export async function gerarLetraDoPedido(pedido: DadosPedidoParaRoteiro) {
  const roteiro = gerarRoteiroMusical(pedido);

  const prompt = `
Nome do cliente: ${pedido.nome_cliente}
Para quem é a música: ${pedido.para_quem}
Ocasião: ${pedido.ocasiao}
Estilo musical: ${pedido.genero_musical}

História:
${pedido.descricao}

Crie uma letra em formato pronto para música gospel, com estrutura profissional e pronta para uso em geração musical.

Regras obrigatórias:
- Use sempre divisões em blocos como [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Bridge], [Final Chorus], [Outro].
- A letra deve ser emocional, memorável, com boa cadência e fácil de cantar.
- Sempre inclua o nome do cliente e o nome do destinatário de forma natural na letra, sem parecer que está explicando o contexto.
- Não inclua comentários, explicações, texto fora da letra, nem instruções técnicas.
- Escreva só a letra final, organizada em blocos e pronta para Suno.
  `;

  const result = await gerarLetraComFlatkey(prompt);
  return { roteiro, letra: result.letra, uso: result.uso };
}
