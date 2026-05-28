import type { ToolCallRequest, ToolCallResult, ToolDefinition } from "../types/index.js";
import { databaseToolDefinitions, executeDatabaseTool } from "../tools/databaseTools.js";

export const toolDefinitions: ToolDefinition[] = [...databaseToolDefinitions];

export async function executeToolCall(call: ToolCallRequest): Promise<ToolCallResult> {
  if (call.name.startsWith("db_")) return executeDatabaseTool(call);
  return { tool_call_id: call.id, name: call.name, result: { ok: false, error: `Tool not registered: ${call.name}` } };
}
