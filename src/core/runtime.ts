import { ApiServerResponseSchema, type ApiServerResponse, type ChatRequest } from "../types/index.js";
import { createProvider } from "../providers/index.js";
import { DEFAULT_SYSTEM_PROMPT } from "./defaultSystemPrompt.js";
import { safeJsonParse, stableRequestId } from "./json.js";
import { executeToolCall, toolDefinitions } from "./toolRegistry.js";
import { prisma } from "../tools/databaseTools.js";

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4.1-mini",
  gemini: "gemini-2.5-flash",
  anthropic: "claude-sonnet-4-5",
  mistral: "mistral-large-latest",
  "openai-compatible": "llama-3.3-70b-versatile"
};

function normalizeResponse(value: any, fallback: Partial<ApiServerResponse>): ApiServerResponse {
  const raw = typeof value === "object" && value ? value : {};
  const withDefaults = {
    status_code: raw.status_code ?? fallback.status_code ?? 200,
    endpoint: raw.endpoint ?? fallback.endpoint ?? null,
    method: raw.method ?? fallback.method ?? null,
    request_id: fallback.request_id ?? stableRequestId(),
    provider: fallback.provider ?? "unknown",
    model: fallback.model ?? "unknown",
    message: raw.message ?? fallback.message ?? "OK",
    data: raw.data ?? null,
    errors: Array.isArray(raw.errors) ? raw.errors : [],
    meta: { ...(raw.meta ?? {}), ...(fallback.meta ?? {}) }
  };
  return ApiServerResponseSchema.parse(withDefaults);
}

export async function runPromptApi(request: ChatRequest): Promise<ApiServerResponse> {
  const requestId = stableRequestId();
  const providerName = request.provider ?? (process.env.DEFAULT_PROVIDER as any) ?? "gemini";
  const model = request.model ?? process.env.DEFAULT_MODEL ?? DEFAULT_MODELS[providerName];
  const provider = createProvider(providerName);
  const systemPrompt = request.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  const messages: Array<{ role: "user" | "assistant" | "tool"; content: string; name?: string; tool_call_id?: string }> = [
    { role: "user", content: request.message }
  ];

  const toolCallsExecuted: any[] = [];
  let finalText = "";

  for (let i = 0; i < 6; i++) {
    const output = await provider.chat({
      systemPrompt,
      model,
      messages,
      tools: toolDefinitions,
      temperature: request.temperature,
      maxIterations: 6
    });

    finalText = output.text ?? finalText;

    if (!output.toolCalls.length) break;

    messages.push({
      role: "assistant",
      content: JSON.stringify({ message: "Tool calls requested", toolCalls: output.toolCalls })
    });

    for (const call of output.toolCalls) {
      const result = await executeToolCall(call);
      toolCallsExecuted.push({ call, result });
      messages.push({
        role: "tool",
        name: call.name,
        tool_call_id: call.id,
        content: JSON.stringify(result.result)
      });
    }
  }

  const parsed = safeJsonParse(finalText) ?? {
    status_code: 500,
    endpoint: null,
    method: null,
    message: "Provider did not return valid JSON",
    data: { raw_text: finalText },
    errors: [{ message: "invalid_json_response" }]
  };

  const response = normalizeResponse(parsed, {
    request_id: requestId,
    provider: providerName,
    model,
    meta: { tool_calls_count: toolCallsExecuted.length }
  });

  await prisma.auditLog.create({
    data: {
      requestId,
      provider: providerName,
      model,
      endpoint: response.endpoint,
      statusCode: response.status_code,
      inputJson: JSON.stringify(request),
      outputJson: JSON.stringify(response),
      toolCalls: JSON.stringify(toolCallsExecuted)
    }
  }).catch(() => null);

  return response;
}
