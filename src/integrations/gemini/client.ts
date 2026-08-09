export async function gerarLetraComGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
  const baseUrl = process.env.GEMINI_API_URL || `https://generativeai.googleapis.com/v1beta2/models/${model}`;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada. Defina em .env.local ou nas variáveis do ambiente.");
  }

  async function callGemini(method: "generateMessage" | "generateText") {
    const url = process.env.GEMINI_API_URL || `${baseUrl}:${method}`;
    const body = JSON.stringify(
      method === "generateMessage"
        ? {
            messages: [
              {
                author: "user",
                content: [{ type: "text", text: prompt }],
              },
            ],
            temperature: 0.7,
            maxOutputTokens: 1200,
          }
        : {
            prompt: { text: prompt },
            temperature: 0.7,
            maxOutputTokens: 1200,
          }
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body,
    });

    return { response, method };
  }

  let result = await callGemini("generateMessage");

  if (!result.response.ok && result.response.status === 404) {
    result = await callGemini("generateText");
  }

  if (!result.response.ok) {
    const payload = await result.response.text();
    throw new Error(`Falha na API Gemini: ${result.response.status} ${payload}`);
  }

  const json = await result.response.json();

  const content =
    json?.candidates?.[0]?.content?.find((item: any) => item.type === "output_text")?.text ||
    json?.candidates?.[0]?.content?.find((item: any) => item.type === "text")?.text ||
    json?.candidates?.[0]?.output ||
    json?.message?.content?.find((item: any) => item.type === "text")?.text ||
    json?.choices?.[0]?.message?.content ||
    json?.choices?.[0]?.text ||
    json?.output?.text;

  if (!content || typeof content !== "string") {
    throw new Error("Resposta inválida da API Gemini. Verifique o formato retornado.");
  }

  return content.trim();
}
