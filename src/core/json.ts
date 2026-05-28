export function safeJsonParse<T = any>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try { return JSON.parse(text.slice(start, end + 1)) as T; } catch { return null; }
    }
    return null;
  }
}

export function stableRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
