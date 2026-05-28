import "dotenv/config";
import { runDailyTests } from "../src/core/dailyTests.js";

const provider = process.env.DEFAULT_PROVIDER as any;
const model = process.env.DEFAULT_MODEL;

const result = await runDailyTests({ provider, model });
console.log(JSON.stringify(result, null, 2));
process.exit(result.failed ? 1 : 0);
