type TelegramOrderSnapshot = {
  id?: string | null;
  nome_cliente?: string | null;
  telefone_cliente?: string | null;
  email_cliente?: string | null;
  para_quem?: string | null;
  ocasiao?: string | null;
  descricao?: string | null;
  status?: string | null;
};

const escapeHtml = (value: string | null | undefined) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");

const getTelegramConfig = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || "";
  const chatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_OWNER_CHAT_ID || "";
  return { token, chatId };
};

export function buildPedidoTelegramMessage(
  order: TelegramOrderSnapshot,
  statusLabel: string,
  extraMessage?: string,
) {
  const safeId = escapeHtml(order.id ?? "—");
  const safeCliente = escapeHtml(order.nome_cliente ?? "—");
  const safeTelefone = escapeHtml(order.telefone_cliente ?? "—");
  const safeEmail = escapeHtml(order.email_cliente ?? "—");
  const safeParaQuem = escapeHtml(order.para_quem ?? "—");
  const safeOcasião = escapeHtml(order.ocasiao ?? "—");
  const safeDescricao = escapeHtml(order.descricao ?? "—");
  const safeStatus = escapeHtml(statusLabel);
  const safeExtra = extraMessage ? `\n${escapeHtml(extraMessage)}` : "";
  const headerLabel = statusLabel.toLowerCase().includes("recebido") ? "Pedido recebido ✅" : "Pedido atualizado ✅";

  return [
    `${headerLabel} ${safeCliente}, ID ${safeId}`,
    `<b>Status:</b> ${safeStatus}`,
    `<b>Telefone:</b> ${safeTelefone}`,
    `<b>E-mail:</b> ${safeEmail}`,
    `<b>Para:</b> ${safeParaQuem}`,
    `<b>Ocasião:</b> ${safeOcasião}`,
    `<b>Resumo:</b> ${safeDescricao}`,
    safeExtra,
  ].join("\n");
}

export async function sendTelegramMessage(text: string, chatIdOverride?: string) {
  const { token, chatId } = getTelegramConfig();
  const finalChatId = chatIdOverride || chatId;

  if (!token || !finalChatId) {
    console.warn("[telegram] Configuração ausente. Defina TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID (ou TELEGRAM_OWNER_CHAT_ID).");
    return { ok: false, reason: "missing_telegram_config" as const };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: finalChatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.ok) {
      const message = payload?.description ?? payload?.error ?? `HTTP ${response.status}`;
      console.error("[telegram] Falha ao enviar mensagem:", message);
      return { ok: false, reason: "telegram_api_error", details: message };
    }

    return { ok: true, reason: "sent" as const, payload };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[telegram] Exceção ao enviar mensagem:", message);
    return { ok: false, reason: "exception", details: message };
  }
}

export async function notifyPedidoTelegram(
  order: TelegramOrderSnapshot,
  statusLabel: string,
  extraMessage?: string,
) {
  const text = buildPedidoTelegramMessage(order, statusLabel, extraMessage);
  return sendTelegramMessage(text);
}
