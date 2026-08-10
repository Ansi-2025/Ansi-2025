import { gerarRoteiroMusical, DadosPedidoParaRoteiro } from "@/lib/motor-regras-musica";
import { gerarLetraComFlatkey } from "@/integrations/flatkey/client";

export async function gerarLetraDoPedido(pedido: DadosPedidoParaRoteiro) {
  const roteiro = gerarRoteiroMusical(pedido);

  const prompt = `
Nome do cliente: ${pedido.nomeCliente}

Pessoa homenageada: ${pedido.pessoaHomenageada}

Relacionamento: ${pedido.relacionamento}

Ocasião: ${pedido.ocasiao}

Estilo musical: ${pedido.estiloMusical}

História:
${pedido.historia}

Crie uma letra personalizada seguindo todas as regras.
  `;

  const result = await gerarLetraComFlatkey(prompt);
  return { roteiro, letra: result.letra, uso: result.uso };
}
