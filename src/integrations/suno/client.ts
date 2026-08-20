export type ResultadoSuno = {
  taskId: string;
  suno_job_id: string;
  created_at: Date;
};

export type SunoCallbackData = {
  callbackType: "text" | "first" | "complete";
  task_id: string;
  data: Array<{
    id: string;
    audio_url: string;
    stream_audio_url: string;
    image_url: string;
    prompt: string;
    model_name: string;
    title: string;
    tags: string;
    createTime: string;
    duration: number;
  }>;
};

function inferirTituloDaLetra(letra: string, fallback: string): string {
  const linhas = letra
    .split(/\n/)
    .map((linha) => linha.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean)
    .filter((linha) => !/^\[[^\]]+\]$/.test(linha));

  const tituloBase = linhas.find((linha) => linha.length > 3 && !/^\s*(eu|meu|nossa|você|amor|deus|fé)\b/i.test(linha))
    ?? linhas[0]
    ?? fallback;

  const titulo = tituloBase
    .replace(/[\r\t]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[*#_~`\[\]\(\)]/g, "")
    .trim();

  if (!titulo) return "Música especial";

  return titulo.length > 60 ? `${titulo.slice(0, 57).trimEnd()}...` : titulo;
}

export function removerReferenciaArtista(texto: string): string {
  if (!texto) return texto;

  const padroes = [
    /\b(?:cantor|cantora|artista|banda|grupo|voz)\b\s*(?:de|da|do|em|ao|a)?\s*[:;-]?\s*[A-ZÀ-ÖØ-Þ\wÀ-ÖØ-Þ'’.-]+(?:\s+[A-ZÀ-ÖØ-Þ\wÀ-ÖØ-Þ'’.-]+){0,4}/gi,
    /\b(?:refer(?:ê|e)ncia|inspirado|inspirada|baseado|baseada|igual(?:\s+(?:ao|a|à))?|semelhante(?:\s+(?:ao|a|à))?)\b\s*(?:em|na|no|do|da|de|à|ao|a)?\s*[:;-]?\s*[A-ZÀ-ÖØ-Þ\wÀ-ÖØ-Þ'’.-]+(?:\s+[A-ZÀ-ÖØ-Þ\wÀ-ÖØ-Þ'’.-]+){0,4}/gi,
  ];

  let result = texto;
  for (const padrao of padroes) {
    result = result.replace(padrao, "");
  }

  return result
    .replace(/\s{2,}/g, " ")
    .replace(/\s*,\s*[,.;]/g, ",")
    .replace(/\s+,/g, ",")
    .replace(/,\s*$/g, "")
    .trim();
}

export function construirPromptSunoParaPedido(
  letra: string,
  generoMusical: string,
  nomeCliente: string,
  paraQuem: string,
  ocasiao: string,
  duracaoSegundos: number,
  tipoCantor: "feminino" | "masculino" = "feminino",
): { title: string; style: string; prompt: string } {
  const letraSanitizada = removerReferenciaArtista(letra);
  const estiloSanitizado = removerReferenciaArtista(generoMusical || "Pop brasileiro");
  const title = inferirTituloDaLetra(letraSanitizada, `${nomeCliente} e ${paraQuem}`);
  const style = `${estiloSanitizado || "Pop brasileiro"}, emocional, moderno, com melodia memorável, produção profissional, ${tipoCantor === "masculino" ? "voz masculina" : "voz feminina"}, arranjo contemporâneo`.slice(0, 1000).trim();

  const promptBase = letraSanitizada
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const prompt = [
    `Título: ${title}`,
    `Estilo: ${style}`,
    `Tom e atmosfera: emocional, brasileiro, envolvente, com batida moderna e instrumentos tradicionais e contemporâneos.`,
    `Duração: ${duracaoSegundos} segundos.`,
    `Ocasião: ${ocasiao}.`,
    `Destinatário: ${paraQuem}.`,
    `Voz: ${tipoCantor === "masculino" ? "masculina" : "feminina"}.`,
    "",
    "LETRA:",
    promptBase,
  ].join("\n");

  return {
    title,
    style,
    prompt: prompt.slice(0, 5000),
  };
}

/**
 * Gera música usando a API SunoAPI.org em custom mode.
 * O prompt deve ser a letra final gerada pela Flatkey, e a Suno canta essa letra.
 */
export async function gerarMusicaComSuno(
  letraFinal: string,
  pedidoId: string,
  duracaoSegundos: number = 180,
  generoMusical: string = "Pop brasileiro moderno",
  title?: string,
  tipoCantor: "feminino" | "masculino" = "feminino",
): Promise<ResultadoSuno> {
  const apiKey = process.env.SUNO_API_KEY;
  const appUrl = process.env.STRIPE_APP_URL
    ? process.env.STRIPE_APP_URL
    : process.env.VITE_STRIPE_PUBLISHABLE_KEY?.includes("live")
      ? "https://cancaodefe.com"
      : "http://localhost:5173";

  if (!apiKey) {
    throw new Error(
      "SUNO_API_KEY não configurada. Defina em .env.local ou nas variáveis do ambiente."
    );
  }

  if (!appUrl) {
    throw new Error(
      "STRIPE_APP_URL não configurada. Necessário para callbacks do Suno."
    );
  }

  const callbackUrl = `${appUrl}/api/webhooks/suno`;
  const model = "V5";
  const prompt = removerReferenciaArtista(letraFinal?.trim() ?? "");

  if (!prompt) {
    throw new Error("A letra final não foi fornecida para a API da Suno. O payload precisa conter a letra gerada e aprovada.");
  }

  const estiloSemReferencia = removerReferenciaArtista(generoMusical ?? "Pop brasileiro moderno");
  const resolvedTitle = removerReferenciaArtista(title ?? inferirTituloDaLetra(prompt, `Música especial #${pedidoId}`)).trim() || `Música especial #${pedidoId}`;
  const vocalGender = tipoCantor === "masculino" ? "m" : "f";

  const style = `${estiloSemReferencia || "Pop brasileiro moderno"}, ${tipoCantor === "masculino" ? "voz masculina" : "voz feminina"}, emocional, moderno, com melodia memorável, produção profissional`;

  const requestBody = {
    prompt: prompt.slice(0, 5000),
    customMode: true,
    instrumental: false,
    model,
    callBackUrl: callbackUrl,
    style: style.slice(0, 1000),
    title: resolvedTitle.slice(0, 100),
    vocalGender,
    styleWeight: 0.8,
    weirdnessConstraint: 0.4,
  };

  try {
    const response = await fetch("https://api.sunoapi.org/api/v1/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Erro Suno API [${response.status}]:`, errorBody);
      throw new Error(
        `Falha na API SunoAPI.org: ${response.status} - ${errorBody}`
      );
    }

    const result = (await response.json()) as { code: number; data: { taskId: string }; msg: string };

    if (result.code !== 200) {
      throw new Error(`API retornou erro: ${result.msg}`);
    }

    const taskId = result.data.taskId;

    return {
      taskId,
      suno_job_id: taskId,
      created_at: new Date(),
    };
  } catch (error) {
    console.error("Erro ao gerar música com Suno:", error);
    throw error;
  }
}
