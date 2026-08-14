import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

async function validateAdminAccess(accessToken?: string) {
  if (!accessToken) {
    throw new Error("Sessão de administrador inválida.");
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Configuração de Supabase indisponível para validação do admin.");
  }

  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) {
    throw new Error("Sessão inválida ou expirada.");
  }

  const allowedEmails = ADMIN_EMAILS.length > 0 ? ADMIN_EMAILS : [String(process.env.ADMIN_EMAIL ?? "").trim().toLowerCase()].filter(Boolean);

  if (allowedEmails.length === 0) {
    throw new Error("Nenhum e-mail de administrador configurado. Defina ADMIN_EMAIL ou ADMIN_EMAILS.");
  }

  const normalizedUserEmail = user.email?.trim().toLowerCase() ?? "";
  if (!allowedEmails.includes(normalizedUserEmail)) {
    throw new Error("Usuário não autorizado para acessar o painel admin.");
  }

  return user;
}

export const adminCheckAccess = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        accessToken: z.string().min(10),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const user = await validateAdminAccess(data.accessToken);
    return {
      id: user.id,
      email: user.email,
      role: user.role ?? null,
    };
  });

export const adminListOrders = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        accessToken: z.string().min(10),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await validateAdminAccess(data.accessToken);

    const { data: rows, error } = await supabaseAdmin
      .from("pedidos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return rows ?? [];
  });

async function confirmPagamentoPedido(pedidoId: string, accessToken: string) {
  const adminUser = await validateAdminAccess(accessToken);
  const agora = new Date().toISOString();

  const { data: pedidoAtual, error: fetchError } = await supabaseAdmin
    .from("pedidos")
    .select("status")
    .eq("id", pedidoId)
    .single();

  if (fetchError || !pedidoAtual) {
    throw new Error(fetchError?.message ?? "Pedido não encontrado.");
  }

  if (!["letra_aprovada", "pagamento"].includes(pedidoAtual.status)) {
    throw new Error("O pedido precisa estar com a letra aprovada ou aguardando pagamento para confirmar o pagamento.");
  }

  const { data: pedido, error } = await supabaseAdmin
    .from("pedidos")
    .update({
      status: "pago",
      pago_em: agora,
      stripe_payment_status: "paid",
      status_atualizado_em: agora,
    })
    .eq("id", pedidoId)
    .select("*")
    .single();

  if (error || !pedido) {
    throw new Error(error?.message ?? "Pedido não encontrado.");
  }

  await supabaseAdmin.from("status_history").insert({
    pedido_id: pedido.id,
    status_anterior: pedidoAtual.status ?? "letra_aprovada",
    status_novo: "pago",
    admin_user: adminUser.email ?? "admin",
    mensagem_whatsapp: "Pagamento confirmado manualmente pelo painel administrativo.",
    criado_em: agora,
  });

  return pedido;
}

async function releaseMusicPedido(pedidoId: string, accessToken: string) {
  const adminUser = await validateAdminAccess(accessToken);
  const agora = new Date().toISOString();

  const { data: pedidoAtual, error: fetchError } = await supabaseAdmin
    .from("pedidos")
    .select("status")
    .eq("id", pedidoId)
    .single();

  if (fetchError || !pedidoAtual) {
    throw new Error(fetchError?.message ?? "Pedido não encontrado.");
  }

  if (pedidoAtual.status !== "pago") {
    throw new Error("O pedido precisa estar pago antes de liberar a música.");
  }

  const { data: pedido, error } = await supabaseAdmin
    .from("pedidos")
    .update({
      status: "entregue",
      status_atualizado_em: agora,
    })
    .eq("id", pedidoId)
    .select("*")
    .single();

  if (error || !pedido) {
    throw new Error(error?.message ?? "Pedido não encontrado.");
  }

  await supabaseAdmin.from("status_history").insert({
    pedido_id: pedido.id,
    status_anterior: pedidoAtual.status,
    status_novo: "entregue",
    admin_user: adminUser.email ?? "admin",
    mensagem_whatsapp: "Música liberada manualmente pelo painel administrativo.",
    criado_em: agora,
  });

  return pedido;
}

export const adminConfirmPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        accessToken: z.string().min(10),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    return confirmPagamentoPedido(data.id, data.accessToken);
  });

export const adminReleaseMusic = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        accessToken: z.string().min(10),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    return releaseMusicPedido(data.id, data.accessToken);
  });
