import { GoogleGenAI, Type } from "@google/genai";
import type { LLMProvider, ProviderChatInput, ProviderChatOutput, ToolCallRequest } from "../types/index.js";

function jsonSchemaToGemini(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;
  const clone = JSON.parse(JSON.stringify(schema));
  function walk(node: any) {
    if (!node || typeof node !== "object") return;
    if (typeof node.type === "string") node.type = node.type.toUpperCase();
    if (node.type === "NUMBER") node.type = Type.NUMBER;
    if (node.type === "INTEGER") node.type = Type.INTEGER;
    if (node.type === "STRING") node.type = Type.STRING;
    if (node.type === "BOOLEAN") node.type = Type.BOOLEAN;
    if (node.type === "ARRAY") node.type = Type.ARRAY;
    if (node.type === "OBJECT") node.type = Type.OBJECT;
    if (node.properties) Object.values(node.properties).forEach(walk);
    if (node.items) walk(node.items);
    delete node.additionalProperties;
  }
  walk(clone);
  return clone;
}

export class GeminiProvider implements LLMProvider {
  name = "gemini" as const;
  private client: GoogleGenAI;

  constructor(apiKey = process.env.GEMINI_API_KEY) {
    if (!apiKey) throw new Error("GEMINI_API_KEY is required for Gemini provider");
    this.client = new GoogleGenAI({ apiKey });
  }

  async chat(input: ProviderChatInput): Promise<ProviderChatOutput> {
    const contents = input.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.role === "tool" ? `Tool result ${m.name}: ${m.content}` : m.content }]
    }));

    const response = await this.client.models.generateContent({
      model: input.model,
      contents,
      config: {
        systemInstruction: input.systemPrompt,
        temperature: input.temperature ?? 0.1,
        responseMimeType: "application/json",
        tools: [{
          functionDeclarations: input.tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: jsonSchemaToGemini(t.parameters)
          }))
        }]
      }
    });

    const anyResponse: any = response;
    const calls = anyResponse.functionCalls ?? anyResponse.candidates?.[0]?.content?.parts?.filter((p: any) => p.functionCall).map((p: any) => p.functionCall) ?? [];
    const toolCalls: ToolCallRequest[] = calls.map((c: any, i: number) => ({
      id: c.id ?? `gemini_tool_${Date.now()}_${i}`,
      name: c.name,
      arguments: c.args ?? {}
    }));

    return { text: response.text ?? undefined, toolCalls, raw: response };
  }
}
