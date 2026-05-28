import OpenAI from "openai";
import type { LLMProvider, ProviderChatInput, ProviderChatOutput, ToolCallRequest } from "../types/index.js";

export class OpenAICompatibleProvider implements LLMProvider {
  name = "openai-compatible" as const;
  private client: OpenAI;

  constructor(
    apiKey = process.env.OPENAI_COMPATIBLE_API_KEY,
    baseURL = process.env.OPENAI_COMPATIBLE_BASE_URL
  ) {
    if (!apiKey) throw new Error("OPENAI_COMPATIBLE_API_KEY is required");
    if (!baseURL) throw new Error("OPENAI_COMPATIBLE_BASE_URL is required");
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async chat(input: ProviderChatInput): Promise<ProviderChatOutput> {
    const response = await this.client.chat.completions.create({
      model: input.model,
      temperature: input.temperature ?? 0.1,
      messages: [
        { role: "system", content: input.systemPrompt },
        ...input.messages.map((m) => {
          if (m.role === "tool") return { role: "user" as const, content: `Tool result ${m.name}: ${m.content}` };
          return { role: m.role as "user" | "assistant", content: m.content };
        })
      ],
      tools: input.tools.map((t) => ({ type: "function" as const, function: { name: t.name, description: t.description, parameters: t.parameters } })),
      tool_choice: "auto"
    });
    const msg = response.choices[0]?.message;
    const toolCalls: ToolCallRequest[] = (msg?.tool_calls ?? []).map((tc) => ({ id: tc.id, name: tc.function.name, arguments: JSON.parse(tc.function.arguments || "{}") }));
    return { text: msg?.content ?? undefined, toolCalls, raw: response };
  }
}
