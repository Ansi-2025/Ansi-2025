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

function normalizeAllowedTelegramStatus(statusLabel: string): string | null {
  const normalized = statusLabel
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (!normalized) {
    return null;
  }

  if (/aguardando pagamento|aguardando aprovacao|aprovacao da letra/.test(normalized)) {
    return null;
  }

  if (/pedido recebido|recebido/.test(normalized)) {
    return "Pedido recebido";
  }

  if (/letra aprovada|aprovada/.test(normalized)) {
    return "Letra aprovada";
  }

  if (/pagamento recebido|pagamento aprovado|pagamento|pago/.test(normalized)) {
    return "Pagamento recebido";
  }

  if (/musica em producao|musica em produção|musica em producao|producao|producao da musica|previa|gerando musica|gerando música/.test(normalized)) {
    return "Música em produção";
  }

  return null;
}

export function buildPedidoTelegramMessage(
  order: TelegramOrderSnapshot,
  statusLabel: string,
  extraMessage?: string,
) {
  const safeId = escapeHtml(order.id ?? "—");
  const safeCliente = escapeHtml(order.nome_cliente ?? "—");
  const finalStatus = normalizeAllowedTelegramStatus(statusLabel);

  if (!finalStatus) {
    return "";
  }

  const safeStatus = escapeHtml(finalStatus);

  if (finalStatus === "Pedido recebido") {
    return `Pedido recebido ✅ ${safeCliente}, ID ${safeId}`;
  }

  if (finalStatus === "Pagamento recebido") {
    return [
      `Pagamento recebido ✅`,
      `${safeCliente}`,
      `Pedido: ${safeId}`,
      `Status: ${safeStatus}`,
    ].join("\n");
  }

  return [
    `${safeCliente}`,
    `Pedido: ${safeId}`,
    `Status: ${safeStatus}`,
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

  if (!text) {
    return { ok: true, reason: "ignored_status" as const };
  }

  return sendTelegramMessage(text);
}
