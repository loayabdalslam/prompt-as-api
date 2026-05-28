import OpenAI from "openai";
import type { LLMProvider, ProviderChatInput, ProviderChatOutput, ToolCallRequest } from "../types/index.js";

export class OpenAIProvider implements LLMProvider {
  name = "openai" as const;
  private client: OpenAI;

  constructor(apiKey = process.env.OPENAI_API_KEY) {
    if (!apiKey) throw new Error("OPENAI_API_KEY is required for OpenAI provider");
    this.client = new OpenAI({ apiKey });
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
      tools: input.tools.map((t) => ({
        type: "function" as const,
        function: { name: t.name, description: t.description, parameters: t.parameters }
      })),
      tool_choice: "auto",
      response_format: { type: "json_object" }
    });

    const msg = response.choices[0]?.message;
    const toolCalls: ToolCallRequest[] = (msg?.tool_calls ?? []).map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments || "{}")
    }));
    return { text: msg?.content ?? undefined, toolCalls, raw: response };
  }
}
