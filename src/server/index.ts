import "dotenv/config";
import express from "express";
import cors from "cors";
import { ChatRequestSchema } from "../types/index.js";
import { runPromptApi } from "../core/runtime.js";
import { runDailyTests } from "../core/dailyTests.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// The framework intentionally exposes one main endpoint only.
app.post("/api/chat", async (req, res) => {
  const parsed = ChatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      status_code: 422,
      endpoint: null,
      method: "POST",
      request_id: `invalid_${Date.now()}`,
      provider: req.body?.provider ?? process.env.DEFAULT_PROVIDER ?? "unknown",
      model: req.body?.model ?? process.env.DEFAULT_MODEL ?? "unknown",
      message: "Invalid request body",
      data: null,
      errors: parsed.error.issues,
      meta: {}
    });
  }

  try {
    if (parsed.data.mode === "daily_test") {
      const result = await runDailyTests({
        provider: parsed.data.provider,
        model: parsed.data.model,
        systemPrompt: parsed.data.systemPrompt,
        temperature: parsed.data.temperature
      });
      return res.status(result.failed ? 500 : 200).json({
        status_code: result.failed ? 500 : 200,
        endpoint: "run_daily_endpoint_tests",
        method: "POST",
        request_id: `daily_${Date.now()}`,
        provider: parsed.data.provider ?? process.env.DEFAULT_PROVIDER ?? "gemini",
        model: parsed.data.model ?? process.env.DEFAULT_MODEL ?? "default",
        message: result.failed ? "Daily tests failed" : "Daily tests passed",
        data: result,
        errors: result.failed ? result.results.filter((r) => !r.passed) : [],
        meta: {}
      });
    }

    const output = await runPromptApi(parsed.data);
    return res.status(output.status_code >= 100 && output.status_code < 600 ? output.status_code : 200).json(output);
  } catch (error) {
    return res.status(500).json({
      status_code: 500,
      endpoint: null,
      method: "POST",
      request_id: `err_${Date.now()}`,
      provider: parsed.data.provider ?? process.env.DEFAULT_PROVIDER ?? "unknown",
      model: parsed.data.model ?? process.env.DEFAULT_MODEL ?? "unknown",
      message: "Runtime error",
      data: null,
      errors: [{ message: error instanceof Error ? error.message : String(error) }],
      meta: {}
    });
  }
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`PromptAPI Runtime running on http://localhost:${port}/api/chat`);
});
