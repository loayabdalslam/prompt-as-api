import { Mistral } from "@mistralai/mistralai";
import type { LLMProvider, ProviderChatInput, ProviderChatOutput, ToolCallRequest } from "../types/index.js";

export class MistralProvider implements LLMProvider {
  name = "mistral" as const;
  private client: Mistral;

  constructor(apiKey = process.env.MISTRAL_API_KEY) {
    if (!apiKey) throw new Error("MISTRAL_API_KEY is required for Mistral provider");
    this.client = new Mistral({ apiKey });
  }

  async chat(input: ProviderChatInput): Promise<ProviderChatOutput> {
    const response: any = await this.client.chat.complete({
      model: input.model,
      temperature: input.temperature ?? 0.1,
      messages: [
        { role: "system", content: input.systemPrompt },
        ...input.messages.map((m) => ({
          role: m.role === "tool" ? "tool" : m.role,
          content: m.content,
          name: m.name,
          toolCallId: m.tool_call_id
        }))
      ],
      tools: input.tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.parameters }
      })),
      toolChoice: "auto"
    });

    const msg = response.choices?.[0]?.message;
    const toolCalls: ToolCallRequest[] = (msg?.toolCalls ?? msg?.tool_calls ?? []).map((tc: any) => ({
      id: tc.id,
      name: tc.function?.name,
      arguments: typeof tc.function?.arguments === "string" ? JSON.parse(tc.function.arguments || "{}") : (tc.function?.arguments ?? {})
    }));
    return { text: typeof msg?.content === "string" ? msg.content : undefined, toolCalls, raw: response };
  }
}
