import { z } from "zod";

export const ProviderNameSchema = z.enum([
  "openai",
  "gemini",
  "anthropic",
  "mistral",
  "openai-compatible"
]);

export type ProviderName = z.infer<typeof ProviderNameSchema>;

export const ApiServerResponseSchema = z.object({
  status_code: z.number().int(),
  endpoint: z.string().nullable(),
  method: z.string().nullable(),
  request_id: z.string(),
  provider: z.string(),
  model: z.string(),
  message: z.string(),
  data: z.any().nullable(),
  errors: z.array(z.any()).default([]),
  meta: z.record(z.string(), z.any()).default({})
});

export type ApiServerResponse = z.infer<typeof ApiServerResponseSchema>;

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, any>;
};

export type ToolCallRequest = {
  id: string;
  name: string;
  arguments: Record<string, any>;
};

export type ToolCallResult = {
  tool_call_id: string;
  name: string;
  result: unknown;
};

export type ProviderChatInput = {
  systemPrompt: string;
  model: string;
  messages: Array<{ role: "user" | "assistant" | "tool"; content: string; name?: string; tool_call_id?: string }>;
  tools: ToolDefinition[];
  temperature?: number;
  maxIterations?: number;
};

export type ProviderChatOutput = {
  text?: string;
  toolCalls: ToolCallRequest[];
  raw?: unknown;
};

export interface LLMProvider {
  name: ProviderName;
  chat(input: ProviderChatInput): Promise<ProviderChatOutput>;
}

export const ChatRequestSchema = z.object({
  message: z.string().min(1),
  systemPrompt: z.string().optional(),
  provider: ProviderNameSchema.optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  mode: z.enum(["chat", "daily_test"]).default("chat"),
  metadata: z.record(z.string(), z.any()).optional()
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
