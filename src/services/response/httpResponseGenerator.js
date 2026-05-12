import { ContractError } from "../../core/contracts.js";

const FORBIDDEN_HTTP_RESPONSE_FIELDS = new Set([
  "world_command",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "commit_memory",
  "relationship_update_candidate",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "approved_memory_record",
  "approved_relationship_record",
  "selected_memory_ids",
]);

export function createHttpResponseGenerator(config = {}) {
  const endpoint = config.endpoint ?? process.env.IRIS_RESPONSE_ENDPOINT;
  const apiKey = config.apiKey ?? process.env.IRIS_RESPONSE_API_KEY;
  const model = config.model ?? process.env.IRIS_RESPONSE_MODEL ?? "iris-default";
  const timeoutMs = normalizeTimeoutMs(
    config.timeoutMs ?? process.env.IRIS_RESPONSE_TIMEOUT_MS,
    15000
  );

  if (!endpoint) {
    throw new ContractError("HTTP response generator requires IRIS_RESPONSE_ENDPOINT");
  }

  return {
    name: "http",
    async generate(input) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const promptInput = buildPromptInput(input);
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({
            model,
            input: promptInput,
            messages: buildPromptMessages(promptInput),
            metadata: {
              phase: "response_draft",
              trace_id: input?.trace_id,
              event_id: input?.event_id,
            },
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new ContractError("HTTP response generator request failed", {
            status: response.status,
          });
        }

        const data = await response.json();
        assertNoForbiddenHttpResponseFields(data, "HTTP response generator payload");
        const text = extractText(data);
        const metadata = extractResponseMetadata(data);
        if (!text) {
          throw new ContractError("HTTP response generator returned empty text");
        }

        return {
          source: "http_response_generator",
          text,
          provider: metadata.provider || "generic_http",
          model: metadata.model || model,
        };
      } catch (error) {
        if (error instanceof ContractError) throw error;
        throw new ContractError("HTTP response generator request failed", {
          error_kind: classifyRequestError(error),
        });
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

function assertNoForbiddenHttpResponseFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenHttpResponseFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_HTTP_RESPONSE_FIELDS.has(field)) {
      throw new ContractError(`${context}: response must not contain side-effect fields`, {
        field,
        path,
      });
    }
    assertNoForbiddenHttpResponseFields(child, context, `${path}.${field}`);
  }
}

function buildPromptInput(input = {}) {
  const promptInput = {
    role: "IRIS",
    trace_id: input.trace_id ?? null,
    event_id: input.event_id ?? null,
    constraints: [
      "Keep Phase00 canonical boundaries.",
      "Do not emit world_command.",
      "Do not claim memory was committed.",
      "Follow the provided IRIS persona summary without turning it into canonical state.",
      "Return only the response text.",
    ],
    commentText: input.commentText ?? "",
    requestedLanguage: input.requestedLanguage ?? null,
    detectedLanguage: input.detectedLanguage ?? null,
    responseLanguageHint: input.responseLanguageHint ?? null,
    payloadKind: input.payloadKind ?? null,
    displayName: input.displayName ?? null,
    intent: input.intent,
    emotion: input.emotion,
    tone: input.tone,
    character_tag: input.character_tag,
    goal: input.phase08_primary_goal,
    strategy: input.strategy_mode,
    recentMemorySummary: input.recentMemorySummary ?? "",
    viewerRelationshipSummary: input.viewerRelationshipSummary ?? null,
    gameStateSummary: input.gameStateSummary ?? null,
    externalTopicSummary: input.externalTopicSummary ?? null,
    affectSnapshot: summarizeAffectSnapshot(input.affectSnapshot),
    personaProfileSummary: input.personaProfileSummary ?? "",
    contextBoundary: {
      summary_only_context: true,
      no_raw_candidates: true,
      no_direct_memory_commit: true,
      no_game_input_authority: true,
      no_adapter_authority: true,
    },
  };
  assertNoForbiddenHttpResponseFields(promptInput, "HTTP response generator prompt input");
  return promptInput;
}

function buildPromptMessages(promptInput) {
  return [
    {
      role: "system",
      content: [
        "You are IRIS.",
        ...promptInput.constraints,
        "Reply with text only.",
      ].join("\n"),
    },
    {
      role: "user",
      content: JSON.stringify({
        commentText: promptInput.commentText,
        trace_id: promptInput.trace_id,
        event_id: promptInput.event_id,
        requestedLanguage: promptInput.requestedLanguage,
        detectedLanguage: promptInput.detectedLanguage,
        responseLanguageHint: promptInput.responseLanguageHint,
        payloadKind: promptInput.payloadKind,
        displayName: promptInput.displayName,
        intent: promptInput.intent,
        emotion: promptInput.emotion,
        tone: promptInput.tone,
        character_tag: promptInput.character_tag,
        goal: promptInput.goal,
        strategy: promptInput.strategy,
        recentMemorySummary: promptInput.recentMemorySummary,
        viewerRelationshipSummary: promptInput.viewerRelationshipSummary,
        gameStateSummary: promptInput.gameStateSummary,
        externalTopicSummary: promptInput.externalTopicSummary,
        affectSnapshot: promptInput.affectSnapshot,
        personaProfileSummary: promptInput.personaProfileSummary,
      }),
    },
  ];
}

function summarizeAffectSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  return {
    schema: snapshot.schema ?? "iris_affect_snapshot_v1",
    energy: safeNumber(snapshot.energy),
    amusement: safeNumber(snapshot.amusement),
    focus: safeNumber(snapshot.focus),
    warmth: safeNumber(snapshot.warmth),
    affect_label: snapshot.affect_label ?? null,
    last_trigger: snapshot.last_trigger ?? null,
  };
}

function safeNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  if (number < 0) return 0;
  if (number > 1) return 1;
  return Number(number.toFixed(4));
}

function normalizeTimeoutMs(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.max(1000, Math.min(120000, Math.trunc(number)));
}

function classifyRequestError(error) {
  if (error?.name === "AbortError") return "timeout";
  return "request_error";
}

function extractText(data) {
  if (typeof data?.text === "string") return data.text.trim();
  if (typeof data?.output_text === "string") return data.output_text.trim();
  if (typeof data?.outputText === "string") return data.outputText.trim();
  if (typeof data?.message === "string") return data.message.trim();
  if (typeof data?.response === "string") return data.response.trim();
  if (typeof data?.reply === "string") return data.reply.trim();
  if (typeof data?.completion === "string") return data.completion.trim();
  if (data?.data && typeof data.data === "object") {
    const nested = extractText(data.data);
    if (nested) return nested;
  }
  if (data?.result && typeof data.result === "object") {
    const nested = extractText(data.result);
    if (nested) return nested;
  }
  if (data?.output && typeof data.output === "string") return data.output.trim();
  if (Array.isArray(data?.output)) {
    const outputText = data.output.map(extractOutputItemText).filter(Boolean).join("\n").trim();
    if (outputText) return outputText;
  }
  if (Array.isArray(data?.choices)) {
    const choiceText = data.choices.map(extractChoiceText).filter(Boolean).join("\n").trim();
    if (choiceText) return choiceText;
  }
  return "";
}

function extractResponseMetadata(data) {
  if (!data || typeof data !== "object") return {};
  const provider = firstString(data.provider, data.provider_name, data.providerName);
  const responseModel = firstString(
    data.model,
    data.model_name,
    data.modelName,
    data.response_model,
    data.responseModel
  );
  if (provider || responseModel) return { provider, model: responseModel };

  for (const field of ["data", "result", "output", "response"]) {
    const nested = data[field];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const metadata = extractResponseMetadata(nested);
      if (metadata.provider || metadata.model) return metadata;
    }
  }

  if (Array.isArray(data.choices)) {
    for (const choice of data.choices) {
      const metadata = extractResponseMetadata(choice);
      if (metadata.provider || metadata.model) return metadata;
    }
  }
  return {};
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 120);
  }
  return "";
}

function extractChoiceText(choice) {
  if (!choice || typeof choice !== "object") return "";
  if (typeof choice.text === "string") return choice.text.trim();
  if (typeof choice.output_text === "string") return choice.output_text.trim();
  if (typeof choice.message?.content === "string") return choice.message.content.trim();
  if (Array.isArray(choice.message?.content)) {
    return choice.message.content.map(extractOutputItemText).filter(Boolean).join("\n").trim();
  }
  if (typeof choice.delta?.content === "string") return choice.delta.content.trim();
  return "";
}

function extractOutputItemText(item) {
  if (typeof item === "string") return item.trim();
  if (!item || typeof item !== "object") return "";
  if (typeof item.text === "string") return item.text.trim();
  if (typeof item.output_text === "string") return item.output_text.trim();
  if (typeof item.outputText === "string") return item.outputText.trim();
  if (typeof item.content === "string") return item.content.trim();
  if (typeof item.message === "string") return item.message.trim();
  if (Array.isArray(item.content)) {
    return item.content.map(extractOutputItemText).filter(Boolean).join("\n").trim();
  }
  return "";
}
