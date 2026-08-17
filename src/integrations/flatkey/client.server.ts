import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.FLATKEY_API_KEY,
  baseURL: "https://router.flatkey.ai/v1",
});

export async function gerarLetraComFlatkey(prompt: string) {
  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.8,
    messages: [
      {
        role: "system",
        content: `
Você é um compositor profissional de música emocional e moderna.

Sua função é transformar a história real de uma pessoa
em uma letra de música personalizada, emocionante e cantável.

REGRAS:
- Use somente informações fornecidas pelo cliente.
- Não invente nomes, datas, acontecimentos ou características.
- Preserve os detalhes importantes da história.
- A música deve parecer escrita especificamente para essa pessoa.
- Evite frases genéricas e clichês excessivos.
- Não mencione inteligência artificial.
- Não faça comentários antes ou depois da letra.
- Entregue somente a letra.
- A letra deve ser adequada para geração no Suno.

ESTRUTURA:

[Verso 1]
[Pré-Refrão]
[Refrão]
[Verso 2]
[Pré-Refrão]
[Refrão]
[Ponte]
[Refrão Final]
        `,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return {
    letra: response.choices[0].message.content,
    uso: response.usage,
  };
}
