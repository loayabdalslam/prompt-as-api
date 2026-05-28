# PromptAPI Runtime

**PromptAPI Runtime** is a high-level JavaScript/TypeScript framework for building an **LLM-as-API server** from a user-supplied `systemPrompt`.

The framework exposes one server endpoint:

```http
POST /api/chat
```

The user sends:

- `systemPrompt`: the endpoint registry and API behavior contract
- `provider`: `gemini`, `openai`, `anthropic`, `mistral`, or `openai-compatible`
- `model`: provider model name
- `message`: natural-language API request

The runtime lets the model call tools, especially Prisma-backed database tools, then returns a JSON response with `status_code`.

---

## Architecture

```text
User / Client
  ↓
POST /api/chat
  ↓
PromptAPI Runtime
  ↓
Provider Adapter: Gemini / OpenAI / Anthropic / Mistral / OpenAI-compatible
  ↓
Tool Calling
  ↓
Prisma Database Tools
  ↓
Strict JSON API-style response
```

The system prompt acts as the **server contract**:

- endpoint registry
- validation rules
- required fields
- status code behavior
- database tool behavior
- daily testing behavior

The backend remains the **execution authority**:

- Prisma saves and retrieves records
- tools execute outside the model
- audit logs are persisted
- daily tests are stored

---

## Supported providers

| Provider | Adapter | Env var |
|---|---|---|
| Google Gemini | `gemini` | `GEMINI_API_KEY` |
| OpenAI | `openai` | `OPENAI_API_KEY` |
| Anthropic Claude | `anthropic` | `ANTHROPIC_API_KEY` |
| Mistral | `mistral` | `MISTRAL_API_KEY` |
| OpenAI-compatible providers | `openai-compatible` | `OPENAI_COMPATIBLE_API_KEY`, `OPENAI_COMPATIBLE_BASE_URL` |

Use `openai-compatible` for providers that expose OpenAI-compatible chat completions with tools.

---

## Install

```bash
npm install
cp .env.example .env
```

Fill your `.env`:

```bash
DATABASE_URL="file:./dev.db"
DEFAULT_PROVIDER=gemini
DEFAULT_MODEL=gemini-2.5-flash
GEMINI_API_KEY=your_key_here
```

Initialize Prisma:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Start the server:

```bash
npm run dev
```

---

## One endpoint usage

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gemini",
    "model": "gemini-2.5-flash",
    "message": "Create customer c_100 named Loai Abdalslam with email loaiabdalslam@gmail.com"
  }'
```

Example response:

```json
{
  "status_code": 201,
  "endpoint": "create_customer",
  "method": "POST",
  "request_id": "req_...",
  "provider": "gemini",
  "model": "gemini-2.5-flash",
  "message": "Customer created successfully",
  "data": {
    "customer_id": "c_100",
    "name": "Loai Abdalslam",
    "email": "loaiabdalslam@gmail.com"
  },
  "errors": [],
  "meta": {
    "tool_calls_count": 1
  }
}
```

---

## Request schema

```ts
type ChatRequest = {
  message: string;
  systemPrompt?: string;
  provider?: "openai" | "gemini" | "anthropic" | "mistral" | "openai-compatible";
  model?: string;
  temperature?: number;
  mode?: "chat" | "daily_test";
  metadata?: Record<string, unknown>;
};
```

---

## Built-in Prisma tools

The model can call these tools:

```text
db_create_record(namespace, key, value)
db_get_record(namespace, key)
db_search_records(namespace, query?, limit?)
db_update_record(namespace, key, patch)
db_delete_record(namespace, key)
```

These tools are intentionally generic, so any system prompt can define its own logical endpoints over the same persistence layer.

---

## Daily endpoint tests

Run from HTTP:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "gemini",
    "model": "gemini-2.5-flash",
    "mode": "daily_test",
    "message": "run daily endpoint tests"
  }'
```

Or from CLI:

```bash
npm run daily:test
```

Daily test results are saved to Prisma model `DailyTestRun`.

---

## Custom system prompt

Send your own system prompt in the request:

```json
{
  "provider": "gemini",
  "model": "gemini-2.5-flash",
  "systemPrompt": "You are my API server... Endpoints: ... Tools: ...",
  "message": "Create supplier medicine..."
}
```

See:

```text
examples/custom-system.prompt.txt
```

---

## Recommended system prompt structure

```text
You are a System-Prompt-Defined API Server.
Return strict JSON only.

Global response schema:
{ status_code, endpoint, method, message, data, errors, meta }

Tools:
- db_create_record
- db_get_record
- db_search_records
- db_update_record
- db_delete_record

Endpoints:
1. create_customer
Method: POST
Required: customer_id, name
Database: Save namespace customers using customer_id as key.
Success: 201

Rules:
- Use tools before final answer.
- Never claim saved unless tool result ok=true.
```

---

## Notes

- The system prompt is not literally a network server. It is the **API contract and routing brain**.
- The Node.js runtime is the actual server.
- The model selects endpoints and calls tools.
- Prisma performs database execution.
- The framework returns API-style JSON responses.

---

## Production checklist

Before production, add:

- authentication
- tenant isolation
- tool permission policies
- rate limiting
- request signing
- stronger JSON-schema validation per endpoint
- provider retry logic
- observability dashboards
- prompt injection hardening
- backup database, e.g. PostgreSQL instead of SQLite

---

## License

MIT
