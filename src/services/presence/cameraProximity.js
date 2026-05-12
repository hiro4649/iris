import { ContractError, assertNoWorldCommand, normalizeFinalDecision } from "../../core/contracts.js";
import { assertGameEmbodimentSafe } from "../game/gameEmbodiment.js";
import { assertRelationshipDeepeningSafe } from "../relationship/relationshipDeepening.js";
import { assertBodyContinuitySafe } from "./bodyContinuity.js";
import { assertPerformancePlanSafe } from "./performancePlan.js";

const CAMERA_PROXIMITY_PROFILES = new Set([
  "camera_neutral",
  "camera_approach_micro",
  "camera_approach_close",
  "camera_face_near",
  "camera_face_extreme_closeup",
  "camera_return_neutral",
]);

const PROXIMITY_LEVELS = new Set([
  "neutral",
  "micro",
  "close",
  "face_near",
  "extreme_closeup",
]);

const COMFORT_STATUSES = new Set(["safe", "downgraded", "rejected"]);

const FORBIDDEN_CAMERA_FIELDS = new Set([
  "world_command",
  "obs_command",
  "obs_scene_command",
  "obs_control_command",
  "input_action",
  "input_action_candidate",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "commit_memory",
  "approved_game_input_action",
  "approved_memory_record",
  "approved_relationship_record",
  "relationship_update_candidate",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "canonical",
  "canonical_envelope",
  "relation_score",
  "intent",
  "action_type",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
]);

export function createCameraProximity({
  event,
  coreResult,
  bodyContinuity,
  performancePlan,
  gameEmbodiment,
  relationshipDeepening,
  viewerComfortMode = false,
} = {}) {
  assertNoWorldCommand(event, "Camera proximity event input");
  assertNoWorldCommand(coreResult, "Camera proximity core input");
  assertBodyContinuitySafe(bodyContinuity, "Camera proximity body input");
  assertPerformancePlanSafe(performancePlan, "Camera proximity performance input");
  assertGameEmbodimentSafe(gameEmbodiment, "Camera proximity game embodiment input");
  assertRelationshipDeepeningSafe(
    relationshipDeepening,
    "Camera proximity relationship input"
  );

  const phase01 = coreResult?.phase01 ?? {};
  const phase15 = coreResult?.phase15 ?? {};
  const safetyStatus = normalizeSafetyStatus(phase15.final_decision);
  const request = inferRequestedProximity(event?.payload?.text ?? phase01.normalized_text ?? "");
  const trigger = chooseTrigger({
    request,
    gameEmbodiment,
    relationshipDeepening,
    safetyStatus,
  });
  const comfortGuard = buildComfortGuard({
    trigger,
    safetyStatus,
    gameEmbodiment,
    viewerComfortMode,
  });
  const effectiveLevel = applyComfortGuard(trigger.level, comfortGuard);
  const profile = profileForLevel(effectiveLevel);
  const duration_ms = durationForLevel(effectiveLevel);
  const cameraProximity = {
    schema: "iris_camera_proximity_v1",
    trace_id: phase15.trace_id ?? phase01.trace_id ?? event?.trace_id ?? null,
    event_id: phase15.event_id ?? phase01.event_id ?? event?.event_id ?? null,
    internal_profile: true,
    camera_proximity_profile: profile,
    proximity_level: effectiveLevel,
    trigger_reason: trigger.reason,
    duration_ms,
    easing_profile: easingForLevel(effectiveLevel),
    framing_plan: buildFramingPlan({ level: effectiveLevel, duration_ms }),
    face_expression_hint: expressionHintForTrigger(trigger.reason, effectiveLevel),
    voice_distance_hint: voiceDistanceForLevel(effectiveLevel),
    visibility_result: buildVisibilityResult({ effectiveLevel, gameEmbodiment }),
    comfort_guard_result: comfortGuard,
    cooldown_update: buildCooldownUpdate(effectiveLevel),
    recovery_plan: buildRecoveryPlan(effectiveLevel, duration_ms),
    reject_reason: comfortGuard.status === "rejected" ? comfortGuard.reason : null,
    adapter_validation_required: true,
  };

  assertCameraProximitySafe(cameraProximity, "Camera proximity output");
  return cameraProximity;
}

export function assertCameraProximitySafe(cameraProximity, context = "camera proximity") {
  if (!cameraProximity || typeof cameraProximity !== "object") {
    throw new ContractError(`${context}: missing camera proximity export`);
  }
  assertNoWorldCommand(cameraProximity, context);
  assertNoForbiddenFieldsRecursive(cameraProximity, context);
  if (cameraProximity.schema !== "iris_camera_proximity_v1") {
    throw new ContractError(`${context}: invalid schema`, {
      schema: cameraProximity.schema,
    });
  }
  if (cameraProximity.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (cameraProximity.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (!CAMERA_PROXIMITY_PROFILES.has(cameraProximity.camera_proximity_profile)) {
    throw new ContractError(`${context}: unsupported camera proximity profile`, {
      camera_proximity_profile: cameraProximity.camera_proximity_profile,
    });
  }
  if (!PROXIMITY_LEVELS.has(cameraProximity.proximity_level)) {
    throw new ContractError(`${context}: unsupported proximity level`, {
      proximity_level: cameraProximity.proximity_level,
    });
  }
  if (!COMFORT_STATUSES.has(cameraProximity.comfort_guard_result?.status)) {
    throw new ContractError(`${context}: unsupported comfort status`, {
      status: cameraProximity.comfort_guard_result?.status,
    });
  }
  if (cameraProximity.comfort_guard_result?.viewer_comfort_mode === true) {
    if (
      cameraProximity.comfort_guard_result.strong_closeup_allowed !== false ||
      ["face_near", "extreme_closeup"].includes(cameraProximity.proximity_level) ||
      cameraProximity.visibility_result?.max_screen_coverage > 0.48
    ) {
      throw new ContractError(`${context}: viewer comfort mode must weaken or stop closeup and strong motion`);
    }
  }
  if (!Number.isFinite(cameraProximity.duration_ms) || cameraProximity.duration_ms < 0) {
    throw new ContractError(`${context}: invalid duration`, {
      duration_ms: cameraProximity.duration_ms,
    });
  }
  if (cameraProximity.proximity_level === "extreme_closeup") {
    if (cameraProximity.duration_ms > 1200) {
      throw new ContractError(`${context}: extreme closeup duration too long`, {
        duration_ms: cameraProximity.duration_ms,
      });
    }
    if (cameraProximity.recovery_plan?.required !== true) {
      throw new ContractError(`${context}: extreme closeup requires recovery`);
    }
  }
  if (cameraProximity.proximity_level !== "neutral" && cameraProximity.recovery_plan?.required !== true) {
    throw new ContractError(`${context}: non-neutral proximity requires recovery`);
  }
  if (cameraProximity.visibility_result?.status !== "safe") {
    throw new ContractError(`${context}: visibility must be safe`, {
      status: cameraProximity.visibility_result?.status,
    });
  }
}

export function sanitizeCameraProximityForPublicState(cameraProximity) {
  if (!cameraProximity) return null;
  assertCameraProximitySafe(cameraProximity, "Camera proximity public summary");
  return {
    schema: cameraProximity.schema,
    trace_id: cameraProximity.trace_id,
    event_id: cameraProximity.event_id,
    internal_profile: true,
    camera_proximity_profile: cameraProximity.camera_proximity_profile,
    proximity_level: cameraProximity.proximity_level,
    trigger_reason: cameraProximity.trigger_reason,
    duration_ms: cameraProximity.duration_ms,
    easing_profile: cameraProximity.easing_profile,
    framing_plan: cameraProximity.framing_plan,
    face_expression_hint: cameraProximity.face_expression_hint,
    voice_distance_hint: cameraProximity.voice_distance_hint,
    visibility_result: cameraProximity.visibility_result,
    comfort_guard_result: cameraProximity.comfort_guard_result,
    cooldown_update: cameraProximity.cooldown_update,
    recovery_plan: cameraProximity.recovery_plan,
    reject_reason: cameraProximity.reject_reason,
    adapter_validation_required: true,
  };
}

function inferRequestedProximity(text) {
  const normalized = String(text ?? "").toLowerCase();
  if (
    /extreme close|closeup|close-up|zoom in|顔.*かなり|かなり.*顔|かなり.*アップ|どアップ/.test(
      normalized
    )
  ) {
    return "extreme_closeup";
  }
  if (/face|顔|アップ|近づ/.test(normalized)) return "face_near";
  if (/come closer|closer|near|寄って|近く/.test(normalized)) return "close";
  return null;
}

function chooseTrigger({ request, gameEmbodiment, relationshipDeepening, safetyStatus }) {
  if (safetyStatus !== "safe") {
    return { level: "neutral", reason: "unsafe_status" };
  }
  if (gameEmbodiment.game_embodied_state === "panic_light" || gameEmbodiment.game_embodied_state === "focused") {
    return { level: "neutral", reason: "serious_focus_suppressed" };
  }
  if (request) {
    return {
      level: request,
      reason: request === "extreme_closeup" ? "viewer_requested_extreme_closeup" : "viewer_requested_close",
    };
  }
  if (gameEmbodiment.game_embodied_state === "celebration") {
    return { level: "close", reason: "brief_celebration" };
  }
  if (gameEmbodiment.game_embodied_state === "burst_laugh_game") {
    return { level: "micro", reason: "laugh_forward_motion" };
  }
  if (
    relationshipDeepening.familiarity_level === "familiar" ||
    relationshipDeepening.familiarity_level === "trusted" ||
    relationshipDeepening.familiarity_level === "long_term_friend"
  ) {
    return { level: "micro", reason: "warm_familiar_presence" };
  }
  return { level: "neutral", reason: "no_proximity_needed" };
}

function buildComfortGuard({ trigger, safetyStatus, gameEmbodiment, viewerComfortMode }) {
  if (safetyStatus !== "safe") {
    return {
      status: "rejected",
      reason: "unsafe_status",
      viewer_comfort_mode: Boolean(viewerComfortMode),
      maximum_allowed_level: "neutral",
      strong_closeup_allowed: false,
    };
  }
  if (gameEmbodiment.game_embodied_state === "panic_light" || gameEmbodiment.game_embodied_state === "focused") {
    return {
      status: trigger.level === "neutral" ? "safe" : "downgraded",
      reason: "serious_focus_or_game_visibility",
      viewer_comfort_mode: Boolean(viewerComfortMode),
      maximum_allowed_level: "micro",
      strong_closeup_allowed: false,
    };
  }
  if (viewerComfortMode && (trigger.level === "face_near" || trigger.level === "extreme_closeup")) {
    return {
      status: "downgraded",
      reason: "viewer_comfort_mode",
      viewer_comfort_mode: true,
      maximum_allowed_level: "close",
      strong_closeup_allowed: false,
    };
  }
  if (trigger.level === "extreme_closeup") {
    return {
      status: "safe",
      reason: "rare_bounded_closeup",
      viewer_comfort_mode: Boolean(viewerComfortMode),
      maximum_allowed_level: "extreme_closeup",
      strong_closeup_allowed: true,
    };
  }
  return {
    status: "safe",
    reason: "bounded_visual_guidance",
    viewer_comfort_mode: Boolean(viewerComfortMode),
    maximum_allowed_level: "face_near",
    strong_closeup_allowed: trigger.level !== "neutral",
  };
}

function applyComfortGuard(level, guard) {
  if (guard.status === "rejected") return "neutral";
  if (guard.status !== "downgraded") return level;
  if (guard.maximum_allowed_level === "micro") {
    return level === "neutral" ? "neutral" : "micro";
  }
  if (guard.maximum_allowed_level === "close") {
    return level === "extreme_closeup" || level === "face_near" ? "close" : level;
  }
  return level;
}

function profileForLevel(level) {
  switch (level) {
    case "micro":
      return "camera_approach_micro";
    case "close":
      return "camera_approach_close";
    case "face_near":
      return "camera_face_near";
    case "extreme_closeup":
      return "camera_face_extreme_closeup";
    default:
      return "camera_neutral";
  }
}

function durationForLevel(level) {
  switch (level) {
    case "micro":
      return 900;
    case "close":
      return 1400;
    case "face_near":
      return 1000;
    case "extreme_closeup":
      return 900;
    default:
      return 0;
  }
}

function easingForLevel(level) {
  switch (level) {
    case "extreme_closeup":
      return "soft_fast_in_slow_out";
    case "face_near":
      return "soft_in_out";
    case "close":
      return "gentle_forward_return";
    case "micro":
      return "micro_forward";
    default:
      return "none";
  }
}

function buildFramingPlan({ level, duration_ms }) {
  const scale =
    level === "extreme_closeup"
      ? 1.32
      : level === "face_near"
        ? 1.2
        : level === "close"
          ? 1.12
          : level === "micro"
            ? 1.05
            : 1;
  return {
    virtual_camera_scale: scale,
    avatar_screen_coverage_limit: level === "extreme_closeup" ? 0.68 : level === "face_near" ? 0.58 : 0.46,
    anchor: "face_center_soft",
    duration_ms,
    return_profile: level === "neutral" ? "none" : "camera_return_neutral",
  };
}

function expressionHintForTrigger(reason, level) {
  if (level === "neutral") return "neutral_presence";
  if (reason.includes("celebration")) return "excited_close";
  if (reason.includes("laugh")) return "playful_tease_close";
  if (reason.includes("viewer_requested")) return "curious_peek";
  if (reason.includes("familiar")) return "warm_peek";
  return "curious_peek";
}

function voiceDistanceForLevel(level) {
  switch (level) {
    case "extreme_closeup":
      return "near_voice_bounded";
    case "face_near":
      return "near_clear";
    case "close":
      return "slightly_near";
    case "micro":
      return "natural_forward";
    default:
      return "normal";
  }
}

function buildVisibilityResult({ effectiveLevel, gameEmbodiment }) {
  const isGameObserved = gameEmbodiment.game_embodied_state !== "not_observed";
  return {
    status: "safe",
    game_screen_priority: isGameObserved ? "primary" : "not_applicable",
    ui_occlusion_policy:
      effectiveLevel === "extreme_closeup"
        ? "brief_closeup_never_hold"
        : effectiveLevel === "neutral"
          ? "none"
          : "keep_caption_and_game_visible",
    max_screen_coverage:
      effectiveLevel === "extreme_closeup"
        ? 0.68
        : effectiveLevel === "face_near"
          ? 0.58
          : effectiveLevel === "close"
            ? 0.48
            : effectiveLevel === "micro"
              ? 0.38
              : 0,
    motion_sickness_guard: effectiveLevel === "neutral" ? "none" : "dampen_zoom_and_sway",
  };
}

function buildCooldownUpdate(level) {
  return {
    cooldown_key: "camera_proximity",
    minimum_gap_ms:
      level === "extreme_closeup" ? 120_000 : level === "face_near" ? 45_000 : level === "close" ? 30_000 : 12_000,
    rare_profile_used: level === "extreme_closeup",
  };
}

function buildRecoveryPlan(level, duration_ms) {
  const required = level !== "neutral";
  return {
    required,
    return_profile: required ? "camera_return_neutral" : "none",
    recovery_steps: required
      ? ["ease_back", "gaze_return", "breath_reset", "resume_normal_framing"]
      : [],
    recovery_window_ms: required ? Math.max(700, Math.min(1400, duration_ms + 240)) : 0,
  };
}

function normalizeSafetyStatus(finalDecision) {
  try {
    return normalizeFinalDecision(finalDecision ?? "allow");
  } catch {
    return "reject";
  }
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
    if (FORBIDDEN_CAMERA_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: camera proximity must not define command, commit, or canonical fields`,
        { field, path }
      );
    }
    assertNoForbiddenFieldsRecursive(child, context, `${path}.${field}`);
  }
}
