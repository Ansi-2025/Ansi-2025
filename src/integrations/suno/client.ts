export type ResultadoSuno = {
  url_musica: string;
  url_previa?: string | null;
  suno_job_id?: string | null;
};

export async function gerarMusicaComSuno(roteiro: string, pedidoId: string): Promise<ResultadoSuno> {
  const apiKey = process.env.SUNO_API_KEY;
  const apiUrl = process.env.SUNO_API_URL || "https://api.suno.ai/v1/generate";

  if (!apiKey) {
    throw new Error("SUNO_API_KEY não configurada. Defina em .env.local ou nas variáveis do ambiente.");
  }

  const body = {
    prompt: roteiro,
    metadata: {
      pedido_id: pedidoId,
      origem: "Canção de Fé",
    },
    output: {
      tipo: "audio",
      formato: "mp3",
      duracao_segundos: 40,
    },
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Falha na API SUNO: ${response.status} ${payload}`);
  }

  const json = await response.json();

  return {
    url_musica: json.url_musica || json.audio_url || json.url || "",
    url_previa: json.url_previa || json.preview_url || null,
    suno_job_id: json.job_id || json.suno_id || null,
  };
}
