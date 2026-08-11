import { DadosPedidoParaRoteiro, gerarRoteiroMusical } from "@/lib/motor-regras-musica";
import { gerarLetraDoPedido } from "@/lib/lyric.service";
import { gerarMusicaComSuno } from "@/integrations/suno/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SUNO_GENERATION_ENABLED = (process.env.ENABLE_SUNO_GENERATION ?? "false").toLowerCase() === "true";

export type PedidoEntrada = {
  nome_cliente: string;
  email_cliente?: string | null;
  telefone_cliente?: string | null;
  para_quem: string;
  ocasiao: string;
  descricao: string;
  genero_musical: string;
  duracao_segundos: number;
};

export async function criarPedido(data: PedidoEntrada) {
  const agora = new Date().toISOString();
  const pedido = {
    nome_cliente: data.nome_cliente,
    email_cliente: data.email_cliente ?? null,
    telefone_cliente: data.telefone_cliente ?? null,
    descricao: data.descricao,
    genero_musical: data.genero_musical,
    duracao_segundos: data.duracao_segundos,
    whatsapp: data.telefone_cliente ?? null,
    para_quem: data.para_quem,
    ocasiao: data.ocasiao,
    letra_refazer_contador: 0,
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
      letra_aprovada: false,
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

async function obterPedidoParaRoteiro(pedidoId: string) {
  const { data: pedido, error } = await supabaseAdmin
    .from("pedidos")
    .select(
      "id, nome_cliente, email_cliente, telefone_cliente, descricao, genero_musical, duracao_segundos, para_quem, ocasiao, letra_refazer_contador, letra_aprovada, roteiro_ia, status"
    )
    .eq("id", pedidoId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar pedido: ${error.message}`);
  }

  if (!pedido) {
    throw new Error("Pedido não encontrado.");
  }

  return pedido;
}

export async function refazerLetraPedido(pedidoId: string, feedback?: string) {
  const agora = new Date().toISOString();
  const pedido = await obterPedidoParaRoteiro(pedidoId);
  const feedbackFormatado = (feedback ?? "").trim();

  if (pedido.letra_refazer_contador >= 4) {
    throw new Error("Você já usou todas as 4 revisões de letra.");
  }

  if (pedido.status === "pago" || pedido.status === "entregue") {
    throw new Error("Não é possível refazer a letra após a finalização do pedido.");
  }

  await supabaseAdmin
    .from("pedidos")
    .update({ status: "gerando_letra", status_atualizado_em: agora })
    .eq("id", pedidoId);

  const pedidoData: PedidoEntrada = {
    nome_cliente: pedido.nome_cliente ?? "Cliente",
    email_cliente: pedido.email_cliente ?? "",
    telefone_cliente: pedido.telefone_cliente ?? "",
    descricao: pedido.descricao,
    genero_musical: pedido.genero_musical ?? "Gospel",
    duracao_segundos: pedido.duracao_segundos ?? 45,
    para_quem: pedido.para_quem,
    ocasiao: pedido.ocasiao,
  };

  const { roteiro, letra } = await gerarLetraDoPedido(pedidoData);

  const { data: pedidoAtualizado, error } = await supabaseAdmin
    .from("pedidos")
    .update({
      roteiro_ia: roteiro,
      letra_gerada: letra,
      letra_aprovada: false,
      letra_refazer_contador: (pedido.letra_refazer_contador ?? 0) + 1,
      status: "aguardando_aprovacao_letra",
      status_atualizado_em: new Date().toISOString(),
    })
    .eq("id", pedidoId)
    .select("*")
    .single();

  if (error || !pedidoAtualizado) {
    throw new Error(`Falha ao salvar revisão da letra: ${error?.message ?? "pedido não encontrado"}`);
  }

  const mensagem = feedbackFormatado
    ? `Revisão ${pedidoAtualizado.letra_refazer_contador} solicitada e aguardando aprovação. Ajustes solicitados: ${feedbackFormatado}`
    : `Revisão ${pedidoAtualizado.letra_refazer_contador} solicitada e aguardando aprovação`;

  await supabaseAdmin.from("status_history").insert({
    pedido_id: pedidoId,
    status_anterior: "gerando_letra",
    status_novo: "aguardando_aprovacao_letra",
    mensagem_whatsapp: mensagem,
    criado_em: agora,
  });

  return pedidoAtualizado;
}

export async function gerarMusicaPreview(pedidoId: string) {
  if (!SUNO_GENERATION_ENABLED) {
    throw new Error("Geração de música desativada no momento. Habilite ENABLE_SUNO_GENERATION para ativar a API do Suno.");
  }

  const agora = new Date().toISOString();
  const pedido = await obterPedidoParaRoteiro(pedidoId);

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
    para_quem: pedido.para_quem,
    ocasiao: pedido.ocasiao,
  });

  await supabaseAdmin
    .from("pedidos")
    .update({ status: "gerando_musica", status_atualizado_em: agora })
    .eq("id", pedidoId);

  const { url_previa, suno_job_id } = await gerarMusicaComSuno(roteiro, pedidoId, 45);

  const { data: pedidoAtualizado, error } = await supabaseAdmin
    .from("pedidos")
    .update({
      roteiro_ia: roteiro,
      url_previa,
      suno_job_id,
      preview_gerada_em: agora,
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

export async function gerarMusicaFinal(pedidoId: string) {
  if (!SUNO_GENERATION_ENABLED) {
    return await supabaseAdmin
      .from("pedidos")
      .update({
        status: "pagamento",
        status_atualizado_em: new Date().toISOString(),
      })
      .eq("id", pedidoId)
      .select("*")
      .single();
  }

  const agora = new Date().toISOString();
  const pedido = await obterPedidoParaRoteiro(pedidoId);

  if (!["previa", "pagamento"].includes(pedido.status)) {
    throw new Error("A música final só pode ser gerada após a prévia ou a confirmação de pagamento.");
  }

  const roteiro = pedido.roteiro_ia || gerarRoteiroMusical({
    nome_cliente: pedido.nome_cliente ?? "Cliente",
    email_cliente: pedido.email_cliente ?? "",
    telefone_cliente: pedido.telefone_cliente ?? "",
    descricao: pedido.descricao,
    genero_musical: pedido.genero_musical ?? "Gospel",
    duracao_segundos: pedido.duracao_segundos ?? 45,
    para_quem: pedido.para_quem,
    ocasiao: pedido.ocasiao,
  });

  await supabaseAdmin
    .from("pedidos")
    .update({ status: "gerando_musica", status_atualizado_em: agora })
    .eq("id", pedidoId);

  const { url_musica, suno_job_id } = await gerarMusicaComSuno(roteiro, pedidoId, pedido.duracao_segundos ?? 90);

  const { data: pedidoAtualizado, error } = await supabaseAdmin
    .from("pedidos")
    .update({
      url_musica,
      suno_job_id,
      musica_gerada_em: agora,
      status: "pago",
      status_atualizado_em: agora,
    })
    .eq("id", pedidoId)
    .select("*")
    .single();

  if (error || !pedidoAtualizado) {
    throw new Error(`Falha ao salvar música final do pedido: ${error?.message ?? "pedido não encontrado"}`);
  }

  await supabaseAdmin.from("status_history").insert({
    pedido_id: pedidoId,
    status_anterior: "pagamento",
    status_novo: "pago",
    mensagem_whatsapp: "Pagamento confirmado e música final gerada",
    criado_em: agora,
  });

  return pedidoAtualizado;
}

export async function marcarLetraAprovada(pedidoId: string) {
  const agora = new Date().toISOString();
  const pedido = await obterPedidoParaRoteiro(pedidoId);
  const validStatuses = ["aguardando_aprovacao_letra", "letra_pronta", "pronto"];

  if (!validStatuses.includes(pedido.status)) {
    throw new Error(
      `A letra só pode ser aprovada quando estiver aguardando aprovação. Status atual: ${pedido.status}. ` +
        `Se este pedido for antigo, revise o status no banco ou contate o administrador.`,
    );
  }

  const { data: pedidoAtualizado, error } = await supabaseAdmin
    .from("pedidos")
    .update({
      letra_aprovada: true,
      status: "letra_aprovada",
      status_atualizado_em: agora,
    })
    .eq("id", pedidoId)
    .select("*")
    .single();

  if (error || !pedidoAtualizado) {
    throw new Error(`Falha ao aprovar letra: ${error?.message ?? "pedido não encontrado"}`);
  }

  await supabaseAdmin.from("status_history").insert({
    pedido_id: pedidoAtualizado.id,
    status_anterior: "aguardando_aprovacao_letra",
    status_novo: "letra_aprovada",
    mensagem_whatsapp: "Letra aprovada pelo cliente",
    criado_em: agora,
  });

  return pedidoAtualizado;
}
