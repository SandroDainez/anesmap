import OpenAI from "openai";

function getClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY não configurada.");
  return new OpenAI({ baseURL: "https://api.deepseek.com", apiKey });
}

export async function gerarRespostaSimulacao(
  systemPrompt: string,
  mensagem: string,
): Promise<Record<string, unknown>> {
  const response = await getClient().chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: mensagem },
    ],
    max_tokens: 1200,
    temperature: 0.7,
    response_format: { type: "json_object" },
  });
  const content = response.choices[0].message.content ?? "{}";
  return JSON.parse(content) as Record<string, unknown>;
}
