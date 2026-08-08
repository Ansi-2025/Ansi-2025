import { DadosPedidoParaRoteiro, gerarRoteiroMusical } from "@/lib/motor-regras-musica";
import { gerarLetraDoPedido } from "@/lib/lyric.service";
import { gerarMusicaComSuno } from "@/integrations/suno/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PedidoEntrada = DadosPedidoParaRoteiro;

export async function criarPedido(data: PedidoEntrada) {
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

  return inserted;
}

export async function gerarLetraPedido(pedidoId: string, data: PedidoEntrada) {
  const agora = new Date().toISOString();

  await supabaseAdmin
    .from("pedidos")
    .update({ status: "gerando_letra", status_atualizado_em: agora })
    .eq("id", pedidoId);

  const { roteiro, letra } = await gerarLetraDoPedido(data);

  const { data: pedido, error } = await supabaseAdmin
    .from("pedidos")
    .update({
      roteiro_ia: roteiro,
      letra_gerada: letra,
      status: "aguardando_aprovacao_letra",
      status_atualizado_em: new Date().toISOString(),
    })
    .eq("id", pedidoId)
    .select("*")
    .single();

  if (error || !pedido) {
    throw new Error(`Falha ao salvar letra do pedido: ${error?.message ?? "pedido não encontrado"}`);
  }

  await supabaseAdmin.from("status_history").insert({
    pedido_id: pedido.id,
    status_anterior: "gerando_letra",
    status_novo: "aguardando_aprovacao_letra",
    mensagem_whatsapp: "Letra gerada e aguardando aprovação",
    criado_em: agora,
  });

  return pedido;
}

export async function gerarMusicaPreview(pedidoId: string) {
  const agora = new Date().toISOString();

  const { data: pedido, error: pedidoError } = await supabaseAdmin
    .from("pedidos")
    .select(
      "id, nome_cliente, email_cliente, telefone_cliente, descricao, genero_musical, duracao_segundos, roteiro_ia, status",
    )
    .eq("id", pedidoId)
    .maybeSingle();

  if (pedidoError) {
    throw new Error(`Falha ao buscar pedido: ${pedidoError.message}`);
  }

  if (!pedido) {
    throw new Error("Pedido não encontrado.");
  }

  if (pedido.status !== "letra_aprovada") {
    throw new Error("A prévia só pode ser gerada após a letra ser aprovada.");
  }

  const roteiro = pedido.roteiro_ia || gerarRoteiroMusical({
    nome_cliente: pedido.nome_cliente ?? "Cliente",
    email_cliente: pedido.email_cliente ?? "",
    telefone_cliente: pedido.telefone_cliente ?? "",
    descricao: pedido.descricao,
    genero_musical: pedido.genero_musical ?? "Gospel",
    duracao_segundos: pedido.duracao_segundos ?? 45,
  });

  await supabaseAdmin
    .from("pedidos")
    .update({ status: "gerando_musica", status_atualizado_em: agora })
    .eq("id", pedidoId);

  const { url_musica, url_previa, suno_job_id } = await gerarMusicaComSuno(roteiro, pedidoId);

  const { data: pedidoAtualizado, error } = await supabaseAdmin
    .from("pedidos")
    .update({
      url_previa: url_previa,
      url_musica: url_musica,
      suno_job_id: suno_job_id,
      preview_gerada_em: agora,
      musica_gerada_em: agora,
      status: "previa",
      status_atualizado_em: agora,
    })
    .eq("id", pedidoId)
    .select("*")
    .single();

  if (error || !pedidoAtualizado) {
    throw new Error(`Falha ao salvar prévia do pedido: ${error?.message ?? "pedido não encontrado"}`);
  }

  await supabaseAdmin.from("status_history").insert({
    pedido_id: pedidoId,
    status_anterior: "gerando_musica",
    status_novo: "previa",
    mensagem_whatsapp: "Prévia gerada e aguardando pagamento",
    criado_em: agora,
  });

  return pedidoAtualizado;
}

export async function marcarLetraAprovada(pedidoId: string) {
  const agora = new Date().toISOString();

  const { data: pedido, error } = await supabaseAdmin
    .from("pedidos")
    .update({
      letra_aprovada: true,
      status: "letra_aprovada",
      status_atualizado_em: agora,
    })
    .eq("id", pedidoId)
    .select("*")
    .single();

  if (error || !pedido) {
    throw new Error(`Falha ao aprovar letra: ${error?.message ?? "pedido não encontrado"}`);
  }

  await supabaseAdmin.from("status_history").insert({
    pedido_id: pedido.id,
    status_anterior: "letra_pronta",
    status_novo: "letra_aprovada",
    mensagem_whatsapp: "Letra aprovada pelo cliente",
    criado_em: agora,
  });

  return pedido;
}
