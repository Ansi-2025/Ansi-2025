import { gerarRoteiroMusical, DadosPedidoParaRoteiro } from "@/lib/motor-regras-musica";
import { gerarMusicaComSuno } from "@/integrations/suno/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PedidoEntrada = DadosPedidoParaRoteiro;

export type PedidoFinalizado = {
  id: string;
  url_musica: string | null;
  url_previa: string | null;
  status: string;
};

export async function criarPedidoAutomatizado(data: PedidoEntrada): Promise<PedidoFinalizado> {
  const agora = new Date().toISOString();
  const pedido = {
    nome_cliente: data.nome_cliente,
    nome_completo: data.nome_cliente,
    email_cliente: data.email_cliente,
    telefone_cliente: data.telefone_cliente,
    descricao: data.descricao,
    genero_musical: data.genero_musical,
    tipo_musica: data.genero_musical,
    duracao_segundos: data.duracao_segundos,
    whatsapp: data.telefone_cliente,
    para_quem: data.nome_cliente,
    status: "recebido",
    created_at: agora,
    status_atualizado_em: agora,
  };

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("pedidos")
    .insert(pedido as any)
    .select("*")
    .single();

  if (insertError || !inserted) {
    throw new Error(`Falha ao criar pedido: ${insertError?.message ?? "dados inválidos"}`);
  }

  const pedidoId = inserted.id as string;

  await supabaseAdmin.from("status_history").insert({
    pedido_id: pedidoId,
    status_anterior: null,
    status_novo: "recebido",
    mensagem_whatsapp: "Pedido recebido automaticamente",
    criado_em: agora,
  });

  const roteiro = gerarRoteiroMusical(data);

  await supabaseAdmin.from("pedidos").update({
    roteiro_ia: roteiro,
    status: "criando_sua_musica",
    status_atualizado_em: new Date().toISOString(),
  }).eq("id", pedidoId);

  await supabaseAdmin.from("status_history").insert({
    pedido_id: pedidoId,
    status_anterior: "recebido",
    status_novo: "criando_sua_musica",
    mensagem_whatsapp: "Roteiro de IA criado e enviado para geração de música",
    criado_em: new Date().toISOString(),
  });

  const resultadoSuno = await gerarMusicaComSuno(roteiro, pedidoId);

  const updateData: Record<string, unknown> = {
    status: "musica_criada",
    url_musica: resultadoSuno.url_musica,
    atualizado_em: new Date().toISOString(),
    suno_job_id: resultadoSuno.suno_job_id,
  };

  if (resultadoSuno.url_previa) {
    updateData.url_previa = resultadoSuno.url_previa;
  }

  const { data: finalPedido, error: updateError } = await supabaseAdmin
    .from("pedidos")
    .update(updateData)
    .eq("id", pedidoId)
    .select("*")
    .single();

  if (updateError || !finalPedido) {
    throw new Error(`Falha ao atualizar pedido com a música: ${updateError?.message ?? "dados inválidos"}`);
  }

  await supabaseAdmin.from("status_history").insert({
    pedido_id: pedidoId,
    status_anterior: "criando_sua_musica",
    status_novo: "musica_criada",
    mensagem_whatsapp: "Música criada automaticamente e salva no pedido",
    criado_em: new Date().toISOString(),
  });

  return {
    id: pedidoId,
    status: "musica_criada",
    url_musica: finalPedido.url_musica as string | null,
    url_previa: (finalPedido.url_previa as string) ?? null,
  };
}
