import { ContractError, assertNoWorldCommand, normalizeFinalDecision } from "../../core/contracts.js";
import { assertMemoryRecallSafe } from "../memory/memoryRecall.js";

const DANGER_LEVELS = new Set(["none", "low", "medium", "high", "critical", "unknown"]);
const COMMENTARY_TRIGGERS = new Set([
  "none",
  "explain",
  "react",
  "warn",
  "celebrate",
  "recover",
  "joke",
  "focus",
]);
const CONTROL_HINTS = new Set([
  "observe_only",
  "maintain_context",
  "stay_safe",
  "look_for_opportunity",
  "celebrate_only",
  "recover_attention",
]);

const FORBIDDEN_GAME_PERCEPTION_FIELDS = new Set([
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
  "intent",
  "action_type",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
  "truth",
  "truth_claim",
  "source_of_truth",
  "memory_commit_confirmed",
  "action_decision_confirmed",
]);
const UNSAFE_PUBLIC_VISION_TEXT_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|memory_write|direct_memory_write|commit_memory|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url)\b|https?:\/\//i;
const PRIVATE_SCREEN_TEXT_PATTERN =
  /\b(private|confidential|secret|password|token|api[_-]?key|oauth|address|phone|email|ssn|credit\s*card|medical|diagnosis|bank|account)\b|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b|\b\d{3}-\d{2}-\d{4}\b/i;

export function createGamePerception({ event, coreResult, memoryRecall } = {}) {
  assertNoWorldCommand(event, "Game perception event input");
  assertNoWorldCommand(coreResult, "Game perception core input");
  assertMemoryRecallSafe(memoryRecall, "Game perception memory recall");

  const phase01 = coreResult?.phase01 ?? {};
  const phase15 = coreResult?.phase15 ?? {};
  const gameContext = phase01.game_context;
  const safetyStatus = normalizeSafetyStatus(phase15.final_decision);

  if (!gameContext || phase01.payload_kind !== "game_observation") {
    const skipped = {
      schema: "iris_game_perception_v1",
      trace_id: phase15.trace_id ?? phase01.trace_id ?? event?.trace_id ?? null,
      event_id: phase15.event_id ?? phase01.event_id ?? event?.event_id ?? null,
      internal_profile: true,
      game_observation_id: null,
      game_observation_id_present: false,
      game_situation_summary: {
        game_title: null,
        player_status: "not_observed",
        enemy_status: "unknown",
        objective_status: "unknown",
        recent_change: "none",
        detected_events: [],
        detected_entities: buildDetectedEntitySummary([]),
      },
      danger_level: "unknown",
      opportunity_score: 0,
      funny_event_score: 0,
      commentary_trigger: "none",
      control_hint: "observe_only",
      perception_confidence: 0,
      perception_reject_reason: "not_game_observation",
      phase22_observation_truth_boundary: buildObservationTruthBoundary(false),
      adapter_validation_required: true,
    };
    assertGamePerceptionSafe(skipped, "Game perception skipped output");
    return skipped;
  }

  const confidence = clamp01(Number(gameContext.screen_confidence ?? 0.5));
  const lowConfidence = confidence < 0.25;
  const privacyRisk = hasScreenCapturePrivacyRisk(gameContext);
  const parserFailure = hasParserFailure(gameContext);
  const staleObservation = isStaleObservation(gameContext);
  const text = [
    gameContext.scene_summary,
    gameContext.player_state,
    gameContext.vision_metadata?.ocr_text_summary,
    ...(Array.isArray(gameContext.vision_metadata?.ui_focus_areas)
      ? gameContext.vision_metadata.ui_focus_areas
      : []),
    ...(Array.isArray(gameContext.detected_events) ? gameContext.detected_events : []),
  ]
    .join(" ")
    .toLowerCase();
  const safeObservationText = privacyRisk || parserFailure || staleObservation ? "" : text;
  const detectedEvents =
    privacyRisk || parserFailure || staleObservation
      ? []
      : detectEvents(safeObservationText, gameContext.detected_events);
  const assertedEvents = lowConfidence || privacyRisk || parserFailure || staleObservation ? [] : detectedEvents;
  const danger_level =
    lowConfidence || privacyRisk || parserFailure || staleObservation
      ? "unknown"
      : determineDangerLevel(safeObservationText, assertedEvents);
  const opportunity_score =
    lowConfidence || privacyRisk || parserFailure || staleObservation
      ? 0
      : determineOpportunityScore(safeObservationText, assertedEvents);
  const funny_event_score =
    lowConfidence || privacyRisk || parserFailure || staleObservation
      ? 0
      : determineFunnyScore(safeObservationText, assertedEvents);
  const commentary_trigger =
    lowConfidence || privacyRisk || parserFailure || staleObservation || safetyStatus !== "safe"
      ? "focus"
      : chooseCommentaryTrigger({ danger_level, opportunity_score, funny_event_score, detectedEvents: assertedEvents });
  const gameObservationId = phase01.event_id ?? event?.event_id ?? null;
  const gameSituationSummary = privacyRisk
    ? buildPrivacyProtectedSummary(gameContext)
    : parserFailure
      ? buildParserFailureSummary(gameContext)
      : staleObservation
        ? buildStaleObservationSummary(gameContext)
    : lowConfidence
    ? buildLowConfidenceSummary(gameContext)
    : {
        game_title: gameContext.game_title ?? "unknown_game",
        player_status: summarizePlayerStatus(safeObservationText),
        enemy_status: summarizeEnemyStatus(safeObservationText),
        objective_status: summarizeObjectiveStatus(safeObservationText, assertedEvents),
        recent_change: summarizeRecentChange(assertedEvents),
        detected_events: assertedEvents,
        detected_entities: buildDetectedEntitySummary(gameContext.detected_entities),
        vision_context: summarizeVisionContext(gameContext.vision_metadata),
      };
  const perception = {
    schema: "iris_game_perception_v1",
    trace_id: phase15.trace_id ?? phase01.trace_id ?? event?.trace_id ?? null,
    event_id: phase15.event_id ?? phase01.event_id ?? event?.event_id ?? null,
    internal_profile: true,
    game_observation_id: gameObservationId,
    game_observation_id_present: String(gameObservationId ?? "").trim() !== "",
    game_situation_summary: gameSituationSummary,
    danger_level,
    opportunity_score,
    funny_event_score,
    commentary_trigger,
    control_hint: chooseControlHint({
      danger_level,
      opportunity_score,
      commentary_trigger,
      lowConfidence,
      parserFailure,
      staleObservation,
    }),
    perception_confidence: confidence,
    perception_reject_reason:
      lowConfidence
        ? "low_confidence"
        : privacyRisk
          ? "privacy_risk"
          : parserFailure
            ? "parser_failure"
            : staleObservation
              ? "stale_observation"
        : safetyStatus !== "safe"
          ? "unsafe_status"
          : null,
    phase22_low_confidence_non_assertion: {
      low_confidence_blocks_assertive_commentary: true,
      low_confidence_blocks_memory_or_action_confirmation: true,
      external_observation_not_truth: true,
    },
    phase22_observation_truth_boundary: buildObservationTruthBoundary(true, gameContext),
    adapter_validation_required: true,
  };

  assertGamePerceptionSafe(perception, "Game perception output");
  return perception;
}

export function assertGamePerceptionSafe(gamePerception, context = "game perception") {
  if (!gamePerception || typeof gamePerception !== "object") {
    throw new ContractError(`${context}: missing game perception export`);
  }
  assertNoWorldCommand(gamePerception, context);
  assertNoForbiddenFieldsRecursive(gamePerception, context);
  if (gamePerception.schema !== "iris_game_perception_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: gamePerception.schema });
  }
  if (gamePerception.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (gamePerception.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (!DANGER_LEVELS.has(gamePerception.danger_level)) {
    throw new ContractError(`${context}: unsupported danger_level`, {
      danger_level: gamePerception.danger_level,
    });
  }
  if (!COMMENTARY_TRIGGERS.has(gamePerception.commentary_trigger)) {
    throw new ContractError(`${context}: unsupported commentary_trigger`, {
      commentary_trigger: gamePerception.commentary_trigger,
    });
  }
  if (!CONTROL_HINTS.has(gamePerception.control_hint)) {
    throw new ContractError(`${context}: unsupported control_hint`, {
      control_hint: gamePerception.control_hint,
    });
  }
  if (
    gamePerception.phase22_observation_truth_boundary?.external_observation_reference_only !== true ||
    gamePerception.phase22_observation_truth_boundary?.not_source_of_truth !== true ||
    gamePerception.phase22_observation_truth_boundary?.no_memory_commit_from_observation !== true ||
    gamePerception.phase22_observation_truth_boundary?.no_action_decision_from_observation !== true ||
    typeof gamePerception.phase22_observation_truth_boundary?.source_trust !== "string" ||
    typeof gamePerception.phase22_observation_truth_boundary?.freshness !== "string" ||
    gamePerception.phase22_observation_truth_boundary?.game_state_reference_policy !== "reference_only"
  ) {
    throw new ContractError(`${context}: Phase22 observation truth boundary required`);
  }
  if (
    gamePerception.perception_confidence < 0.25 &&
    gamePerception.perception_reject_reason !== "not_game_observation"
  ) {
    if (
      gamePerception.phase22_low_confidence_non_assertion?.low_confidence_blocks_assertive_commentary !== true ||
      gamePerception.phase22_low_confidence_non_assertion?.low_confidence_blocks_memory_or_action_confirmation !== true ||
      gamePerception.phase22_low_confidence_non_assertion?.external_observation_not_truth !== true
    ) {
      throw new ContractError(`${context}: low confidence non-assertion guard required`);
    }
    if (
      gamePerception.perception_reject_reason !== "low_confidence" ||
      gamePerception.danger_level !== "unknown" ||
      gamePerception.opportunity_score !== 0 ||
      gamePerception.funny_event_score !== 0 ||
      gamePerception.control_hint !== "observe_only"
    ) {
      throw new ContractError(`${context}: low confidence observation must not assert game state`);
    }
    if ((gamePerception.game_situation_summary?.detected_events ?? []).length > 0) {
      throw new ContractError(`${context}: low confidence observation must not confirm detected events`);
    }
  }
  for (const [name, value] of Object.entries({
    opportunity_score: gamePerception.opportunity_score,
    funny_event_score: gamePerception.funny_event_score,
    perception_confidence: gamePerception.perception_confidence,
  })) {
    if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 1) {
      throw new ContractError(`${context}: score out of range`, { name, value });
    }
  }
}

export function sanitizeGamePerceptionForPublicState(gamePerception) {
  if (!gamePerception) return null;
  assertGamePerceptionSafe(gamePerception, "Game perception public summary");
  return {
    schema: gamePerception.schema,
    trace_id: gamePerception.trace_id,
    event_id: gamePerception.event_id,
    internal_profile: true,
    game_observation_id: gamePerception.game_observation_id,
    game_situation_summary: sanitizeGameSituationSummaryForPublicState(
      gamePerception.game_situation_summary
    ),
    danger_level: gamePerception.danger_level,
    opportunity_score: gamePerception.opportunity_score,
    funny_event_score: gamePerception.funny_event_score,
    commentary_trigger: gamePerception.commentary_trigger,
    control_hint: gamePerception.control_hint,
    perception_confidence: gamePerception.perception_confidence,
    perception_reject_reason: gamePerception.perception_reject_reason,
    phase22_low_confidence_non_assertion: gamePerception.phase22_low_confidence_non_assertion,
    phase22_observation_truth_boundary: gamePerception.phase22_observation_truth_boundary,
    adapter_validation_required: true,
  };
}

function sanitizeGameSituationSummaryForPublicState(summary) {
  const source = summary && typeof summary === "object" ? summary : {};
  return {
    game_title: safePublicVisionText(source.game_title, 120, "unknown_game"),
    player_status: safePublicVisionText(source.player_status, 80, "unknown"),
    enemy_status: safePublicVisionText(source.enemy_status, 80, "unknown"),
    objective_status: safePublicVisionText(source.objective_status, 80, "unknown"),
    recent_change: safePublicVisionText(source.recent_change, 80, "none"),
    detected_events: Array.isArray(source.detected_events)
      ? source.detected_events
          .map((item) => safePublicVisionText(item, 80, ""))
          .filter(Boolean)
          .slice(0, 8)
      : [],
    detected_entities: sanitizeDetectedEntitySummaryForPublicState(source.detected_entities),
    vision_context: sanitizeVisionContextForPublicState(source.vision_context),
  };
}

function sanitizeDetectedEntitySummaryForPublicState(summary) {
  const source = summary && typeof summary === "object" ? summary : {};
  const labels = Array.isArray(source.labels)
    ? source.labels.map((item) => safePublicVisionText(item, 80, "")).filter(Boolean).slice(0, 8)
    : [];
  return {
    count: safeCount(source.count),
    labels,
  };
}

function sanitizeVisionContextForPublicState(context) {
  const source = context && typeof context === "object" ? context : {};
  const frameIdAvailable = Boolean(safeSummary(source.frame_id ?? ""));
  return {
    source_kind: safePublicVisionText(
      source.source_kind ?? "unknown_vision_source",
      120,
      "vision_source_omitted"
    ),
    frame_id: "",
    frame_reference_available: frameIdAvailable,
    frame_age_ms: safeOptionalNumber(source.frame_age_ms),
    ui_focus_areas: Array.isArray(source.ui_focus_areas)
      ? source.ui_focus_areas
          .map((item) => safePublicVisionText(item, 80, ""))
          .filter(Boolean)
          .slice(0, 8)
      : [],
    raw_frame_policy: "raw_frame_not_passed_to_core",
    boundary_policy: {
      no_frame_ids: true,
      no_frame_references: true,
      no_raw_frames: true,
      no_unsafe_vision_labels: true,
    },
  };
}

function detectEvents(text, existingEvents = []) {
  const events = new Set(
    Array.isArray(existingEvents) ? existingEvents.map(cleanEvent).filter(Boolean) : []
  );
  if (/damage|hit|hurt|被弾|ダメージ/.test(text)) events.add("damage_taken");
  if (/low health|one heart|half heart|three hearts|瀕死|低体力/.test(text)) {
    events.add("low_health");
  }
  if (/enemy|skeleton|zombie|boss|敵/.test(text)) events.add("enemy_appeared");
  if (/lava|void|fall|trap|poison|危険/.test(text)) events.add("hazard_nearby");
  if (/diamond|rare|legendary|treasure|item found|レア|ダイヤ/.test(text)) {
    events.add("item_found");
  }
  if (/objective completed|clear|goal|victory|completed|クリア|達成/.test(text)) {
    events.add("objective_completed");
  }
  if (/mistake|missed|fell|落ちた|ミス/.test(text)) events.add("mistake");
  if (/funny|lol|weird|unexpected|www|笑|事故/.test(text)) events.add("funny_event");
  return [...events].slice(0, 8);
}

function determineDangerLevel(text, events) {
  if (events.includes("low_health") && events.includes("hazard_nearby")) return "critical";
  if (events.includes("low_health") || /boss|one heart|half heart|瀕死/.test(text)) return "high";
  if (events.includes("enemy_appeared") || events.includes("hazard_nearby")) return "medium";
  if (events.includes("damage_taken")) return "low";
  return "none";
}

function determineOpportunityScore(text, events) {
  let score = 0.15;
  if (events.includes("item_found")) score += 0.45;
  if (events.includes("objective_completed")) score += 0.55;
  if (/opening|chance|safe path|opportunity|チャンス/.test(text)) score += 0.3;
  return clamp01(score);
}

function determineFunnyScore(text, events) {
  let score = 0;
  if (events.includes("funny_event")) score += 0.65;
  if (events.includes("mistake")) score += 0.18;
  if (/unexpected|accident|chaos|weird|まさか|事故/.test(text)) score += 0.2;
  return clamp01(score);
}

function chooseCommentaryTrigger({ danger_level, opportunity_score, funny_event_score, detectedEvents }) {
  if (danger_level === "critical" || danger_level === "high") return "warn";
  if (danger_level === "medium") return "focus";
  if (opportunity_score >= 0.65 || detectedEvents.includes("objective_completed")) return "celebrate";
  if (funny_event_score >= 0.55) return "joke";
  if (detectedEvents.includes("mistake")) return "recover";
  return "react";
}

function chooseControlHint({
  danger_level,
  opportunity_score,
  commentary_trigger,
  lowConfidence = false,
  parserFailure = false,
  staleObservation = false,
}) {
  if (lowConfidence || parserFailure || staleObservation) return "observe_only";
  if (danger_level === "critical" || danger_level === "high") return "stay_safe";
  if (commentary_trigger === "celebrate" || opportunity_score >= 0.65) return "celebrate_only";
  if (commentary_trigger === "recover") return "recover_attention";
  if (opportunity_score >= 0.35) return "look_for_opportunity";
  return "maintain_context";
}

function buildLowConfidenceSummary(gameContext) {
  return {
    game_title: gameContext.game_title ?? "unknown_game",
    player_status: "uncertain",
    enemy_status: "unknown",
    objective_status: "unknown",
    recent_change: "unconfirmed",
    detected_events: [],
    detected_entities: buildDetectedEntitySummary([]),
    vision_context: summarizeVisionContext(gameContext.vision_metadata),
  };
}

function buildParserFailureSummary(gameContext) {
  return {
    game_title: gameContext.game_title ?? "unknown_game",
    player_status: "parser_failure",
    enemy_status: "unknown",
    objective_status: "unknown",
    recent_change: "unconfirmed",
    detected_events: [],
    detected_entities: buildDetectedEntitySummary([]),
    vision_context: summarizeVisionContext(gameContext.vision_metadata),
  };
}

function buildStaleObservationSummary(gameContext) {
  return {
    game_title: gameContext.game_title ?? "unknown_game",
    player_status: "stale_observation",
    enemy_status: "unknown",
    objective_status: "unknown",
    recent_change: "unconfirmed",
    detected_events: [],
    detected_entities: buildDetectedEntitySummary([]),
    vision_context: summarizeVisionContext(gameContext.vision_metadata),
  };
}

function buildPrivacyProtectedSummary(gameContext) {
  return {
    game_title: safePublicVisionText(gameContext.game_title, 120, "unknown_game"),
    player_status: "privacy_redacted",
    enemy_status: "unknown",
    objective_status: "unknown",
    recent_change: "privacy_redacted",
    detected_events: [],
    detected_entities: buildDetectedEntitySummary([]),
    vision_context: summarizeVisionContext(gameContext.vision_metadata),
  };
}

function buildDetectedEntitySummary(entities) {
  const labels = Array.isArray(entities)
    ? entities
        .map((entity) => {
          if (typeof entity === "string") return safePublicVisionText(entity, 80, "");
          return safePublicVisionText(entity?.label ?? entity?.kind ?? entity?.type, 80, "");
        })
        .filter(Boolean)
        .slice(0, 8)
    : [];
  return {
    count: Array.isArray(entities) ? entities.length : 0,
    labels,
  };
}

function buildObservationTruthBoundary(observationPresent, gameContext = null) {
  return {
    observation_present: Boolean(observationPresent),
    observation_kind: observationPresent ? "external_observation" : "none",
    source_trust: observationPresent ? "unverified_external_observation" : "none",
    freshness: observationPresent ? observationFreshness(gameContext) : "none",
    game_state_reference_policy: "reference_only",
    external_observation_reference_only: true,
    not_source_of_truth: true,
    no_memory_commit_from_observation: true,
    no_action_decision_from_observation: true,
  };
}

function observationFreshness(gameContext) {
  const frameAge = safeOptionalNumber(gameContext?.vision_metadata?.frame_age_ms);
  if (frameAge === null) return "unknown";
  if (frameAge <= 5000) return "fresh";
  if (frameAge <= 30000) return "recent";
  return "stale";
}

function isStaleObservation(gameContext) {
  return observationFreshness(gameContext) === "stale";
}

function summarizePlayerStatus(text) {
  if (/low health|one heart|half heart|three hearts|瀕死|低体力/.test(text)) return "low_health";
  if (/crouch|sneak|隠れ/.test(text)) return "cautious";
  if (/running|逃げ|dash/.test(text)) return "moving_fast";
  return "stable";
}

function summarizeEnemyStatus(text) {
  if (/boss/.test(text)) return "boss_present";
  if (/enemy|skeleton|zombie|敵/.test(text)) return "enemy_present";
  return "unknown";
}

function summarizeObjectiveStatus(text, events) {
  if (events.includes("objective_completed")) return "completed";
  if (events.includes("item_found")) return "reward_visible";
  if (/near|close|almost|あと少し/.test(text)) return "near_progress";
  return "in_progress";
}

function summarizeRecentChange(events) {
  if (events.includes("low_health")) return "health_became_dangerous";
  if (events.includes("objective_completed")) return "objective_completed";
  if (events.includes("item_found")) return "valuable_item_found";
  if (events.includes("funny_event")) return "unexpected_funny_event";
  if (events.includes("enemy_appeared")) return "enemy_appeared";
  return "none";
}

function summarizeVisionContext(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return {
      source_kind: "unknown_vision_source",
      frame_id: "",
      frame_age_ms: null,
      ui_focus_areas: [],
      raw_frame_policy: "raw_frame_not_passed_to_core",
    };
  }
  const frameAge = safeOptionalNumber(metadata.frame_age_ms);
  return {
    source_kind: safeSummary(metadata.source_kind ?? "unknown_vision_source"),
    frame_id: safeSummary(metadata.frame_id ?? ""),
    frame_age_ms: frameAge,
    ui_focus_areas: Array.isArray(metadata.ui_focus_areas)
      ? metadata.ui_focus_areas.map(safeSummary).filter(Boolean).slice(0, 8)
      : [],
    raw_frame_policy: "raw_frame_not_passed_to_core",
  };
}

function hasScreenCapturePrivacyRisk(gameContext) {
  const values = [
    gameContext?.screen_capture,
    gameContext?.screen_capture_summary,
    gameContext?.scene_summary,
    gameContext?.player_state,
    gameContext?.vision_metadata?.ocr_text,
    gameContext?.vision_metadata?.ocr_text_summary,
    gameContext?.vision_metadata?.private_screen_text,
    gameContext?.vision_metadata?.confidential_text,
    ...(Array.isArray(gameContext?.vision_metadata?.ui_focus_areas)
      ? gameContext.vision_metadata.ui_focus_areas
      : []),
    ...(Array.isArray(gameContext?.detected_entities) ? gameContext.detected_entities : []),
  ];
  return values.some((value) => PRIVATE_SCREEN_TEXT_PATTERN.test(String(value ?? "")));
}

function hasParserFailure(gameContext) {
  const status = String(
    gameContext?.parser_status ??
      gameContext?.parse_status ??
      gameContext?.game_state_parser_status ??
      gameContext?.vision_metadata?.parser_status ??
      ""
  )
    .trim()
    .toLowerCase();
  if (["failed", "failure", "error", "invalid", "unparseable", "parser_failure"].includes(status)) {
    return true;
  }
  return gameContext?.parser_failure === true || gameContext?.vision_metadata?.parser_failure === true;
}

function safeSummary(value, maxLength = 120) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function safePublicVisionText(value, maxLength = 120, fallback = "") {
  const text = safeSummary(value, maxLength);
  if (!text) return fallback;
  if (UNSAFE_PUBLIC_VISION_TEXT_PATTERN.test(text) || PRIVATE_SCREEN_TEXT_PATTERN.test(text)) return fallback;
  return text;
}

function safeOptionalNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toFixed(4));
}

function safeCount(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) return 0;
  return number;
}

function normalizeSafetyStatus(finalDecision) {
  try {
    return normalizeFinalDecision(finalDecision ?? "allow");
  } catch {
    return "reject";
  }
}

function cleanEvent(event) {
  return String(event ?? "").replace(/\s+/g, "_").toLowerCase().trim();
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number(value.toFixed(4));
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
    if (FORBIDDEN_GAME_PERCEPTION_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: game perception must not define command or canonical fields`,
        { field, path }
      );
    }
    assertNoForbiddenFieldsRecursive(child, context, `${path}.${field}`);
  }
}
