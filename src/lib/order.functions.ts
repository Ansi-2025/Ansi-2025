import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const OrderSchema = z.object({
  nome_completo: z.string().trim().min(2).max(120),
  para_quem: z.string().trim().min(2).max(120),
  tipo_musica: z.string().trim().min(2).max(80),
  descricao: z.string().trim().min(10).max(2000),
  whatsapp: z.string().trim().min(8).max(40),
});

export const STATUS_FLOW = [
  "recebido",
  "em_producao",
  "em_revisao",
  "pronto",
  "previa",
  "pagamento",
  "entregue",
] as const;
export type PedidoStatus = (typeof STATUS_FLOW)[number];

export const STATUS_LABELS: Record<PedidoStatus, string> = {
  recebido: "Pedido recebido",
  em_producao: "Em produção",
  em_revisao: "Em revisão",
  pronto: "Música pronta",
  previa: "Prévia (45 segundos)",
  pagamento: "Aguardando pagamento",
  entregue: "Entregue 🎉",
};

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);
}

type PedidoRow = {
  id: string;
  created_at: string;
  nome_completo: string;
  para_quem: string;
  tipo_musica: string;
  descricao: string;
  whatsapp: string;
  status: PedidoStatus;
};

function buildTelegramText(p: PedidoRow, opts?: { resent?: boolean }) {
  const criadoEm = new Date(p.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const waDigits = p.whatsapp.replace(/\D/g, "");
  const waLink = waDigits.length >= 10 ? `https://wa.me/${waDigits}` : null;
  const header = opts?.resent
    ? "🔁 <b>REENVIO — PEDIDO DE MÚSICA</b>"
    : "🎵✨ <b>NOVO PEDIDO DE MÚSICA</b> ✨🎵";
  return (
    `${header}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `👤 <b>Nome completo</b>\n${escapeHtml(p.nome_completo)}\n\n` +
    `💝 <b>Para quem é a música</b>\n${escapeHtml(p.para_quem)}\n\n` +
    `🎼 <b>Tipo da música</b>\n${escapeHtml(p.tipo_musica)}\n\n` +
    `📝 <b>Descrição / O que deve ter</b>\n<i>${escapeHtml(p.descricao)}</i>\n\n` +
    `📱 <b>WhatsApp</b>\n${escapeHtml(p.whatsapp)}` +
    (waLink ? ` — <a href="${waLink}">Chamar no WhatsApp</a>` : "") +
    `\n\n📌 <b>Status</b>: ${STATUS_LABELS[p.status]}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `🆔 <code>${p.id}</code>\n` +
    `🕒 ${escapeHtml(criadoEm)}`
  );
}

async function sendTelegram(text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_OWNER_CHAT_ID;
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN não configurado.");
  if (!chatId) throw new Error("TELEGRAM_OWNER_CHAT_ID não configurado.");
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram [${res.status}]: ${body.slice(0, 200)}`);
  }
}

export const sendOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => OrderSchema.parse(data))
  .handler(async ({ data }) => {
    const { data: inserted, error } = await admin()
      .from("pedidos")
      .insert({ ...data })
      .select("*")
      .single();
    if (error) throw new Error(`Falha ao salvar pedido: ${error.message}`);
    try {
      await sendTelegram(buildTelegramText(inserted as PedidoRow));
    } catch (e) {
      // pedido já está salvo; apenas registra falha
      console.error("Telegram error:", e);
    }
    return { ok: true, id: inserted.id as string };
  });

/* ---------------- Tracking (público, somente status) ---------------- */
export const getOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { data: row, error } = await admin()
      .from("pedidos")
      .select("id, nome_completo, para_quem, tipo_musica, status, status_atualizado_em, created_at, url_previa, url_musica, pix_qr_code")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Pedido não encontrado.");
    return row as {
      id: string;
      nome_completo: string;
      para_quem: string;
      tipo_musica: string;
      status: PedidoStatus;
      status_atualizado_em: string;
      created_at: string;
      url_previa: string | null;
      url_musica: string | null;
      pix_qr_code: string | null;
    };
  });

/* ---------------- Admin (gated by ADMIN_PASSWORD) ---------------- */
function assertAdmin(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new Error("ADMIN_PASSWORD não configurado.");
  if (password !== expected) throw new Error("Senha incorreta.");
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ password: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    return { ok: true };
  });

export const adminListOrders = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ password: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { data: rows, error } = await admin()
      .from("pedidos")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows as PedidoRow[];
  });

export const adminUpdateStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        password: z.string().min(1),
        id: z.string().uuid(),
        status: z.enum(STATUS_FLOW),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { data: row, error } = await admin()
      .from("pedidos")
      .update({ status: data.status, status_atualizado_em: new Date().toISOString() })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as PedidoRow;
  });

export const adminResendTelegram = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ password: z.string().min(1), id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { data: row, error } = await admin()
      .from("pedidos")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    await sendTelegram(buildTelegramText(row as PedidoRow, { resent: true }));
    return { ok: true };
  });

export const adminUpdateMusicUrl = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        password: z.string().min(1),
        id: z.string().uuid(),
        url_previa: z.string().url().optional(),
        url_musica: z.string().url().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const updateData: Record<string, unknown> = { status_atualizado_em: new Date().toISOString() };
    if (data.url_previa) updateData.url_previa = data.url_previa;
    if (data.url_musica) updateData.url_musica = data.url_musica;
    const { data: row, error } = await admin()
      .from("pedidos")
      .update(updateData)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as PedidoRow;
  });

export const adminUpdatePixQrCode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        password: z.string().min(1),
        id: z.string().uuid(),
        pix_qr_code: z.string(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { data: row, error } = await admin()
      .from("pedidos")
      .update({ pix_qr_code: data.pix_qr_code, status_atualizado_em: new Date().toISOString() })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as PedidoRow;
  });
