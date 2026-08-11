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

Crie uma letra personalizada, emocional, memorável e com boa estrutura, seguindo todas as regras.
  `;

  const result = await gerarLetraComFlatkey(prompt);
  return { roteiro, letra: result.letra, uso: result.uso };
}
