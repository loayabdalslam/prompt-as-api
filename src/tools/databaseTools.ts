import { PrismaClient } from "@prisma/client";
import type { ToolDefinition, ToolCallRequest, ToolCallResult } from "../types/index.js";

export const prisma = new PrismaClient();

export const databaseToolDefinitions: ToolDefinition[] = [
  {
    name: "db_create_record",
    description: "Create or replace a JSON record in the Prisma database by namespace and key.",
    parameters: {
      type: "object",
      properties: {
        namespace: { type: "string" },
        key: { type: "string" },
        value: { type: "object", additionalProperties: true }
      },
      required: ["namespace", "key", "value"],
      additionalProperties: false
    }
  },
  {
    name: "db_get_record",
    description: "Read one JSON record from the Prisma database by namespace and key.",
    parameters: {
      type: "object",
      properties: {
        namespace: { type: "string" },
        key: { type: "string" }
      },
      required: ["namespace", "key"],
      additionalProperties: false
    }
  },
  {
    name: "db_search_records",
    description: "Search JSON records in the Prisma database by namespace and optional text query.",
    parameters: {
      type: "object",
      properties: {
        namespace: { type: "string" },
        query: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 50 }
      },
      required: ["namespace"],
      additionalProperties: false
    }
  },
  {
    name: "db_update_record",
    description: "Patch an existing JSON record in the Prisma database. Shallow merge only.",
    parameters: {
      type: "object",
      properties: {
        namespace: { type: "string" },
        key: { type: "string" },
        patch: { type: "object", additionalProperties: true }
      },
      required: ["namespace", "key", "patch"],
      additionalProperties: false
    }
  },
  {
    name: "db_delete_record",
    description: "Delete a JSON record from the Prisma database by namespace and key.",
    parameters: {
      type: "object",
      properties: {
        namespace: { type: "string" },
        key: { type: "string" }
      },
      required: ["namespace", "key"],
      additionalProperties: false
    }
  }
];

function mustString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${field} must be a non-empty string`);
  return value;
}

function parseJsonRecord(record: { id: string; namespace: string; key: string; valueJson: string; createdAt: Date; updatedAt: Date }) {
  return {
    id: record.id,
    namespace: record.namespace,
    key: record.key,
    value: JSON.parse(record.valueJson),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export async function executeDatabaseTool(call: ToolCallRequest): Promise<ToolCallResult> {
  const args = call.arguments || {};
  try {
    switch (call.name) {
      case "db_create_record": {
        const namespace = mustString(args.namespace, "namespace");
        const key = mustString(args.key, "key");
        const value = args.value ?? {};
        const record = await prisma.apiRecord.upsert({
          where: { namespace_key: { namespace, key } },
          create: { namespace, key, valueJson: JSON.stringify(value) },
          update: { valueJson: JSON.stringify(value) }
        });
        return { tool_call_id: call.id, name: call.name, result: { ok: true, record: parseJsonRecord(record) } };
      }
      case "db_get_record": {
        const namespace = mustString(args.namespace, "namespace");
        const key = mustString(args.key, "key");
        const record = await prisma.apiRecord.findUnique({ where: { namespace_key: { namespace, key } } });
        return { tool_call_id: call.id, name: call.name, result: { ok: true, record: record ? parseJsonRecord(record) : null } };
      }
      case "db_search_records": {
        const namespace = mustString(args.namespace, "namespace");
        const query = typeof args.query === "string" ? args.query : undefined;
        const limit = typeof args.limit === "number" ? Math.min(Math.max(args.limit, 1), 50) : 10;
        const records = await prisma.apiRecord.findMany({
          where: {
            namespace,
            ...(query ? { OR: [{ key: { contains: query } }, { valueJson: { contains: query } }] } : {})
          },
          orderBy: { updatedAt: "desc" },
          take: limit
        });
        return { tool_call_id: call.id, name: call.name, result: { ok: true, records: records.map(parseJsonRecord) } };
      }
      case "db_update_record": {
        const namespace = mustString(args.namespace, "namespace");
        const key = mustString(args.key, "key");
        const patch = args.patch ?? {};
        const existing = await prisma.apiRecord.findUnique({ where: { namespace_key: { namespace, key } } });
        if (!existing) return { tool_call_id: call.id, name: call.name, result: { ok: false, error: "record_not_found" } };
        const merged = { ...JSON.parse(existing.valueJson), ...patch };
        const record = await prisma.apiRecord.update({
          where: { namespace_key: { namespace, key } },
          data: { valueJson: JSON.stringify(merged) }
        });
        return { tool_call_id: call.id, name: call.name, result: { ok: true, record: parseJsonRecord(record) } };
      }
      case "db_delete_record": {
        const namespace = mustString(args.namespace, "namespace");
        const key = mustString(args.key, "key");
        await prisma.apiRecord.delete({ where: { namespace_key: { namespace, key } } }).catch(() => null);
        return { tool_call_id: call.id, name: call.name, result: { ok: true, deleted: { namespace, key } } };
      }
      default:
        return { tool_call_id: call.id, name: call.name, result: { ok: false, error: `Unknown tool: ${call.name}` } };
    }
  } catch (error) {
    return { tool_call_id: call.id, name: call.name, result: { ok: false, error: error instanceof Error ? error.message : String(error) } };
  }
}
