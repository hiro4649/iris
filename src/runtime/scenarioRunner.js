import { readFileSync } from "node:fs";
import { normalizeGameObservation } from "../adapters/game/gameObservationAdapter.js";
import { normalizeMediaWatchObservation } from "../adapters/media/mediaWatchAdapter.js";
import { normalizeIdlePresenceEvent } from "../adapters/presence/idleEventAdapter.js";
import { normalizeExternalTopicObservation } from "../adapters/topics/externalTopicAdapter.js";
import { normalizeYouTubeComment } from "../adapters/youtube/commentAdapter.js";
import { normalizeYouTubeDonation } from "../adapters/youtube/donationAdapter.js";
import { ContractError } from "../core/contracts.js";

const FORBIDDEN_SCENARIO_FIELDS = new Set([
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
]);

export async function runScenario(
  runtime,
  scenario,
  { includeRawResult = true, onStepResult = null } = {}
) {
  if (!runtime) throw new Error("runScenario requires runtime");
  assertScenarioSafe(scenario);
  const steps = Array.isArray(scenario?.steps) ? scenario.steps : [];
  const results = [];

  for (const [index, step] of steps.entries()) {
    const event = eventFromScenarioStep(step, index);
    const result = await runtime.processEvent(event);
    if (!Array.isArray(result?.candidate_review_items)) {
      throw new ContractError(`scenario step ${index}: candidate review items are required`);
    }
    const summary = {
      index,
      kind: step.kind,
      event_id: event.event_id,
      final_decision: result.core.phase15.final_decision,
      final_text: result.core.phase15.final_text,
      action_type: result.core.phase04.action_type,
      prosody_style: result.speech_cue?.prosody_style ?? null,
      motion_style: result.motion_cue?.motion_style ?? null,
      body_state_id: result.body_continuity?.body_state_id ?? null,
      rhythm_state_id: result.turn_rhythm?.rhythm_state_id ?? null,
      affective_state_id: result.affective_continuity?.affective_state_id ?? null,
      laughter_state: result.affective_continuity?.laughter_state ?? null,
      selected_habit: result.personality_habit?.selected_habit ?? null,
      expression_profile_id: result.expression_profile?.expression_profile_id ?? null,
      laugh_kind: result.expression_profile?.laugh_expression_profile?.laugh_kind ?? null,
      response_language: result.language_profile?.response_language ?? null,
      subtitle_language: result.subtitle_cue?.subtitle_language ?? null,
      subtitle_overflow_risk: result.subtitle_cue?.readability_profile?.overflow_risk ?? null,
      tongue_twister_enabled: result.tongue_twister_mode?.enabled ?? false,
      tongue_twister_language: result.tongue_twister_mode?.enabled
        ? result.tongue_twister_mode.language
        : null,
      tongue_twister_phrase_length: result.tongue_twister_mode?.enabled
        ? [...String(result.tongue_twister_mode.phrase_text ?? "")].length
        : 0,
      autonomous_state_id: result.autonomous_expression?.autonomous_state_id ?? null,
      scream_profile:
        result.autonomous_expression?.scream_reaction_plan?.scream_profile ?? null,
      familiarity_level: result.relationship_deepening?.familiarity_level ?? null,
      relationship_candidate_status: result.relationship_deepening?.relationship_update_candidate
        ? "validation_required"
        : "not_created",
      donation_reaction_style: result.donation_reaction?.reaction_style ?? null,
      media_watch_reaction_mode: result.media_watch_reaction?.reaction_mode ?? null,
      external_topic_reaction_mode: result.external_topic_reaction?.reaction_mode ?? null,
      memory_recall_decision: result.memory_recall?.recall_decision ?? null,
      selected_memory_count: result.memory_recall?.selected_memory_ids?.length ?? null,
      danger_level: result.game_perception?.danger_level ?? null,
      commentary_trigger: result.game_perception?.commentary_trigger ?? null,
      commentary_mode: result.game_commentary?.commentary_mode ?? null,
      game_goal: result.game_player?.game_goal ?? null,
      input_action_candidate_status: result.game_player?.input_action_candidate
        ? "validation_required"
        : "not_created",
      game_action_validation_status:
        result.game_action_validation?.validation_status ?? null,
      approved_game_action_kind:
        result.game_action_validation?.approved_game_input_action?.action_kind ?? null,
      game_control_status: result.game_control_result?.control_status ?? null,
      game_embodied_state: result.game_embodiment?.game_embodied_state ?? null,
      session_phase: result.stream_lifecycle?.stream_lifecycle_state?.session_phase ?? null,
      human_likeness_score:
        result.human_likeness_evaluation?.total_human_likeness_score ?? null,
      review_required: result.human_likeness_evaluation?.review_required ?? null,
      boundary_audit_status: result.boundary_audit?.audit_status ?? null,
      candidate_validation_status: result.candidate_validation?.validation_status ?? null,
      candidate_memory_approved_count:
        result.candidate_validation?.approved_memory_records?.length ?? 0,
      candidate_memory_committed_count:
        result.candidate_persistence?.memory_committed_count ?? 0,
      candidate_review_count: result.candidate_review_items.length,
      performance_duration_ms: result.performance_plan?.total_duration_ms ?? null,
    };
    if (includeRawResult) summary.result = result;
    results.push(summary);
    await onStepResult?.({ index, step, event, result, summary });
  }

  return {
    schema: "iris_scenario_result_v1",
    name: scenario?.name ?? "unnamed_scenario",
    step_count: steps.length,
    results,
  };
}

export function loadScenarioFile(filePath) {
  const parsed = JSON.parse(readFileSync(filePath, "utf8"));
  assertScenarioSafe(parsed, { context: "scenario file", filePath });
  return parsed;
}

export function eventFromScenarioStep(step, index = 0) {
  assertScenarioStepSafe(step, { context: "scenario step", index });
  switch (step.kind) {
    case "comment":
      return normalizeYouTubeComment({
        event_id: step.event_id ?? `scenario-comment-${index}`,
        trace_id: step.trace_id ?? `scenario-trace-${index}`,
        display_name: step.display_name ?? "scenario_viewer",
        author_channel_id: step.author_channel_id ?? "scenario",
        text: step.text ?? "",
      });
    case "game_observation":
      return normalizeGameObservation({
        event_id: step.event_id ?? `scenario-game-${index}`,
        trace_id: step.trace_id ?? `scenario-trace-${index}`,
        game_title: step.game_title,
        scene_summary: step.scene_summary,
        detected_events: step.detected_events,
        player_state: step.player_state,
        screen_confidence: step.screen_confidence,
      });
    case "donation":
      return normalizeYouTubeDonation({
        event_id: step.event_id ?? `scenario-donation-${index}`,
        trace_id: step.trace_id ?? `scenario-trace-${index}`,
        display_name: step.display_name ?? "scenario_donor",
        author_channel_id: step.author_channel_id ?? "scenario-donor",
        message_text: step.message_text ?? step.text ?? "",
        amount_tier: step.amount_tier ?? "small",
        currency: step.currency ?? "JPY",
      });
    case "media_watch":
      return normalizeMediaWatchObservation({
        event_id: step.event_id ?? `scenario-media-${index}`,
        trace_id: step.trace_id ?? `scenario-trace-${index}`,
        media_kind: step.media_kind,
        media_title: step.media_title,
        creator_or_channel: step.creator_or_channel,
        platform: step.platform,
        observation_summary: step.observation_summary ?? step.text,
        detected_mood: step.detected_mood,
        confidence: step.confidence,
        rights_risk_note: step.rights_risk_note,
      });
    case "external_topic":
      return normalizeExternalTopicObservation({
        event_id: step.event_id ?? `scenario-topic-${index}`,
        trace_id: step.trace_id ?? `scenario-trace-${index}`,
        topic_title: step.topic_title ?? step.title,
        topic_summary: step.topic_summary ?? step.summary ?? step.text,
        source_url: step.source_url,
        retrieved_at_ms: step.retrieved_at_ms,
        freshness_score: step.freshness_score,
        source_trust_score: step.source_trust_score,
        risk_category: step.risk_category,
      });
    case "idle":
      return normalizeIdlePresenceEvent({
        event_id: step.event_id ?? `scenario-idle-${index}`,
        trace_id: step.trace_id ?? `scenario-trace-${index}`,
        idle_reason: step.idle_reason ?? "scenario_idle",
      });
    default:
      throw new ContractError("unsupported scenario step kind", { kind: step.kind });
  }
}

export function assertScenarioSafe(
  scenario,
  { context = "scenario", maxSteps = 50, filePath = null } = {}
) {
  if (!scenario || typeof scenario !== "object" || Array.isArray(scenario)) {
    throw new ContractError(`${context}: must be an object`, { filePath });
  }
  assertNoForbiddenScenarioFields(scenario, context);
  if (!Array.isArray(scenario.steps)) {
    throw new ContractError(`${context}: must contain steps`, { filePath });
  }
  if (scenario.steps.length > maxSteps) {
    throw new ContractError(`${context}: too many steps`, {
      filePath,
      maxSteps,
      step_count: scenario.steps.length,
    });
  }
  scenario.steps.forEach((step, index) => assertScenarioStepSafe(step, { context, index }));
}

function assertScenarioStepSafe(step, { context, index }) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new ContractError(`${context}: step must be an object`, { index });
  }
  assertNoForbiddenScenarioFields(step, `${context} ${index}`);
  if (
    ![
      "comment",
      "game_observation",
      "donation",
      "media_watch",
      "external_topic",
      "idle",
    ].includes(step.kind)
  ) {
    throw new ContractError(`${context}: unsupported step kind`, {
      index,
      kind: step.kind,
    });
  }
}

function assertNoForbiddenScenarioFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenScenarioFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_SCENARIO_FIELDS.has(field)) {
      throw new ContractError(`${context}: scenario must not contain command fields`, {
        field,
        path,
      });
    }
    assertNoForbiddenScenarioFields(child, context, `${path}.${field}`);
  }
}
