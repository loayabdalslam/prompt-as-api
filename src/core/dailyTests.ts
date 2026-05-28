import type { ChatRequest } from "../types/index.js";
import { prisma } from "../tools/databaseTools.js";
import { runPromptApi } from "./runtime.js";

export const dailyTestCases: Array<{ name: string; request: Omit<ChatRequest, "mode">; expectedStatus: number }> = [
  {
    name: "create_customer",
    request: { message: "Create customer c_daily_001 named Loai Test with email test@example.com" },
    expectedStatus: 201
  },
  {
    name: "get_customer",
    request: { message: "Get customer c_daily_001" },
    expectedStatus: 200
  },
  {
    name: "update_customer",
    request: { message: "Update customer c_daily_001 and add tag vip" },
    expectedStatus: 200
  },
  {
    name: "create_task",
    request: { message: "Create critical task task_daily_001 titled Review PromptAPI runtime tomorrow" },
    expectedStatus: 201
  },
  {
    name: "search_tasks",
    request: { message: "Search tasks containing PromptAPI" },
    expectedStatus: 200
  },
  {
    name: "create_complex_workflow",
    request: { message: "Create workflow wf_daily_001 to analyze sales, generate report, save report, and notify manager. Include steps." },
    expectedStatus: 201
  }
];

export async function runDailyTests(base: Partial<ChatRequest> = {}) {
  const results = [];
  for (const test of dailyTestCases) {
    const response = await runPromptApi({ ...test.request, ...base, mode: "chat" } as ChatRequest);
    results.push({
      name: test.name,
      expectedStatus: test.expectedStatus,
      actualStatus: response.status_code,
      passed: response.status_code === test.expectedStatus,
      response
    });
  }
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const status = failed === 0 ? "passed" : "failed";
  await prisma.dailyTestRun.create({
    data: {
      suiteName: "default_daily_suite",
      status,
      total: results.length,
      passed,
      failed,
      resultsJson: JSON.stringify(results)
    }
  }).catch(() => null);
  return { status, total: results.length, passed, failed, results };
}
