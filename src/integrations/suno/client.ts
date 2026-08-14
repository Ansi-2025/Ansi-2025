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

export function construirPromptSunoParaPedido(
  letra: string,
  generoMusical: string,
  nomeCliente: string,
  paraQuem: string,
  ocasiao: string,
  duracaoSegundos: number,
): { title: string; style: string; prompt: string } {
  const title = `Canção de Fé - ${nomeCliente} - ${paraQuem}`.slice(0, 100).trim();
  const style = `${generoMusical || "Pop brasileiro"}, emocional, moderno, com melodia memorável, produção profissional, voz clara, arranjo contemporâneo`.slice(0, 1000).trim();

  const promptBase = letra
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
  title: string = `Canção de Fé - Pedido #${pedidoId}`,
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
  const model = duracaoSegundos > 120 ? "V5_5" : "V5";
  const prompt = letraFinal?.trim() || "Uma música emocional e inspiradora.";

  const requestBody = {
    prompt: prompt.slice(0, 5000),
    customMode: true,
    instrumental: false,
    model,
    callBackUrl: callbackUrl,
    style: generoMusical.slice(0, 1000),
    title: title.slice(0, 100),
    duration: model === "V5_5" ? Math.min(duracaoSegundos, 360) : undefined,
    vocalGender: "m",
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
