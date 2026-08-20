import { gerarRoteiroMusical, DadosPedidoParaRoteiro } from "@/lib/motor-regras-musica";
import { gerarLetraComFlatkey } from "@/integrations/flatkey/client.server";

export async function gerarLetraDoPedido(pedido: DadosPedidoParaRoteiro) {
  const roteiro = gerarRoteiroMusical(pedido);
  const tipoCantor = pedido.tipo_cantor === "masculino" ? "voz masculina" : "voz feminina";

  const prompt = `
Você é um compositor profissional de música emocional e moderna.

Contexto do pedido:
- Nome do cliente: ${pedido.nome_cliente}
- Destinatário: ${pedido.para_quem}
- Ocasião: ${pedido.ocasiao}
- Estilo musical: ${pedido.genero_musical}
- Voz preferida: ${tipoCantor}
- Sensação principal: ${pedido.descricao}

Diretiva do roteiro para a letra:
${roteiro}

Crie uma letra final, pronta para ser usada como prompt de música gerada por Suno em customMode true.

Regras obrigatórias:
- Escreva somente a letra final, sem explicações, sem comentários técnicos, sem texto fora da letra.
- Estruture em blocos como [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Bridge], [Final Chorus], [Outro].
- A letra deve soar natural para uma ${tipoCantor}, com emoção, cadência e fraseado adequados à sonoridade escolhida.
- A letra deve ser emocional, memorável, com boa cadência, fácil de cantar e com refrão forte.
- Use o nome do cliente e da pessoa destinatária de forma natural dentro da própria letra.
- A linguagem pode ser poética, mas clara e funcional para música.
- Referências a artistas, cantores, bandas ou nomes de pessoas famosas podem ser usadas como inspiração de estilo no roteiro, mas o texto final da letra e o prompt enviado à Suno não devem conter esses nomes nem frases tipo “inspirado em”, “referência a”, “igual ao estilo de”.
- A letra deve ser pronta para a Suno cantar exatamente essa letra com arranjo e batida, sem menções a artistas ou referências explícitas.
  `;

  const result = await gerarLetraComFlatkey(prompt);
  return { roteiro, letra: result.letra, uso: result.uso };
}
