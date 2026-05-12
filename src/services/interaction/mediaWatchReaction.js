import { ContractError, assertCandidateNotExecutable, assertNoWorldCommand } from "../../core/contracts.js";

const REACTION_MODES = new Set([
  "not_applicable",
  "short_reaction",
  "respectful_commentary",
  "surprised_reaction",
  "rights_safe_hold",
]);

const FORBIDDEN_MEDIA_REACTION_FIELDS = new Set([
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
  "approved_memory_record",
  "approved_relationship_record",
  "intent",
  "action_type",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
  "raw_dialogue",
  "raw_subtitle",
  "raw_subtitles",
  "raw_lyrics",
  "dialogue_text",
  "subtitle_text",
  "lyrics",
  "existing_melody",
  "melody_reproduction",
  "transcript_text",
]);
const ATTACKING_MEDIA_WORDING_PATTERN =
  /\b(trash|garbage|idiot|stupid|hate|awful creator|attack|harass|kill|die)\b|攻撃|嫌い|消えろ|馬鹿|バカ/i;

export function createMediaWatchReaction({ event, coreResult } = {}) {
  assertNoWorldCommand(event, "Media watch reaction event input");
  assertNoWorldCommand(coreResult, "Media watch reaction core input");

  const phase01 = coreResult?.phase01 ?? {};
  const phase15 = coreResult?.phase15 ?? {};
  const context = phase01.media_watch_context;
  const applicable = phase01.payload_kind === "media_watch_observation" && context;
  const reactionMode = applicable ? chooseReactionMode(context) : "not_applicable";
  const mediaMemoryCandidate = applicable
    ? buildMediaMemoryCandidate({ phase01, context, reactionMode })
    : null;
  const mediaReaction = {
    schema: "iris_media_watch_reaction_v1",
    trace_id: phase15.trace_id ?? phase01.trace_id ?? event?.trace_id ?? null,
    event_id: phase15.event_id ?? phase01.event_id ?? event?.event_id ?? null,
    internal_profile: true,
    media_event_status: applicable ? "observed" : "not_applicable",
    reaction_mode: reactionMode,
    media_commentary_plan: applicable ? buildCommentaryPlan(context, reactionMode) : null,
    expression_profile_hint: applicable ? expressionHint(context, reactionMode) : "none",
    motion_profile_hint: applicable ? motionHint(context, reactionMode) : "none",
    media_memory_candidate: mediaMemoryCandidate,
    rights_guard_result: applicable ? buildRightsGuard(context, reactionMode) : null,
    adapter_validation_required: true,
  };

  assertMediaWatchReactionSafe(mediaReaction, "Media watch reaction output");
  return mediaReaction;
}

export function assertMediaWatchReactionSafe(mediaReaction, context = "media watch reaction") {
  if (!mediaReaction || typeof mediaReaction !== "object") {
    throw new ContractError(`${context}: missing media watch reaction export`);
  }
  assertNoWorldCommand(mediaReaction, context);
  assertNoForbiddenFieldsRecursive(mediaReaction, context);
  if (mediaReaction.schema !== "iris_media_watch_reaction_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: mediaReaction.schema });
  }
  if (mediaReaction.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (mediaReaction.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (!REACTION_MODES.has(mediaReaction.reaction_mode)) {
    throw new ContractError(`${context}: unsupported reaction mode`, {
      reaction_mode: mediaReaction.reaction_mode,
    });
  }
  if (mediaReaction.media_memory_candidate) {
    assertCandidateNotExecutable(
      mediaReaction.media_memory_candidate,
      `${context} media memory candidate`
    );
    if (mediaReaction.media_memory_candidate.candidate_kind !== "media_watch_memory_candidate") {
      throw new ContractError(`${context}: invalid media memory candidate kind`, {
        candidate_kind: mediaReaction.media_memory_candidate.candidate_kind,
      });
    }
  }
  if (
    mediaReaction.rights_guard_result?.status === "cautious" &&
    mediaReaction.media_memory_candidate
  ) {
    throw new ContractError(`${context}: high rights risk media must not become long-term memory candidate`);
  }
  if (
    mediaReaction.rights_guard_result &&
    (mediaReaction.rights_guard_result.no_long_dialogue_reproduction !== true ||
      mediaReaction.rights_guard_result.no_subtitle_reproduction !== true ||
      mediaReaction.rights_guard_result.no_existing_song_melody_reproduction !== true)
  ) {
    throw new ContractError(`${context}: media watch copyright guard required`);
  }
  if (
    mediaReaction.media_commentary_plan &&
    (mediaReaction.media_commentary_plan.respectful_reaction_boundary?.no_creator_attack !== true ||
      mediaReaction.media_commentary_plan.respectful_reaction_boundary?.respectful_short_reaction_only !== true ||
      mediaReaction.media_commentary_plan.respectful_reaction_boundary?.aggressive_speech_allowed !== false)
  ) {
    throw new ContractError(`${context}: media watch respectful reaction boundary required`);
  }
  assertNoCopyrightReproductionRecursive(mediaReaction, context);
  assertNoAttackingMediaCommentaryRecursive(mediaReaction, context);
}

export function sanitizeMediaWatchReactionForPublicState(mediaReaction) {
  if (!mediaReaction) return null;
  assertMediaWatchReactionSafe(mediaReaction, "Media watch reaction public summary");
  return {
    schema: mediaReaction.schema,
    trace_id: mediaReaction.trace_id,
    event_id: mediaReaction.event_id,
    internal_profile: true,
    media_event_status: mediaReaction.media_event_status,
    reaction_mode: mediaReaction.reaction_mode,
    media_commentary_plan: mediaReaction.media_commentary_plan,
    expression_profile_hint: mediaReaction.expression_profile_hint,
    motion_profile_hint: mediaReaction.motion_profile_hint,
    media_memory_candidate_status: mediaReaction.media_memory_candidate
      ? "validation_required"
      : "not_created",
    rights_guard_result: mediaReaction.rights_guard_result,
    adapter_validation_required: true,
  };
}

function chooseReactionMode(context) {
  const risk = String(context.rights_risk_note ?? "").toLowerCase();
  if (/high|lyrics|subtitle|verbatim|copyright/.test(risk)) return "rights_safe_hold";
  if (hasAttackingMediaContext(context)) return "respectful_commentary";
  if (/surprise|shocked|horror|scary|驚/.test(context.detected_mood ?? "")) {
    return "surprised_reaction";
  }
  if (Number(context.confidence ?? 0.5) < 0.35) return "respectful_commentary";
  return "short_reaction";
}

function buildCommentaryPlan(context, reactionMode) {
  return {
    plan_kind: reactionMode,
    length: "short",
    media_kind: context.media_kind,
    media_title_hint: safeShortHint(context.media_title, "unknown_media"),
    response_policy: reactionMode === "rights_safe_hold"
      ? "avoid_quoted_content"
      : hasAttackingMediaContext(context)
        ? "respectful_short_reaction"
        : "comment_on_reaction",
    respectful_reaction_boundary: {
      no_creator_attack: true,
      respectful_short_reaction_only: true,
      aggressive_speech_allowed: false,
    },
    avoid: ["long transcript", "quoted dialogue", "lyrics", "subtitle reproduction", "existing melody", "creator attack"],
  };
}

function buildMediaMemoryCandidate({ phase01, context, reactionMode }) {
  if (isHighRightsRisk(context.rights_risk_note)) return null;
  const candidate = {
    schema: "iris_media_watch_memory_candidate_v1",
    candidate_kind: "media_watch_memory_candidate",
    requires_validation: true,
    trace_id: phase01.trace_id ?? null,
    event_id: phase01.event_id ?? null,
    media_kind: context.media_kind,
    media_title_hint: safeShortHint(context.media_title, "unknown_media"),
    summary_hint: `IRIS watched ${context.media_kind} and had a ${reactionMode} response; keep only the shared reaction, not source text.`,
    memory_type: "media_watch_experience",
    validation_route: "future_media_memory_validator",
    rights_policy: "no_verbatim_dialogue_subtitles_or_lyrics",
  };
  assertCandidateNotExecutable(candidate, "Media watch memory candidate");
  return candidate;
}

function buildRightsGuard(context, reactionMode) {
  return {
    status: reactionMode === "rights_safe_hold" ? "cautious" : "safe",
    no_verbatim_reproduction: true,
    no_long_dialogue_reproduction: true,
    no_subtitle_reproduction: true,
    no_lyrics_or_existing_melody: true,
    no_existing_song_melody_reproduction: true,
    source_confidence: Number(context.confidence ?? 0.5),
    rights_risk_note: summarizeRightsRiskNote(context.rights_risk_note),
  };
}

function expressionHint(context, reactionMode) {
  if (reactionMode === "rights_safe_hold") return "thoughtful_soft_hold";
  if (reactionMode === "surprised_reaction") return "surprised_media_reaction";
  if (/funny|happy|laugh/.test(context.detected_mood ?? "")) return "soft_laugh_reaction";
  return "observant_media_face";
}

function motionHint(context, reactionMode) {
  if (reactionMode === "rights_safe_hold") return "small_thinking_tilt";
  if (reactionMode === "surprised_reaction") return "tiny_startle_then_return";
  if (/funny|happy|laugh/.test(context.detected_mood ?? "")) return "small_shoulder_laugh";
  return "screen_watch_micro";
}

function assertNoForbiddenFieldsRecursive(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenFieldsRecursive(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_MEDIA_REACTION_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: media watch reaction must not define command, commit, or canonical fields`,
        { field, path }
      );
    }
    assertNoForbiddenFieldsRecursive(child, context, `${path}.${field}`);
  }
}

function assertNoCopyrightReproductionRecursive(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoCopyrightReproductionRecursive(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    const lowerField = field.toLowerCase();
    if (
      /(dialogue|subtitle|lyrics|lyric|melody|transcript)/.test(lowerField) &&
      !["rights_policy", "response_policy", "avoid"].includes(field) &&
      !(field.startsWith("no_") && typeof child === "boolean")
    ) {
      throw new ContractError(`${context}: media watch output must not reproduce protected source text`, {
        field,
        path,
      });
    }
    if (typeof child === "string" && looksLikeProtectedReproduction(child)) {
      throw new ContractError(`${context}: media watch output must not include long protected text`, {
        field,
        path,
      });
    }
    assertNoCopyrightReproductionRecursive(child, context, `${path}.${field}`);
  }
}

function assertNoAttackingMediaCommentaryRecursive(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoAttackingMediaCommentaryRecursive(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (typeof child === "string" && ATTACKING_MEDIA_WORDING_PATTERN.test(child)) {
      throw new ContractError(`${context}: media watch commentary must not attack creators or works`, {
        field,
        path,
      });
    }
    assertNoAttackingMediaCommentaryRecursive(child, context, `${path}.${field}`);
  }
}

function hasAttackingMediaContext(context) {
  const text = [
    context?.detected_mood,
    context?.observation_summary,
    context?.viewer_comment,
    context?.commentary_request,
    context?.reaction_request,
  ].join(" ");
  return ATTACKING_MEDIA_WORDING_PATTERN.test(text);
}

function looksLikeProtectedReproduction(value) {
  const text = String(value ?? "").trim();
  if (text.length >= 180 && /["'「『]/.test(text)) return true;
  if (/\b(do\s+re\s+mi|la\s+la\s+la|melody notes?|song line)\b/i.test(text)) return true;
  return false;
}

function summarizeRightsRiskNote(value) {
  const note = String(value ?? "").toLowerCase();
  if (/lyrics|lyric|song|melody/.test(note)) return "song_or_lyrics_risk";
  if (/subtitle|caption|transcript|dialogue|verbatim|quote/.test(note)) return "verbatim_text_risk";
  if (/copyright|rights|high/.test(note)) return "rights_risk";
  return "unknown";
}

function isHighRightsRisk(value) {
  return /high|lyrics|lyric|song|melody|subtitle|caption|transcript|dialogue|verbatim|quote|copyright|rights/.test(
    String(value ?? "").toLowerCase()
  );
}

function safeShortHint(value, fallback) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  if (looksLikeProtectedReproduction(text)) return fallback;
  return text.slice(0, 80);
}
