import type { LLMProvider, ProviderName } from "../types/index.js";
import { AnthropicProvider } from "./anthropic.js";
import { GeminiProvider } from "./gemini.js";
import { MistralProvider } from "./mistral.js";
import { OpenAIProvider } from "./openai.js";
import { OpenAICompatibleProvider } from "./openaiCompatible.js";

export function createProvider(provider: ProviderName): LLMProvider {
  switch (provider) {
    case "openai": return new OpenAIProvider();
    case "gemini": return new GeminiProvider();
    case "anthropic": return new AnthropicProvider();
    case "mistral": return new MistralProvider();
    case "openai-compatible": return new OpenAICompatibleProvider();
    default: throw new Error(`Unsupported provider: ${provider}`);
  }
}
