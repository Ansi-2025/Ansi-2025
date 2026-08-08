export async function gerarLetraComGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const apiUrl = process.env.GEMINI_API_URL || "https://api.openai.com/v1/chat/completions";
  const model = process.env.GEMINI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada. Defina em .env.local ou nas variáveis do ambiente.");
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Você é um compositor de letras de música que escreve letras emotivas, claras e direcionadas para a fé cristã.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 1200,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Falha na API Gemini: ${response.status} ${payload}`);
  }

  const json = await response.json();
  const content =
    json?.choices?.[0]?.message?.content || json?.choices?.[0]?.text || json?.output?.text;

  if (!content || typeof content !== "string") {
    throw new Error("Resposta inválida da API Gemini. Verifique o formato retornado.");
  }

  return content.trim();
}
