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

export const sendOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => OrderSchema.parse(data))
  .handler(async ({ data }) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_OWNER_CHAT_ID;
    if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN não configurado.");
    if (!chatId) throw new Error("TELEGRAM_OWNER_CHAT_ID não configurado.");

    // 1) Salva no banco usando service role (RLS permite INSERT anônimo de qualquer forma)
    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: inserted, error } = await admin
      .from("pedidos")
      .insert({
        nome_completo: data.nome_completo,
        para_quem: data.para_quem,
        tipo_musica: data.tipo_musica,
        descricao: data.descricao,
        whatsapp: data.whatsapp,
      })
      .select("id, created_at")
      .single();

    if (error) {
      throw new Error(`Falha ao salvar pedido: ${error.message}`);
    }

    // 2) Monta mensagem detalhada e bonita para o Telegram
    const criadoEm = new Date(inserted.created_at).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });
    const waDigits = data.whatsapp.replace(/\D/g, "");
    const waLink = waDigits.length >= 10 ? `https://wa.me/${waDigits}` : null;

    const text =
      `🎵✨ <b>NOVO PEDIDO DE MÚSICA</b> ✨🎵\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 <b>Nome completo</b>\n${escapeHtml(data.nome_completo)}\n\n` +
      `💝 <b>Para quem é a música</b>\n${escapeHtml(data.para_quem)}\n\n` +
      `🎼 <b>Tipo da música</b>\n${escapeHtml(data.tipo_musica)}\n\n` +
      `📝 <b>Descrição / O que deve ter</b>\n<i>${escapeHtml(data.descricao)}</i>\n\n` +
      `📱 <b>WhatsApp</b>\n${escapeHtml(data.whatsapp)}` +
      (waLink ? ` — <a href="${waLink}">Chamar no WhatsApp</a>` : "") +
      `\n\n━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 <code>${inserted.id}</code>\n` +
      `🕒 ${escapeHtml(criadoEm)}`;

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      // Pedido já está salvo no banco; apenas registramos a falha do Telegram.
      throw new Error(`Pedido salvo, mas falha ao notificar Telegram [${res.status}]: ${body.slice(0, 200)}`);
    }
    return { ok: true, id: inserted.id };
  });

function escapeHtml(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);
}
