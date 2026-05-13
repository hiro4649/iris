import { ContractError } from "../../core/contracts.js";

const STRATEGY_KINDS = new Set([
  "stream_title",
  "thumbnail",
  "clip",
  "topic_suggestion",
  "collaboration",
]);

const PLAN_FIELDS = new Set([
  "schema",
  "candidate_kind",
  "strategy_kind",
  "requires_review",
  "publish_allowed",
  "time_bucket",
  "safe_label",
  "safe_summary",
  "boundary_policy",
]);

const BOUNDARY_FIELDS = [
  "summary_candidate_only",
  "no_direct_publish",
  "no_obs_mutation",
  "no_youtube_metadata_mutation",
  "no_schedule_mutation",
  "no_raw_comments",
  "no_raw_support_text",
  "no_private_ids",
  "no_raw_frames",
  "no_raw_chat",
  "no_raw_audio",
  "no_candidate_payload",
  "no_private_contact",
  "no_raw_negotiation",
  "no_raw_channel_tokens",
  "no_commands",
];

const FORBIDDEN_FIELDS = new Set([
  "world_command",
  "command",
  "execute",
  "commit",
  "write",
  "apply",
  "obs_metadata",
  "youtube_metadata",
  "youtube_schedule",
  "schedule_update",
  "publish_now",
  "raw_comment",
  "raw_comments",
  "raw_support",
  "raw_support_text",
  "raw_frame",
  "raw_frames",
  "raw_chat",
  "raw_audio",
  "candidate_payload",
  "private_id",
  "private_ids",
  "private_viewer_id",
  "private_contact",
  "raw_negotiation",
  "raw_channel_token",
]);

const UNSAFE_SUMMARY_PATTERN =
  /\b(raw[_ -]?comment|raw[_ -]?support|support[_ -]?text|raw[_ -]?frame|raw[_ -]?chat|raw[_ -]?audio|candidate[_ -]?payload|private[_ -]?(?:viewer[_ -]?)?id|private[-_ ]?viewer[-_ ][a-z0-9-]+|private_user|viewer_private_id|private[_ -]?viewer[_ -]?data|private[_ -]?contact|raw[_ -]?negotiation|raw[_ -]?channel[_ -]?token)\b/gi;

export function createContentStrategyCandidate({
  strategyKind = "topic_suggestion",
  summary = "",
  timeBucket = null,
  safeLabel = null,
} = {}) {
  const normalizedStrategyKind = STRATEGY_KINDS.has(strategyKind) ? strategyKind : "topic_suggestion";
  const candidate = {
    schema: "iris_content_strategy_candidate_v1",
    candidate_kind: "content_strategy_candidate",
    strategy_kind: normalizedStrategyKind,
    requires_review: true,
    publish_allowed: false,
    time_bucket: normalizedStrategyKind === "clip" ? safeTimeBucket(timeBucket) : null,
    safe_label: normalizedStrategyKind === "clip" ? safeToken(safeLabel, "clip_candidate") : null,
    safe_summary: safeSummary(summary),
    boundary_policy: Object.fromEntries(BOUNDARY_FIELDS.map((field) => [field, true])),
  };
  assertContentStrategyCandidateSafe(candidate);
  return candidate;
}

export function assertContentStrategyCandidateSafe(
  candidate,
  context = "content strategy candidate"
) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new ContractError(`${context}: candidate required`);
  }
  assertNoForbiddenFields(candidate, context);
  if (candidate.schema !== "iris_content_strategy_candidate_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(candidate)) {
    if (!PLAN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (candidate.candidate_kind !== "content_strategy_candidate") {
    throw new ContractError(`${context}: invalid candidate kind`);
  }
  if (!STRATEGY_KINDS.has(candidate.strategy_kind)) {
    throw new ContractError(`${context}: invalid strategy kind`);
  }
  if (candidate.requires_review !== true || candidate.publish_allowed !== false) {
    throw new ContractError(`${context}: strategy must remain review-only`);
  }
  if (candidate.strategy_kind === "clip") {
    if (
      typeof candidate.time_bucket !== "string" ||
      !/^[a-z0-9_]{1,40}$/.test(candidate.time_bucket) ||
      typeof candidate.safe_label !== "string" ||
      !/^[a-z0-9_]{1,40}$/.test(candidate.safe_label)
    ) {
      throw new ContractError(`${context}: invalid clip safe fields`);
    }
  } else if (candidate.time_bucket !== null || candidate.safe_label !== null) {
    throw new ContractError(`${context}: non-clip safe fields must be null`);
  }
  if (typeof candidate.safe_summary !== "string" || UNSAFE_SUMMARY_PATTERN.test(candidate.safe_summary)) {
    throw new ContractError(`${context}: unsafe summary`);
  }
  assertBoundaryPolicy(candidate.boundary_policy, context);
}

function safeSummary(value) {
  return String(value ?? "")
    .replace(UNSAFE_SUMMARY_PATTERN, "[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function safeTimeBucket(value) {
  return safeToken(value, "unbucketed");
}

function safeToken(value, fallback) {
  const token = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return token || fallback;
}

function assertBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowed = new Set(BOUNDARY_FIELDS);
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertNoForbiddenFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenFields(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_FIELDS.has(field)) {
      throw new ContractError(`${context}: direct publish or metadata mutation is forbidden`, {
        field,
        path,
      });
    }
    assertNoForbiddenFields(child, context, `${path}.${field}`);
  }
}
