import { ContractError } from "../../core/contracts.js";
import { createHttpResponseGenerator } from "./httpResponseGenerator.js";
import { createMockResponseGenerator } from "./mockResponseGenerator.js";

export function createResponseGeneratorFromEnv(env = process.env) {
  const provider = normalizeResponseProvider(
    env.IRIS_RESPONSE_PROVIDER ?? (env.IRIS_RESPONSE_ENDPOINT ? "http" : "mock")
  );
  if (provider === "mock") {
    if (env.IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS === "true") {
      throw new ContractError("response provider must be real for live runtime", {
        provider,
      });
    }
    return createMockResponseGenerator();
  }
  if (provider === "http") {
    return createHttpResponseGenerator({
      endpoint: env.IRIS_RESPONSE_ENDPOINT,
      apiKey: env.IRIS_RESPONSE_API_KEY,
      model: env.IRIS_RESPONSE_MODEL,
      timeoutMs: env.IRIS_RESPONSE_TIMEOUT_MS ? Number(env.IRIS_RESPONSE_TIMEOUT_MS) : undefined,
    });
  }
  throw new ContractError("unsupported response provider", { provider });
}

function normalizeResponseProvider(provider) {
  const normalized = String(provider ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, "_");
  if (["mock", "local_mock", "dev_mock"].includes(normalized)) return "mock";
  if (
    [
      "http",
      "https",
      "llm",
      "openai",
      "anthropic",
      "gemini",
      "google",
      "azure_openai",
      "azure-openai",
      "external",
      "external_http",
      "local_bridge",
      "local-bridge",
      "bridge",
    ].includes(normalized)
  ) {
    return "http";
  }
  return normalized;
}

export async function generateResponseDraft(input, runtime = {}) {
  const generator =
    runtime.responseGenerator ?? runtime.responseProvider ?? createResponseGeneratorFromEnv(runtime.env);
  const draft = await generator.generate(input);
  validateResponseDraft(draft);
  return draft;
}

export function validateResponseDraft(draft) {
  if (!draft || typeof draft !== "object") {
    throw new ContractError("response draft must be an object");
  }
  if (typeof draft.text !== "string" || !draft.text.trim()) {
    throw new ContractError("response draft text is required");
  }
  if (Object.prototype.hasOwnProperty.call(draft, "world_command")) {
    throw new ContractError("response draft must not include world_command");
  }
  for (const forbidden of ["commit", "write", "execute", "apply"]) {
    if (Object.prototype.hasOwnProperty.call(draft, forbidden)) {
      throw new ContractError("response draft must not carry execution methods", { forbidden });
    }
  }
}
