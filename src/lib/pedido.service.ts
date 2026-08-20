import { DadosPedidoParaRoteiro, gerarRoteiroMusical } from "@/lib/motor-regras-musica";
import { gerarLetraDoPedido } from "@/lib/lyric.service";
import { gerarMusicaComSuno } from "@/integrations/suno/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { notifyPedidoTelegram } from "@/lib/telegram.service";

const hasSunoApiKey = Boolean(process.env.SUNO_API_KEY);
const SUNO_GENERATION_ENABLED = (process.env.ENABLE_SUNO_GENERATION ?? (hasSunoApiKey ? "true" : "false")).toLowerCase() === "true";

export type PedidoEntrada = {
  nome_cliente: string;
  email_cliente?: string | null;
  telefone_cliente?: string | null;
  cpf_cliente?: string | null;
  para_quem: string;
  ocasiao: string;
  descricao: string;
  genero_musical: string;
  tipo_cantor?: "feminino" | "masculino";
  duracao_segundos: number;
};

export async function criarPedido(data: PedidoEntrada) {
  const agora = new Date().toISOString();
  console.log("[criarPedido] Criando novo pedido para:", data.nome_cliente);
  
  const pedido = {
    nome_cliente: data.nome_cliente,
    email_cliente: data.email_cliente ?? null,
    telefone_cliente: data.telefone_cliente ?? null,
    cpf_cliente: data.cpf_cliente ?? null,
    descricao: data.descricao,
    genero_musical: data.genero_musical,
    duracao_segundos: data.duracao_segundos,
    whatsapp: data.telefone_cliente ?? null,
    para_quem: data.para_quem,
    ocasiao: data.ocasiao,
    tipo_cantor: data.tipo_cantor ?? "feminino",
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
    console.error("[criarPedido] Erro ao inserir pedido:", insertError?.message);
    throw new Error(`Falha ao criar pedido: ${insertError?.message ?? "dados inválidos"}`);
  }

  const pedidoId = inserted.id as string;
  console.log("[criarPedido] Pedido criado com ID:", pedidoId);

  await supabaseAdmin.from("status_history").insert({
    pedido_id: pedidoId,
    status_anterior: null,
    status_novo: "recebido",
    mensagem_whatsapp: "Pedido recebido automaticamente",
    criado_em: agora,
  });

  await notifyPedidoTelegram(
    {
      id: pedidoId,
      nome_cliente: inserted.nome_cliente,
      telefone_cliente: inserted.telefone_cliente,
      email_cliente: inserted.email_cliente,
      para_quem: inserted.para_quem,
      ocasiao: inserted.ocasiao,
      descricao: inserted.descricao,
      status: "recebido",
    },
    "Recebido",
    "Novo pedido criado no sistema.",
  );

  return inserted;
}

export async function atualizarDadosClientePedido(
  pedidoId: string,
  data: { email_cliente?: string | null; telefone_cliente?: string | null; cpf_cliente?: string | null },
) {
  const payload: Record<string, string | null> = {};

  if (data.email_cliente !== undefined) payload.email_cliente = data.email_cliente?.trim() || null;
  if (data.telefone_cliente !== undefined) payload.telefone_cliente = data.telefone_cliente?.trim() || null;
  if (data.cpf_cliente !== undefined) payload.cpf_cliente = data.cpf_cliente?.replace(/\D/g, "") || null;

  if (Object.keys(payload).length === 0) {
    return { ok: true };
  }

  if (payload.telefone_cliente !== undefined) {
    payload.whatsapp = payload.telefone_cliente;
  }

  const { error } = await supabaseAdmin.from("pedidos").update(payload as any).eq("id", pedidoId);

  if (error) {
    throw new Error(`Falha ao atualizar dados do cliente: ${error.message}`);
  }

  return { ok: true };
}

export async function gerarLetraPedido(pedidoId: string, data: PedidoEntrada) {
  const agora = new Date().toISOString();

  console.log("[gerarLetraPedido] Atualizando status para gerando_letra...", { pedidoId });
  await supabaseAdmin
    .from("pedidos")
    .update({ status: "gerando_letra", status_atualizado_em: agora })
    .eq("id", pedidoId);

  console.log("[gerarLetraPedido] Chamando gerarLetraDoPedido...");
  const { roteiro, letra } = await gerarLetraDoPedido(data);
  console.log("[gerarLetraPedido] Letra gerada com sucesso, atualizando pedido...");

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
    console.error("[gerarLetraPedido] Erro ao salvar letra:", error?.message);
    throw new Error(`Falha ao salvar letra do pedido: ${error?.message ?? "pedido não encontrado"}`);
  }

  console.log("[gerarLetraPedido] Pedido atualizado com sucesso");

  await supabaseAdmin.from("status_history").insert({
    pedido_id: pedido.id,
    status_anterior: "gerando_letra",
    status_novo: "aguardando_aprovacao_letra",
    mensagem_whatsapp: "Letra gerada e aguardando aprovação",
    criado_em: agora,
  });

  await notifyPedidoTelegram(
    {
      id: pedido.id,
      nome_cliente: pedido.nome_cliente,
      telefone_cliente: pedido.telefone_cliente,
      email_cliente: pedido.email_cliente,
      para_quem: pedido.para_quem,
      ocasiao: pedido.ocasiao,
      descricao: pedido.descricao,
      status: "aguardando_aprovacao_letra",
    },
    "Aguardando aprovação da letra",
    "A letra foi gerada e está pronta para aprovação do cliente.",
  );

  return pedido;
}

async function obterPedidoParaRoteiro(pedidoId: string) {
  const { data: pedido, error } = await supabaseAdmin
    .from("pedidos")
    .select(
      "id, nome_cliente, email_cliente, telefone_cliente, descricao, genero_musical, tipo_cantor, duracao_segundos, para_quem, ocasiao, letra_refazer_contador, letra_aprovada, letra_gerada, roteiro_ia, status, suno_task_id, preview_gerada_em, musica_gerada_em, url_previa, url_previa_segunda_versao, url_musica, url_musica_segunda_versao, segunda_versao"
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

  if (pedido.status === "pago" || pedido.status === "musica_pronta" || pedido.status === "entregue") {
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
    tipo_cantor: pedido.tipo_cantor ?? "feminino",
    duracao_segundos: pedido.duracao_segundos ?? 45,
    para_quem: pedido.para_quem,
    ocasiao: pedido.ocasiao ?? "",
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
  const agora = new Date().toISOString();
  const pedido = await obterPedidoParaRoteiro(pedidoId);

  if (pedido.status === "previa" && pedido.url_previa) {
    return pedido;
  }

  if (pedido.status === "gerando_musica" && pedido.suno_task_id) {
    return pedido;
  }

  if (!["letra_aprovada", "gerando_musica", "previa"].includes(pedido.status)) {
    throw new Error("A prévia só pode ser gerada após a aprovação da letra.");
  }

  if (!SUNO_GENERATION_ENABLED) {
    const { data: pedidoAtualizado, error } = await supabaseAdmin
      .from("pedidos")
      .update({
        status: "previa",
        status_atualizado_em: agora,
      })
      .eq("id", pedidoId)
      .select("*")
      .single();

    if (error || !pedidoAtualizado) {
      throw new Error(`Falha ao atualizar pedido sem geração Suno: ${error?.message ?? "pedido não encontrado"}`);
    }

    await supabaseAdmin.from("status_history").insert({
      pedido_id: pedidoId,
      status_anterior: pedido.status,
      status_novo: "previa",
      mensagem_whatsapp: "Prévia disponível (modo sem geração Suno).",
      criado_em: agora,
    });

    return pedidoAtualizado;
  }

  const letraFinal = pedido.letra_gerada?.trim();

  if (!letraFinal) {
    throw new Error("Não foi possível gerar a prévia porque a letra final não foi salva para este pedido.");
  }

  await supabaseAdmin
    .from("pedidos")
    .update({ status: "gerando_musica", status_atualizado_em: agora })
    .eq("id", pedidoId);

  const duracaoCompleta = Math.max(pedido.duracao_segundos ?? 90, 90);

  const { taskId } = await gerarMusicaComSuno(
    letraFinal,
    pedidoId,
    duracaoCompleta,
    pedido.genero_musical ?? "Pop brasileiro moderno",
    undefined,
    pedido.tipo_cantor ?? "feminino",
  );

  const { data: pedidoAtualizado, error } = await supabaseAdmin
    .from("pedidos")
    .update({
      suno_task_id: taskId,
      preview_gerada_em: agora,
      musica_gerada_em: agora,
      status: "gerando_musica",
      status_atualizado_em: agora,
      url_previa: null,
      url_previa_segunda_versao: null,
      url_musica: null,
      url_musica_segunda_versao: null,
      segunda_versao: false,
    })
    .eq("id", pedidoId)
    .select("*")
    .single();

  if (error || !pedidoAtualizado) {
    throw new Error(`Falha ao salvar geração de prévia do pedido: ${error?.message ?? "pedido não encontrado"}`);
  }

  await supabaseAdmin.from("status_history").insert({
    pedido_id: pedidoId,
    status_anterior: pedido.status,
    status_novo: "gerando_musica",
    mensagem_whatsapp: "Prévia em geração...",
    criado_em: agora,
  });

  await notifyPedidoTelegram(
    {
      id: pedidoId,
      nome_cliente: pedidoAtualizado.nome_cliente,
      telefone_cliente: pedidoAtualizado.telefone_cliente,
      email_cliente: pedidoAtualizado.email_cliente,
      para_quem: pedidoAtualizado.para_quem,
      ocasiao: pedidoAtualizado.ocasiao,
      descricao: pedidoAtualizado.descricao,
      status: "gerando_musica",
    },
    "Prévia em produção",
    "A letra foi aprovada e a geração da prévia da música foi iniciada.",
  );

  return pedidoAtualizado;
}

export async function gerarMusicaFinal(pedidoId: string) {
  if (!SUNO_GENERATION_ENABLED) {
    const agora = new Date().toISOString();
    const { data: pedidoAtualizado, error } = await supabaseAdmin
      .from("pedidos")
      .update({
        status: "musica_pronta",
        status_atualizado_em: agora,
      })
      .eq("id", pedidoId)
      .select("*")
      .single();

    if (error || !pedidoAtualizado) {
      throw new Error(`Falha ao liberar música final sem Suno: ${error?.message ?? "pedido não encontrado"}`);
    }

    return pedidoAtualizado;
  }

  const agora = new Date().toISOString();
  const pedido = await obterPedidoParaRoteiro(pedidoId);

  if (!["previa", "pagamento", "pago", "musica_pronta", "entregue"].includes(pedido.status)) {
    throw new Error("A música completa só pode ser liberada após a geração da prévia.");
  }

  if (!pedido.url_previa) {
    throw new Error("A prévia ainda não está disponível para liberar a música completa.");
  }

  const shouldReleaseSecondVersion = Boolean(pedido.segunda_versao && pedido.url_previa_segunda_versao);
  const nextStatus = pedido.status === "entregue" ? "entregue" : "musica_pronta";

  const { data: pedidoAtualizado, error } = await supabaseAdmin
    .from("pedidos")
    .update({
      url_musica: pedido.url_previa,
      url_musica_segunda_versao: shouldReleaseSecondVersion ? pedido.url_previa_segunda_versao ?? null : null,
      segunda_versao: shouldReleaseSecondVersion,
      status: nextStatus,
      musica_gerada_em: agora,
      status_atualizado_em: agora,
    })
    .eq("id", pedidoId)
    .select("*")
    .single();

  if (error || !pedidoAtualizado) {
    throw new Error(`Falha ao liberar música final do pedido: ${error?.message ?? "pedido não encontrado"}`);
  }

  if (pedido.status !== nextStatus) {
    await supabaseAdmin.from("status_history").insert({
      pedido_id: pedidoId,
      status_anterior: pedido.status,
      status_novo: nextStatus,
      mensagem_whatsapp: shouldReleaseSecondVersion
        ? "Pagamento confirmado e música completa liberada com duas versões."
        : "Pagamento confirmado e música completa liberada.",
      criado_em: agora,
    });
  }

  await notifyPedidoTelegram(
    {
      id: pedidoId,
      nome_cliente: pedidoAtualizado.nome_cliente,
      telefone_cliente: pedidoAtualizado.telefone_cliente,
      email_cliente: pedidoAtualizado.email_cliente,
      para_quem: pedidoAtualizado.para_quem,
      ocasiao: pedidoAtualizado.ocasao,
      descricao: pedidoAtualizado.descricao,
      status: nextStatus,
    },
    "Música liberada",
    shouldReleaseSecondVersion
      ? "Pagamento confirmado e as duas versões completas foram liberadas para o cliente."
      : "Pagamento confirmado e a versão completa foi liberada para o cliente.",
  );

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
      suno_task_id: null,
      preview_gerada_em: null,
      musica_gerada_em: null,
      url_previa: null,
      url_previa_segunda_versao: null,
      url_musica: null,
      url_musica_segunda_versao: null,
      segunda_versao: false,
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

  await notifyPedidoTelegram(
    {
      id: pedidoAtualizado.id,
      nome_cliente: pedidoAtualizado.nome_cliente,
      telefone_cliente: pedidoAtualizado.telefone_cliente,
      email_cliente: pedidoAtualizado.email_cliente,
      para_quem: pedidoAtualizado.para_quem,
      ocasiao: pedidoAtualizado.ocasiao,
      descricao: pedidoAtualizado.descricao,
      status: "letra_aprovada",
    },
    "Letra aprovada",
    "A letra foi aprovada e a geração da prévia foi iniciada.",
  );

  return pedidoAtualizado;
}
