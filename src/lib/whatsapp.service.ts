export type WhatsAppDeliveryResult = {
  ok: boolean;
  provider: "meta-cloud-api" | "wa-me-link" | "disabled";
  messageId?: string;
  fallbackUrl?: string;
  reason?: string;
};

function normalizeWhatsAppNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("55")) return digits;
  if (digits.length === 11) return `55${digits}`;
  if (digits.length >= 12) return `55${digits.replace(/^0+/, "")}`;

  return digits.length >= 10 ? `55${digits}` : "";
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const normalized = normalizeWhatsAppNumber(phone);
  if (!normalized) return "";

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export async function enviarMusicaPorWhatsapp({
  nomeCliente,
  whatsapp,
  musicaUrl,
  mensagem,
}: {
  nomeCliente: string;
  whatsapp?: string | null;
  musicaUrl?: string | null;
  mensagem?: string;
}): Promise<WhatsAppDeliveryResult> {
  const normalizedPhone = whatsapp ? normalizeWhatsAppNumber(whatsapp) : "";

  if (!normalizedPhone || !musicaUrl) {
    return {
      ok: false,
      provider: "disabled",
      reason: "WhatsApp ou URL da música indisponíveis.",
    };
  }

  const defaultBodyMessage = [
    `Olá ${nomeCliente}! 👋`,
    "Sua música já está pronta e disponível para download.",
    `🎵 Link: ${musicaUrl}`,
    "Obrigado por confiar na Canção de Fé!",
  ].join("\n\n");

  const bodyMessage = mensagem ?? defaultBodyMessage;
  const fallbackUrl = buildWhatsAppUrl(normalizedPhone, bodyMessage);
  const token = process.env.WHATSAPP_TOKEN ?? process.env.WHATSAPP_CLOUD_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    return {
      ok: true,
      provider: "wa-me-link",
      fallbackUrl,
      reason: "API do WhatsApp não configurada; link de fallback gerado.",
    };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizedPhone,
        type: "text",
        text: {
          body: bodyMessage,
        },
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error("Erro ao enviar WhatsApp via Cloud API:", responseText);
      return {
        ok: false,
        provider: "meta-cloud-api",
        fallbackUrl,
        reason: responseText || "Falha ao enviar mensagem via WhatsApp.",
      };
    }

    let json: { messages?: Array<{ id?: string }> } = {};
    try {
      json = JSON.parse(responseText) as { messages?: Array<{ id?: string }> };
    } catch {
      // ignore parse errors, the API may still have returned a valid response body
    }

    return {
      ok: true,
      provider: "meta-cloud-api",
      messageId: json.messages?.[0]?.id,
      fallbackUrl,
    };
  } catch (error) {
    console.error("Exceção ao enviar WhatsApp:", error);
    return {
      ok: false,
      provider: "meta-cloud-api",
      fallbackUrl,
      reason: error instanceof Error ? error.message : "Erro inesperado ao enviar mensagem.",
    };
  }
}
