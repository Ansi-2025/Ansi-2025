import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const OrderSchema = z.object({
  nome: z.string().trim().min(2).max(80),
  contato: z.string().trim().min(5).max(120),
  ocasiao: z.string().trim().min(2).max(80),
  historia: z.string().trim().min(10).max(2000),
});

export const sendOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => OrderSchema.parse(data))
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const telegramKey = process.env.TELEGRAM_API_KEY;
    const chatId = process.env.TELEGRAM_OWNER_CHAT_ID;
    if (!lovableKey || !telegramKey) throw new Error("Integração Telegram indisponível.");
    if (!chatId) throw new Error("TELEGRAM_OWNER_CHAT_ID não configurado.");

    const text =
      `🎵 <b>Novo pedido — Canção de Fé</b>\n\n` +
      `<b>Nome:</b> ${escapeHtml(data.nome)}\n` +
      `<b>Contato:</b> ${escapeHtml(data.contato)}\n` +
      `<b>Ocasião:</b> ${escapeHtml(data.ocasiao)}\n\n` +
      `<b>História:</b>\n${escapeHtml(data.historia)}`;

    const res = await fetch("https://connector-gateway.lovable.dev/telegram/sendMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": telegramKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Falha ao enviar pedido [${res.status}]: ${body.slice(0, 200)}`);
    }
    return { ok: true };
  });

function escapeHtml(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);
}
