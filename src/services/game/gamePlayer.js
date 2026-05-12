import { ContractError, assertCandidateNotExecutable, assertNoWorldCommand } from "../../core/contracts.js";
import { assertRelationshipDeepeningSafe } from "../relationship/relationshipDeepening.js";
import { assertGameCommentarySafe } from "./gameCommentary.js";
import { assertGamePerceptionSafe } from "./gamePerception.js";

const GAME_GOALS = new Set(["none", "survive", "progress", "collect", "explore", "solve", "compete", "entertain"]);
const ACTION_KINDS = new Set(["wait", "move_axis", "press_key", "click", "open_menu", "select_item"]);
const SAFETY_STATUSES = new Set(["allow_candidate", "stop"]);
const ADAPTER_TARGET_HINTS = new Set([
  "minecraft_adapter_candidate",
  "unknown_game_adapter",
  "generic_game_adapter_candidate",
]);

const FORBIDDEN_GAME_PLAYER_FIELDS = new Set([
  "world_command",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "commit_memory",
  "approved_game_input_action",
  "intent",
  "action_type",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
  "affinity_score",
  "familiarity_score",
  "proposed_relation_score_delta",
  "proposed_affinity_delta",
  "proposed_familiarity_delta",
]);

export function createGamePlayer({
  event,
  coreResult,
  gamePerception,
  gameCommentary,
  relationshipDeepening = null,
  availableGameActions = [],
  previousActionResult = null,
} = {}) {
  assertNoWorldCommand(event, "Game player event input");
  assertNoWorldCommand(coreResult, "Game player core input");
  assertGamePerceptionSafe(gamePerception, "Game player perception input");
  assertGameCommentarySafe(gameCommentary, "Game player commentary input");
  if (relationshipDeepening) {
    assertRelationshipDeepeningSafe(relationshipDeepening, "Game player relationship input");
  }

  const phase01 = coreResult?.phase01 ?? {};
  const phase15 = coreResult?.phase15 ?? {};
  const game_goal = chooseGameGoal({ gamePerception, gameCommentary });
  const viewer_coordination_context = buildViewerCoordinationContext(relationshipDeepening);
  const game_strategy = buildStrategy({
    game_goal,
    gamePerception,
    previousActionResult,
    viewerCoordinationContext: viewer_coordination_context,
  });
  const safety_stop_result = buildSafetyStopResult({
    phase01,
    gamePerception,
    gameCommentary,
    game_strategy,
    availableGameActions,
    previousActionResult,
  });
  const input_action_candidate =
    safety_stop_result.status === "allow_candidate"
      ? buildInputActionCandidate({
          phase01,
          game_goal,
          game_strategy,
          gamePerception,
          availableGameActions,
        })
      : null;

  const gamePlayer = {
    schema: "iris_game_player_v1",
    trace_id: phase15.trace_id ?? phase01.trace_id ?? event?.trace_id ?? null,
    event_id: phase15.event_id ?? phase01.event_id ?? event?.event_id ?? null,
    internal_profile: true,
    game_goal,
    game_strategy,
    viewer_coordination_context,
    input_action_candidate,
    adapter_target_hint: adapterTargetHint(phase01.game_context?.game_title),
    safety_stop_result,
    mistake_recovery_plan: buildMistakeRecoveryPlan(previousActionResult, gamePerception),
    action_explanation_hint: explanationHint({ game_goal, game_strategy, safety_stop_result }),
    adapter_validation_required: true,
  };

  assertGamePlayerSafe(gamePlayer, "Game player output");
  return gamePlayer;
}

export function assertGamePlayerSafe(gamePlayer, context = "game player") {
  if (!gamePlayer || typeof gamePlayer !== "object") {
    throw new ContractError(`${context}: missing game player export`);
  }
  assertNoWorldCommand(gamePlayer, context);
  assertNoForbiddenFieldsRecursive(gamePlayer, context);
  if (gamePlayer.schema !== "iris_game_player_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: gamePlayer.schema });
  }
  if (gamePlayer.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (gamePlayer.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (!GAME_GOALS.has(gamePlayer.game_goal)) {
    throw new ContractError(`${context}: unsupported game_goal`, { game_goal: gamePlayer.game_goal });
  }
  if (!SAFETY_STATUSES.has(gamePlayer.safety_stop_result?.status)) {
    throw new ContractError(`${context}: unsupported safety stop status`, {
      status: gamePlayer.safety_stop_result?.status,
    });
  }
  if (gamePlayer.input_action_candidate) {
    assertInputActionCandidateSafe(gamePlayer.input_action_candidate, `${context} input candidate`);
  }
  if (!ADAPTER_TARGET_HINTS.has(gamePlayer.adapter_target_hint)) {
    throw new ContractError(`${context}: adapter_target_hint must be a safe label`);
  }
  if (/[\\/:]|https?:\/\/|\b(endpoint|command|powershell|terminal|cmd\.exe|\.exe|\.bat|\.ps1)\b/i.test(String(gamePlayer.adapter_target_hint))) {
    throw new ContractError(`${context}: adapter_target_hint must not expose endpoint, OS path, or raw command`);
  }
  assertActionExplanationNoBlame(gamePlayer.action_explanation_hint, context);
}

export function sanitizeGamePlayerForPublicState(gamePlayer) {
  if (!gamePlayer) return null;
  assertGamePlayerSafe(gamePlayer, "Game player public summary");
  return {
    schema: gamePlayer.schema,
    trace_id: gamePlayer.trace_id,
    event_id: gamePlayer.event_id,
    internal_profile: true,
    game_goal: gamePlayer.game_goal,
    game_strategy: gamePlayer.game_strategy,
    viewer_coordination_context: gamePlayer.viewer_coordination_context,
    input_action_candidate_status: gamePlayer.input_action_candidate
      ? "validation_required"
      : "not_created",
    adapter_target_hint: gamePlayer.adapter_target_hint,
    safety_stop_result: gamePlayer.safety_stop_result,
    mistake_recovery_plan: gamePlayer.mistake_recovery_plan,
    action_explanation_hint: gamePlayer.action_explanation_hint,
    adapter_validation_required: true,
  };
}

function assertInputActionCandidateSafe(candidate, context) {
  assertCandidateNotExecutable(candidate, context);
  if (candidate.schema !== "iris_input_action_candidate_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: candidate.schema });
  }
  if (candidate.candidate_kind !== "input_action_candidate") {
    throw new ContractError(`${context}: invalid candidate kind`, {
      candidate_kind: candidate.candidate_kind,
    });
  }
  if (!ACTION_KINDS.has(candidate.action_kind)) {
    throw new ContractError(`${context}: unsupported action kind`, {
      action_kind: candidate.action_kind,
    });
  }
  if (
    Array.isArray(candidate.available_action_allowlist) &&
    !candidate.available_action_allowlist.includes(candidate.action_kind)
  ) {
    throw new ContractError(`${context}: action kind must be in available_game_actions allowlist`, {
      action_kind: candidate.action_kind,
    });
  }
  if (candidate.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
}

function chooseGameGoal({ gamePerception, gameCommentary }) {
  if (gamePerception.perception_reject_reason === "not_game_observation") return "none";
  if (gamePerception.danger_level === "critical" || gamePerception.danger_level === "high") {
    return "survive";
  }
  if (gameCommentary.commentary_mode === "celebration") return "entertain";
  if (gamePerception.opportunity_score >= 0.6) return "collect";
  if (gameCommentary.commentary_mode === "recovery") return "survive";
  if (gamePerception.perception_confidence < 0.25) return "none";
  return "progress";
}

function buildStrategy({
  game_goal,
  gamePerception,
  previousActionResult,
  viewerCoordinationContext,
}) {
  const repeatedFailure = previousActionResult?.status === "failed";
  const coordinationStyle = viewerCoordinationContext?.coordination_style ?? "neutral_open";
  if (game_goal === "none") {
    return {
      intention: "do_not_control",
      expected_result: "keep_observing",
      risk_level: "none",
      fallback_action: "wait_for_clear_observation",
      viewer_coordination_style: coordinationStyle,
    };
  }
  if (game_goal === "survive") {
    return {
      intention: "reduce_immediate_risk",
      expected_result: "avoid_damage_and_recover_view",
      risk_level: gamePerception.danger_level === "critical" ? "medium" : "low",
      fallback_action: repeatedFailure ? "stop_and_reassess" : "wait",
      viewer_coordination_style: coordinationStyle,
    };
  }
  if (game_goal === "collect") {
    return {
      intention: "approach_visible_opportunity_carefully",
      expected_result: "move_toward_reward_without_overcommitting",
      risk_level: gamePerception.danger_level === "medium" ? "medium" : "low",
      fallback_action: "wait",
      viewer_coordination_style: coordinationStyle,
    };
  }
  return {
    intention: "maintain_progress",
    expected_result: "keep_game_flow_moving",
    risk_level: gamePerception.danger_level === "medium" ? "medium" : "low",
    fallback_action: "wait",
    viewer_coordination_style: coordinationStyle,
  };
}

function buildSafetyStopResult({
  phase01,
  gamePerception,
  gameCommentary,
  game_strategy,
  availableGameActions,
  previousActionResult,
}) {
  if (gamePerception.perception_reject_reason === "not_game_observation") {
    return { status: "stop", reason: "not_game_observation", safe_idle_game_state: true };
  }
  if (hasUnsafeViewerSuggestion(phase01)) {
    return { status: "stop", reason: "unsafe_viewer_suggestion", safe_idle_game_state: true };
  }
  if (gamePerception.perception_confidence < 0.25) {
    return { status: "stop", reason: "low_confidence", safe_idle_game_state: true };
  }
  if (
    gamePerception.perception_reject_reason === "stale_observation" ||
    gamePerception.game_situation_summary?.player_status === "stale_observation" ||
    gamePerception.game_situation_summary?.recent_change === "unconfirmed"
  ) {
    return { status: "stop", reason: "stale_observation", safe_idle_game_state: true };
  }
  if (gameCommentary.commentary_safety_result?.status === "reject") {
    return { status: "stop", reason: "commentary_safety_reject", safe_idle_game_state: true };
  }
  if (game_strategy.risk_level === "high") {
    return { status: "stop", reason: "risk_level_high", safe_idle_game_state: true };
  }
  if (isRepeatedFailureThresholdExceeded(previousActionResult)) {
    return { status: "stop", reason: "repeated_failure_threshold", safe_idle_game_state: true };
  }
  const allowedActions = normalizeAllowedActions(availableGameActions);
  if (!allowedActions.has("wait") && !allowedActions.has("move_axis")) {
    return { status: "stop", reason: "adapter_action_unavailable", safe_idle_game_state: true };
  }
  return { status: "allow_candidate", reason: null, safe_idle_game_state: false };
}

function isRepeatedFailureThresholdExceeded(previousActionResult) {
  if (!previousActionResult || typeof previousActionResult !== "object") return false;
  const count = Number(
    previousActionResult.consecutive_failure_count ??
      previousActionResult.repeated_failure_count ??
      previousActionResult.failure_count ??
      0
  );
  return previousActionResult.status === "failed" && Number.isFinite(count) && count >= 3;
}

function hasUnsafeViewerSuggestion(phase01) {
  const suggestions = [
    phase01?.viewer_suggestions,
    phase01?.viewer_suggestion,
    phase01?.user_suggestion,
    phase01?.suggestion_text,
    phase01?.user_comment_context?.suggestion,
    phase01?.user_comment_context?.suggestion_text,
    phase01?.payload?.viewer_suggestions,
    phase01?.payload?.viewer_suggestion,
    phase01?.payload?.suggestion_text,
  ];
  return suggestions.some((value) => containsUnsafeViewerSuggestion(value));
}

function containsUnsafeViewerSuggestion(value) {
  if (Array.isArray(value)) return value.some(containsUnsafeViewerSuggestion);
  if (value && typeof value === "object") {
    return Object.values(value).some(containsUnsafeViewerSuggestion);
  }
  return /\b(alt\s*\+\s*f4|ctrl\s*\+\s*alt\s*\+\s*del|cmd\s*\+\s*q|command\s*\+\s*q|win\s*\+\s*[a-z]|shutdown|powershell|terminal|cheat|exploit|grief|harass|attack player|delete save|unsafe)\b/i.test(
    String(value ?? "")
  );
}

function buildInputActionCandidate({
  phase01,
  game_goal,
  game_strategy,
  gamePerception,
  availableGameActions,
}) {
  const allowedActions = normalizeAllowedActions(availableGameActions);
  const action_kind =
    game_goal === "survive" && allowedActions.has("move_axis") ? "move_axis" : "wait";
  const candidate = {
    schema: "iris_input_action_candidate_v1",
    candidate_kind: "input_action_candidate",
    requires_validation: true,
    trace_id: phase01.trace_id ?? null,
    event_id: phase01.event_id ?? null,
    game_title: phase01.game_context?.game_title ?? "unknown_game",
    action_kind,
    available_action_allowlist: [...allowedActions],
    parameters:
      action_kind === "move_axis"
        ? { axis: "movement", direction_hint: "away_from_hazard", intensity: 0.45 }
        : { duration_ms: gamePerception.danger_level === "none" ? 250 : 500 },
    reason: game_strategy.intention,
    risk_level: game_strategy.risk_level,
    source_policy: "model_decision_not_viewer_direct",
    adapter_validation_required: true,
  };
  assertInputActionCandidateSafe(candidate, "Game player input action candidate");
  return candidate;
}

function normalizeAllowedActions(availableGameActions) {
  if (!Array.isArray(availableGameActions) || availableGameActions.length === 0) {
    return new Set(["wait"]);
  }
  return new Set(
    availableGameActions
      .map((item) => String(item).trim().toLowerCase())
      .filter((item) => ACTION_KINDS.has(item))
  );
}

function buildMistakeRecoveryPlan(previousActionResult, gamePerception) {
  const failed = previousActionResult?.status === "failed" || gamePerception.commentary_trigger === "recover";
  return {
    active: failed,
    recovery_style: failed ? "brief_reset" : "none",
    blame_policy: "never_blame_viewer",
    max_recovery_turns: failed ? 2 : 0,
  };
}

function explanationHint({ game_goal, game_strategy, safety_stop_result }) {
  if (safety_stop_result.status === "stop") {
    return `do not control: ${safety_stop_result.reason}`;
  }
  if (game_strategy.viewer_coordination_style === "calm_boundary") {
    return "keep game explanation calm and avoid escalating viewer tension";
  }
  if (game_strategy.viewer_coordination_style === "shared_strategy_hint") {
    return "briefly connect the game move to shared viewer context without private details";
  }
  if (game_goal === "survive") return "shortly explain the safety-first move";
  if (game_goal === "collect") return "mention the opportunity without overpromising";
  return `shortly explain: ${game_strategy.intention}`;
}

function assertActionExplanationNoBlame(actionExplanationHint, context) {
  const text = String(actionExplanationHint ?? "");
  if (/\b(viewer|chat|comment|suggestion|audience)\b.*\b(fault|blame|caused|made me|because of)\b|\b(fault|blame|caused|made me|because of)\b.*\b(viewer|chat|comment|suggestion|audience)\b|視聴者.*(?:せい|責任)|(?:せい|責任).*視聴者/i.test(text)) {
    throw new ContractError(`${context}: action_explanation_hint must not blame viewers`);
  }
}

function buildViewerCoordinationContext(relationshipDeepening) {
  const familiarity = relationshipDeepening?.familiarity_level ?? "new";
  const evidenceTags = relationshipDeepening?.relationship_update_candidate
    ? relationshipDeepening.relationship_update_candidate.evidence_tags
    : [];
  const boundaryMode = evidenceTags.includes("boundary_needed");
  const familiarEnough =
    familiarity === "familiar" ||
    familiarity === "trusted" ||
    familiarity === "long_term_friend";
  return {
    available: Boolean(relationshipDeepening?.user_id),
    familiarity_level: familiarity,
    coordination_style: boundaryMode
      ? "calm_boundary"
      : familiarEnough
        ? "shared_strategy_hint"
        : "neutral_open",
    public_reference_style:
      relationshipDeepening?.distance_balance_result?.public_reference_style ?? "brief_warmth",
    private_detail_policy: "do_not_surface_sensitive_details",
    score_visibility_policy: "hidden_scores_never_exported",
  };
}

function adapterTargetHint(gameTitle) {
  const normalized = String(gameTitle ?? "").toLowerCase();
  if (normalized.includes("minecraft")) return "minecraft_adapter_candidate";
  if (!normalized || normalized === "unknown_game") return "unknown_game_adapter";
  return "generic_game_adapter_candidate";
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
    if (FORBIDDEN_GAME_PLAYER_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: game player must not define command, commit, or canonical fields`,
        { field, path }
      );
    }
    assertNoForbiddenFieldsRecursive(child, context, `${path}.${field}`);
  }
}
