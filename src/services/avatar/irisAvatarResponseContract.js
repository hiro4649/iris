import { ContractError, assertNoWorldCommand } from "../../core/contracts.js";

const AVATAR_RESPONSE_SCHEMA = "iris_avatar_response_v1";
const PUBLIC_FORBIDDEN_FIELDS = new Set([
  "inner_intent",
  "world_command",
  "input_action",
  "input_action_candidate",
  "relationship_update_candidate",
  "memory_candidate",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "approved_game_input_action",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "commit_memory",
]);

export function createIrisAvatarResponse({
  speech = null,
  emotion = "neutral",
  facial_expression = "neutral_warm",
  gesture = "none",
  gaze = "audience_soft",
  voice_tone = "warm",
  memory_reference = null,
  confidence = 0.5,
  inner_intent = null,
  silent = false,
  speech_source = null,
} = {}) {
  const response = {
    schema: AVATAR_RESPONSE_SCHEMA,
    internal_profile: true,
    speech,
    emotion,
    facial_expression,
    gesture,
    gaze,
    voice_tone,
    memory_reference,
    confidence,
    inner_intent,
    silent,
    speech_source,
    adapter_validation_required: true,
  };
  assertIrisAvatarResponseContract(response, "IRIS avatar response");
  return response;
}

export function assertIrisAvatarResponseContract(response, context = "IRIS avatar response") {
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    throw new ContractError(`${context}: response object is required`);
  }
  assertNoWorldCommand(response, context);
  if (response.schema !== AVATAR_RESPONSE_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`, { schema: response.schema });
  }
  if (response.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (response.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  assertNullableString(response.speech, `${context}: speech`);
  assertNullableString(response.inner_intent, `${context}: inner_intent`);
  assertNullableString(response.memory_reference, `${context}: memory_reference`);
  assertBoundedConfidence(response.confidence, context);
  if (response.silent === true && hasText(response.speech) && response.speech_source !== "provided_final_output") {
    throw new ContractError(`${context}: silent output must not synthesize speech`);
  }
}

export function toPublicIrisAvatarResponse(response, context = "IRIS avatar public projection") {
  assertIrisAvatarResponseContract(response, context);
  const publicResponse = deepCloneWithoutInnerIntent(response);
  assertPublicIrisAvatarProjection(publicResponse, context);
  return publicResponse;
}

export function assertPublicIrisAvatarProjection(publicResponse, context = "IRIS avatar public projection") {
  if (!publicResponse || typeof publicResponse !== "object" || Array.isArray(publicResponse)) {
    throw new ContractError(`${context}: public response object is required`);
  }
  assertNoForbiddenPublicFields(publicResponse, context);
}

function deepCloneWithoutInnerIntent(value) {
  if (Array.isArray(value)) {
    return value.map((item) => deepCloneWithoutInnerIntent(item));
  }
  if (!value || typeof value !== "object") return value;
  const clone = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === "inner_intent") continue;
    clone[key] = deepCloneWithoutInnerIntent(child);
  }
  return clone;
}

function assertNoForbiddenPublicFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenPublicFields(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (PUBLIC_FORBIDDEN_FIELDS.has(field)) {
      throw new ContractError(`${context}: public projection contains forbidden field`, {
        field,
        path,
      });
    }
    assertNoForbiddenPublicFields(child, context, `${path}.${field}`);
  }
}

function assertNullableString(value, context) {
  if (value === null || value === undefined) return;
  if (typeof value !== "string") {
    throw new ContractError(`${context}: expected string or null`);
  }
}

function assertBoundedConfidence(value, context) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 1) {
    throw new ContractError(`${context}: confidence must be between 0 and 1`, { confidence: value });
  }
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}
