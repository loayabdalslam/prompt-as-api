import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, ProviderChatInput, ProviderChatOutput, ToolCallRequest } from "../types/index.js";

export class AnthropicProvider implements LLMProvider {
  name = "anthropic" as const;
  private client: Anthropic;

  constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required for Anthropic provider");
    this.client = new Anthropic({ apiKey });
  }

  async chat(input: ProviderChatInput): Promise<ProviderChatOutput> {
    const response = await this.client.messages.create({
      model: input.model,
      max_tokens: 4096,
      temperature: input.temperature ?? 0.1,
      system: input.systemPrompt,
      messages: input.messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.role === "tool" ? `Tool result ${m.name}: ${m.content}` : m.content
      })),
      tools: input.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as any
      }))
    });

    const toolCalls: ToolCallRequest[] = response.content
      .filter((block: any) => block.type === "tool_use")
      .map((block: any) => ({ id: block.id, name: block.name, arguments: block.input ?? {} }));
    const text = response.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
    return { text: text || undefined, toolCalls, raw: response };
  }
}
