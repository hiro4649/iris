import { ContractError, assertCandidateNotExecutable, assertNoWorldCommand } from "../../core/contracts.js";
import { assertGameEmbodimentSafe } from "../game/gameEmbodiment.js";
import {
  assertDonationReactionSafe,
  sanitizeDonationReactionForPublicState,
} from "../interaction/donationReaction.js";
import { assertMemoryRecallSafe } from "../memory/memoryRecall.js";
import { assertRelationshipDeepeningSafe } from "../relationship/relationshipDeepening.js";
import { containsPrivateSignal } from "../safety/privacyGuards.js";

const SESSION_PHASES = new Set([
  "pre_stream",
  "opening",
  "active",
  "winding_down",
  "post_stream",
  "archived",
]);
const STREAM_MOODS = new Set(["calm", "warm", "focused", "playful", "tired", "recovering"]);

const FORBIDDEN_LIFECYCLE_FIELDS = new Set([
  "world_command",
  "obs_command",
  "youtube_schedule",
  "youtube_metadata",
  "game_input",
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
  "persistence_writer",
  "persistence_write",
  "memory_store",
  "community_memory_store",
  "target_store",
  "conversation_state",
  "canonical_conversation_state",
  "conversation_state_export",
  "intent",
  "action_type",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "relation_score",
  "donation_amount",
  "amount_value",
  "amount_micros",
  "formatted_amount",
  "payment_rank",
  "relationship_delta",
  "raw_crisis",
  "raw_harassment",
  "private_disclosure",
  "raw_memory",
  "raw_candidate",
  "raw_candidate_payload",
  "endpoint",
  "token",
  "oauth_token",
  "api_key",
  "raw_logs",
  "raw_comments",
  "private_ids",
  "private_memory",
  "sensitive_memory",
  "private_viewer_id",
  "viewer_private_note",
]);

const SAFE_NEXT_STREAM_SEED_BURDEN_POLICIES = new Set([
  "optional_not_homework",
  "explain_for_new_viewers",
  "no_private_detail",
]);
const PRE_STREAM_PRIMING_FIELDS = new Set([
  "schema",
  "previous_topic_summary",
  "meme_summary",
  "safety_summary",
  "goal_summary",
  "privacy_policy",
]);

const NEW_VIEWER_EXCLUSION_PATTERNS = [
  /inside[- ]?only/i,
  /members[- ]?only/i,
  /new viewers? (?:won'?t|cannot|can't|do not|don't) understand/i,
  /exclude new viewers?/i,
  /内輪/,
  /新規.*排除/,
];
const NEXT_STREAM_SEED_COMMAND_FIELDS = new Set([
  "world_command",
  "obs_command",
  "youtube_schedule",
  "youtube_metadata",
  "game_input",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
]);

export function createStreamLifecycle({
  event,
  coreResult,
  gameEmbodiment,
  relationshipDeepening,
  memoryRecall,
  donationReaction = null,
  streamId = "local-dev-stream",
  previousLifecycle = null,
  streamMetrics = null,
  safetyNote = null,
} = {}) {
  assertNoWorldCommand(event, "Stream lifecycle event input");
  assertNoWorldCommand(coreResult, "Stream lifecycle core input");
  assertGameEmbodimentSafe(gameEmbodiment, "Stream lifecycle game embodiment input");
  assertRelationshipDeepeningSafe(
    relationshipDeepening,
    "Stream lifecycle relationship input"
  );
  assertMemoryRecallSafe(memoryRecall, "Stream lifecycle memory recall input");
  if (donationReaction) {
    assertDonationReactionSafe(donationReaction, "Stream lifecycle donation input");
  }

  const phase01 = coreResult?.phase01 ?? {};
  const phase15 = coreResult?.phase15 ?? {};
  const session_phase = deriveSessionPhase({ phase01, previousLifecycle });
  const keyEvents = buildKeyEvents({ phase01, gameEmbodiment, memoryRecall });
  const memory_carryover_candidates = buildMemoryCarryoverCandidates({
    phase01,
    phase15,
    keyEvents,
    session_phase,
  });
  const community_memory_candidates = buildCommunityCandidates({
    phase01,
    phase15,
    gameEmbodiment,
  });
  const next_stream_seed = buildNextStreamSeed({
    phase01,
    keyEvents,
    community_memory_candidates,
    session_phase,
  });
  const pre_stream_priming = buildPreStreamPriming({
    previousLifecycle,
    next_stream_seed,
    session_phase,
  });
  const stream_metrics_summary = buildStreamMetricsSummary(
    streamMetrics ?? phase01.stream_metrics ?? event?.payload?.stream_metrics ?? null
  );
  const donation_carryover_summary = buildDonationCarryoverSummary(donationReaction);
  const safety_note_summary = buildSafetyNoteSummary(
    safetyNote ?? phase01.safety_note ?? event?.payload?.safety_note ?? null
  );
  const lifecycle = {
    schema: "iris_stream_lifecycle_v1",
    trace_id: phase15.trace_id ?? phase01.trace_id ?? event?.trace_id ?? null,
    event_id: phase15.event_id ?? phase01.event_id ?? event?.event_id ?? null,
    internal_profile: true,
    stream_lifecycle_state: {
      stream_id: sanitizeId(streamId),
      session_phase,
      stream_mood: deriveStreamMood({ gameEmbodiment, phase15 }),
      energy_level: deriveEnergyLevel(coreResult),
      key_events: keyEvents,
      shared_jokes: buildSharedJokes({ gameEmbodiment }),
      unresolved_topics: buildUnresolvedTopics({ phase01, gameEmbodiment }),
      next_stream_seed,
    },
    post_stream_summary:
      session_phase === "post_stream" || session_phase === "archived"
        ? buildPostStreamSummary({ keyEvents, next_stream_seed })
        : null,
    memory_carryover_candidates,
    community_memory_candidates,
    next_stream_seed,
    pre_stream_priming,
    stream_metrics_summary,
    donation_carryover_summary,
    safety_note_summary,
    reflection_safety_result: buildReflectionSafetyResult({
      memory_carryover_candidates,
      community_memory_candidates,
      next_stream_seed,
      pre_stream_priming,
    }),
    adapter_validation_required: true,
  };

  assertStreamLifecycleSafe(lifecycle, "Stream lifecycle output");
  return lifecycle;
}

export function assertStreamLifecycleSafe(streamLifecycle, context = "stream lifecycle") {
  if (!streamLifecycle || typeof streamLifecycle !== "object") {
    throw new ContractError(`${context}: missing stream lifecycle export`);
  }
  assertNoWorldCommand(streamLifecycle, context);
  assertNoForbiddenFieldsRecursive(streamLifecycle, context);
  assertNoSessionPhaseCanonicalExport(streamLifecycle, context);
  if (streamLifecycle.schema !== "iris_stream_lifecycle_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: streamLifecycle.schema });
  }
  if (streamLifecycle.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (streamLifecycle.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  const state = streamLifecycle.stream_lifecycle_state;
  if (!SESSION_PHASES.has(state?.session_phase)) {
    throw new ContractError(`${context}: unsupported session_phase`, {
      session_phase: state?.session_phase,
    });
  }
  if (!STREAM_MOODS.has(state?.stream_mood)) {
    throw new ContractError(`${context}: unsupported stream_mood`, {
      stream_mood: state?.stream_mood,
    });
  }
  if (!Array.isArray(streamLifecycle.memory_carryover_candidates)) {
    throw new ContractError(`${context}: memory carryover candidates are required`);
  }
  if (!Array.isArray(streamLifecycle.community_memory_candidates)) {
    throw new ContractError(`${context}: community memory candidates are required`);
  }
  for (const candidate of streamLifecycle.memory_carryover_candidates) {
    assertCandidateNotExecutable(candidate, `${context} memory carryover candidate`);
    assertCarryoverCandidateNotPersistenceBound(
      candidate,
      `${context} memory carryover candidate`
    );
    if (candidate.candidate_kind !== "memory_carryover_candidate") {
      throw new ContractError(`${context}: invalid memory carryover candidate kind`, {
        candidate_kind: candidate.candidate_kind,
      });
    }
  }
  for (const candidate of streamLifecycle.community_memory_candidates) {
    assertCandidateNotExecutable(candidate, `${context} community memory candidate`);
    assertCarryoverCandidateNotPersistenceBound(
      candidate,
      `${context} community memory candidate`
    );
    if (candidate.candidate_kind !== "community_memory_candidate") {
      throw new ContractError(`${context}: invalid community memory candidate kind`, {
        candidate_kind: candidate.candidate_kind,
      });
    }
  }
  assertNextStreamSeedSafe(streamLifecycle.next_stream_seed, context);
  assertNextStreamSeedSafe(state.next_stream_seed, `${context} stream state`);
  assertUnresolvedTopicsSafe(state.unresolved_topics, `${context} stream state`);
  assertPreStreamPrimingSafe(streamLifecycle.pre_stream_priming, context);
  assertStreamMetricsSummarySafe(streamLifecycle.stream_metrics_summary, context);
  assertDonationCarryoverSummarySafe(streamLifecycle.donation_carryover_summary, context);
  assertSafetyNoteSummarySafe(streamLifecycle.safety_note_summary, context);
  assertPostStreamReflectionCandidateOnly(streamLifecycle, context);
}

export function sanitizeStreamLifecycleForPublicState(streamLifecycle) {
  if (!streamLifecycle) return null;
  assertStreamLifecycleSafe(streamLifecycle, "Stream lifecycle public summary");
  const publicExport = {
    schema: streamLifecycle.schema,
    trace_id: streamLifecycle.trace_id,
    event_id: streamLifecycle.event_id,
    internal_profile: true,
    stream_lifecycle_state: streamLifecycle.stream_lifecycle_state,
    post_stream_summary: streamLifecycle.post_stream_summary,
    memory_carryover_candidate_count: streamLifecycle.memory_carryover_candidates.length,
    community_memory_candidate_count: streamLifecycle.community_memory_candidates.length,
    next_stream_seed: streamLifecycle.next_stream_seed,
    pre_stream_priming: streamLifecycle.pre_stream_priming,
    stream_metrics_summary: streamLifecycle.stream_metrics_summary,
    donation_carryover_summary: streamLifecycle.donation_carryover_summary,
    safety_note_summary: streamLifecycle.safety_note_summary,
    reflection_safety_result: streamLifecycle.reflection_safety_result,
    adapter_validation_required: true,
  };
  assertLifecyclePublicExportSafe(publicExport, "Stream lifecycle public export");
  return publicExport;
}

function deriveSessionPhase({ phase01, previousLifecycle }) {
  const requested = phase01.normalized_text?.match(/\b(pre_stream|opening|winding_down|post_stream|archived)\b/i)?.[1];
  if (requested) return requested.toLowerCase();
  if (phase01.payload_kind === "presence_idle" && previousLifecycle?.session_phase === "winding_down") {
    return "post_stream";
  }
  if (previousLifecycle?.session_phase && SESSION_PHASES.has(previousLifecycle.session_phase)) {
    return previousLifecycle.session_phase === "pre_stream" ? "opening" : previousLifecycle.session_phase;
  }
  return phase01.intent === "ignore" ? "opening" : "active";
}

function deriveStreamMood({ gameEmbodiment, phase15 }) {
  if (gameEmbodiment.game_embodied_state === "burst_laugh_game") return "playful";
  if (gameEmbodiment.game_embodied_state === "panic_light") return "focused";
  if (gameEmbodiment.game_embodied_state === "recovery") return "recovering";
  if (!phase15.final_text) return "calm";
  return "warm";
}

function deriveEnergyLevel(coreResult) {
  const energy = coreResult?.affectSnapshot?.energy;
  if (typeof energy === "number") return clamp01(energy);
  return 0.5;
}

function buildKeyEvents({ phase01, gameEmbodiment, memoryRecall }) {
  const events = [];
  if (phase01.payload_kind === "game_observation") {
    const context = phase01.game_context ?? {};
    const detected = Array.isArray(context.detected_events)
      ? context.detected_events.filter(Boolean).slice(0, 4).join(", ")
      : "";
    const scene = safeSummary(context.scene_summary ?? "", 180);
    const player = safeSummary(context.player_state ?? "", 100);
    const summaryParts = [
      `game:${context.game_title ?? "unknown_game"}`,
      gameEmbodiment.game_embodied_state,
      scene ? `scene=${scene}` : null,
      player ? `player=${player}` : null,
      detected ? `events=${safeSummary(detected, 140)}` : null,
    ].filter(Boolean);
    events.push({
      event_kind: "game_moment",
      summary: summaryParts.join("; "),
      retention_hint: gameEmbodiment.game_embodied_state === "not_observed" ? "drop" : "review",
    });
  }
  if (memoryRecall.recall_decision === "recall") {
    events.push({
      event_kind: "memory_recall",
      summary: "a safe memory recall was selected",
      retention_hint: "review",
    });
  }
  if (events.length === 0 && phase01.normalized_text) {
    events.push({
      event_kind: "viewer_interaction",
      summary: "IRIS responded to a viewer interaction",
      retention_hint: "light",
    });
  }
  return events.slice(0, 5);
}

function buildMemoryCarryoverCandidates({ phase01, phase15, keyEvents, session_phase }) {
  if (session_phase === "pre_stream" || keyEvents.length === 0) return [];
  const candidate = {
    schema: "iris_memory_carryover_candidate_v1",
    candidate_kind: "memory_carryover_candidate",
    requires_validation: true,
    trace_id: phase15.trace_id ?? phase01.trace_id ?? null,
    event_id: phase15.event_id ?? phase01.event_id ?? null,
    summary_hint: keyEvents[0].summary,
    retention_hint: keyEvents[0].retention_hint,
    lifecycle_phase: session_phase,
    privacy_policy: "no_private_detail_without_validator",
  };
  assertCandidateNotExecutable(candidate, "Stream lifecycle memory carryover candidate");
  return [candidate];
}

function buildCommunityCandidates({ phase01, phase15, gameEmbodiment }) {
  if (gameEmbodiment.game_embodied_state !== "burst_laugh_game") return [];
  const candidate = {
    schema: "iris_community_memory_candidate_v1",
    candidate_kind: "community_memory_candidate",
    requires_validation: true,
    trace_id: phase15.trace_id ?? phase01.trace_id ?? null,
    event_id: phase15.event_id ?? phase01.event_id ?? null,
    summary_hint: "safe funny game moment",
    community_policy: "keep_open_for_new_viewers",
    privacy_policy: "no_person_specific_detail",
  };
  assertCandidateNotExecutable(candidate, "Stream lifecycle community memory candidate");
  return [candidate];
}

function buildNextStreamSeed({ phase01, keyEvents, community_memory_candidates, session_phase }) {
  const seeds = [];
  if (keyEvents.some((event) => event.event_kind === "game_moment")) {
    seeds.push({
      seed_kind: "game_continuity",
      hint: "briefly continue from the last game situation",
      burden_policy: "optional_not_homework",
    });
  }
  if (community_memory_candidates.length > 0) {
    seeds.push({
      seed_kind: "community_moment",
      hint: "lightly recall the shared funny moment",
      burden_policy: "explain_for_new_viewers",
    });
  }
  if (session_phase === "post_stream" && phase01.display_name) {
    seeds.push({
      seed_kind: "warm_return",
      hint: "start next stream with a calm continuity greeting",
      burden_policy: "no_private_detail",
    });
  }
  return seeds.slice(0, 3);
}

function buildSharedJokes({ gameEmbodiment }) {
  if (gameEmbodiment.game_embodied_state !== "burst_laugh_game") return [];
  return [
    {
      joke_kind: "safe_game_moment",
      summary: "shared laugh from a harmless game situation",
      openness_policy: "explain_if_reused",
    },
  ];
}

function buildUnresolvedTopics({ phase01, gameEmbodiment }) {
  const topics = [];
  if (
    phase01.payload_kind === "game_observation" &&
    ["focused", "panic_light", "recovery"].includes(gameEmbodiment.game_embodied_state)
  ) {
    topics.push({
      topic_kind: "game_followup",
      summary: "check whether the game situation stabilized",
      burden_policy: "optional",
    });
  }
  return topics;
}

function buildPostStreamSummary({ keyEvents, next_stream_seed }) {
  return {
    summary_kind: "post_stream_reflection",
    reflection_candidate_policy: "candidate_only_no_direct_commit",
    summary_policy: "counts_highlights_safe_labels_only",
    retained_event_count: keyEvents.filter((event) => event.retention_hint !== "drop").length,
    next_seed_count: next_stream_seed.length,
    highlight_count: keyEvents.filter((event) => event.retention_hint !== "drop").length,
    safe_labels: ["post_stream_reflection", "candidate_review_required"],
    improvement_hint: "keep reactions compact and safe",
    boundary_policy: {
      counts_highlights_safe_labels_only: true,
      no_raw_logs: true,
      no_raw_comments: true,
      no_raw_support_text: true,
    },
  };
}

function assertPostStreamReflectionCandidateOnly(streamLifecycle, context) {
  if (!streamLifecycle.post_stream_summary) return;
  if (streamLifecycle.post_stream_summary.summary_kind !== "post_stream_reflection") {
    throw new ContractError(`${context}: invalid post-stream reflection summary kind`, {
      summary_kind: streamLifecycle.post_stream_summary.summary_kind,
    });
  }
  if (
    streamLifecycle.post_stream_summary.reflection_candidate_policy !==
    "candidate_only_no_direct_commit"
  ) {
    throw new ContractError(
      `${context}: post-stream reflection must stay candidate-only`
    );
  }
  if (
    streamLifecycle.post_stream_summary.summary_policy !==
    "counts_highlights_safe_labels_only"
  ) {
    throw new ContractError(`${context}: post-stream review must stay safe summary only`);
  }
  if (
    !Number.isInteger(streamLifecycle.post_stream_summary.highlight_count) ||
    streamLifecycle.post_stream_summary.highlight_count < 0 ||
    !Array.isArray(streamLifecycle.post_stream_summary.safe_labels) ||
    streamLifecycle.post_stream_summary.safe_labels.some(
      (label) => typeof label !== "string" || !/^[a-z0-9_]{1,64}$/.test(label)
    )
  ) {
    throw new ContractError(`${context}: invalid post-stream safe highlights`);
  }
  assertPostStreamReviewBoundaryPolicy(
    streamLifecycle.post_stream_summary.boundary_policy,
    context
  );
  for (const candidate of [
    ...streamLifecycle.memory_carryover_candidates,
    ...streamLifecycle.community_memory_candidates,
  ]) {
    if (candidate.requires_validation !== true) {
      throw new ContractError(
        `${context}: post-stream reflection candidates require validation`
      );
    }
  }
}

function assertPostStreamReviewBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: post-stream boundary policy required`);
  }
  for (const field of [
    "counts_highlights_safe_labels_only",
    "no_raw_logs",
    "no_raw_comments",
    "no_raw_support_text",
  ]) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: post-stream ${field} boundary required`);
    }
  }
}

function buildStreamMetricsSummary(streamMetrics) {
  if (!streamMetrics || typeof streamMetrics !== "object" || Array.isArray(streamMetrics)) {
    return null;
  }
  return {
    schema: "iris_stream_metrics_summary_v1",
    metric_status: safeMetricStatus(streamMetrics.status),
    viewer_count: safeCount(streamMetrics.viewer_count ?? streamMetrics.viewers),
    chat_count: safeCount(streamMetrics.chat_count ?? streamMetrics.comments),
    event_count: safeCount(streamMetrics.event_count ?? streamMetrics.events),
    error_count: safeCount(streamMetrics.error_count ?? streamMetrics.errors),
    summary_policy: "counts_status_only",
  };
}

function assertStreamMetricsSummarySafe(streamMetricsSummary, context) {
  if (streamMetricsSummary === null || streamMetricsSummary === undefined) return;
  if (streamMetricsSummary.schema !== "iris_stream_metrics_summary_v1") {
    throw new ContractError(`${context}: invalid stream metrics summary schema`, {
      schema: streamMetricsSummary.schema,
    });
  }
  if (streamMetricsSummary.summary_policy !== "counts_status_only") {
    throw new ContractError(`${context}: stream metrics must stay summary/count/status only`);
  }
  for (const field of [
    "viewer_count",
    "chat_count",
    "event_count",
    "error_count",
  ]) {
    if (!Number.isInteger(streamMetricsSummary[field]) || streamMetricsSummary[field] < 0) {
      throw new ContractError(`${context}: stream metrics count must be a non-negative integer`, {
        field,
      });
    }
  }
  for (const [field, value] of Object.entries(streamMetricsSummary)) {
    if (field.startsWith("raw_") || field === "private_ids") {
      throw new ContractError(`${context}: stream metrics must not expose raw or private fields`, {
        field,
      });
    }
    if (typeof value === "string" && containsPrivateSignal(value)) {
      throw new ContractError(`${context}: stream metrics must not expose private detail`, {
        field,
      });
    }
  }
}

function buildDonationCarryoverSummary(donationReaction) {
  if (!donationReaction) return null;
  const publicSummary = sanitizeDonationReactionForPublicState(donationReaction);
  return {
    schema: "iris_donation_carryover_summary_v1",
    donation_event_status: publicSummary.donation_event_status,
    gratitude_status: publicSummary.gratitude_context.gratitude_status,
    support_context_kind: publicSummary.gratitude_context.support_context_kind,
    carryover_seed: "brief_gratitude_only",
    relationship_effect: "not_committed",
    amount_policy: "no_amount_comparison",
  };
}

function assertDonationCarryoverSummarySafe(donationCarryoverSummary, context) {
  if (donationCarryoverSummary === null || donationCarryoverSummary === undefined) return;
  if (donationCarryoverSummary.schema !== "iris_donation_carryover_summary_v1") {
    throw new ContractError(`${context}: invalid donation carryover summary schema`, {
      schema: donationCarryoverSummary.schema,
    });
  }
  if (
    donationCarryoverSummary.carryover_seed !== "brief_gratitude_only" ||
    donationCarryoverSummary.relationship_effect !== "not_committed" ||
    donationCarryoverSummary.amount_policy !== "no_amount_comparison"
  ) {
    throw new ContractError(`${context}: donation carryover must not use amount or confirm relationship`);
  }
  for (const [field, value] of Object.entries(donationCarryoverSummary)) {
    if (
      /amount_(?:value|micros|comparison)|rank|ranking|relationship_delta|relation_score/i.test(field)
    ) {
      throw new ContractError(`${context}: donation carryover exposes unsafe amount or relationship field`, {
        field,
      });
    }
    if (
      field !== "amount_policy" &&
      typeof value === "string" &&
      /\b(?:highest|largest|top|rank|ranking|paid|amount|exclusive|relationship boost|closer because)\b/i.test(value)
    ) {
      throw new ContractError(`${context}: donation carryover must stay gratitude-only`, {
        field,
      });
    }
  }
}

function buildSafetyNoteSummary(safetyNote) {
  if (!safetyNote) return null;
  const source =
    typeof safetyNote === "object" && !Array.isArray(safetyNote)
      ? safetyNote
      : { status: safetyNote };
  return {
    schema: "iris_safety_note_summary_v1",
    safety_status: safeSafetyStatus(source.status ?? source.kind ?? source.level),
    attention_label: safeSafetyAttentionLabel(source.attention_label ?? source.reason),
    summary_policy: "safe_label_no_raw_disclosure",
  };
}

function assertSafetyNoteSummarySafe(safetyNoteSummary, context) {
  if (safetyNoteSummary === null || safetyNoteSummary === undefined) return;
  if (safetyNoteSummary.schema !== "iris_safety_note_summary_v1") {
    throw new ContractError(`${context}: invalid safety note summary schema`, {
      schema: safetyNoteSummary.schema,
    });
  }
  if (safetyNoteSummary.summary_policy !== "safe_label_no_raw_disclosure") {
    throw new ContractError(`${context}: safety note must be safe summary only`);
  }
  for (const [field, value] of Object.entries(safetyNoteSummary)) {
    if (/raw|crisis_text|harassment_text|private_disclosure/i.test(field)) {
      throw new ContractError(`${context}: safety note must not expose raw safety text`, {
        field,
      });
    }
    if (typeof value === "string" && containsUnsafeSafetyNoteDetail(value)) {
      throw new ContractError(`${context}: safety note must not expose raw crisis, harassment, or private disclosure`, {
        field,
      });
    }
  }
}

function assertLifecyclePublicExportSafe(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertLifecyclePublicExportSafe(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (
      FORBIDDEN_LIFECYCLE_FIELDS.has(field) ||
      /^(?:raw_|.*_token$|endpoint$|api_key$)/i.test(field)
    ) {
      throw new ContractError(`${context}: lifecycle export must not expose raw, private, command, token, or endpoint fields`, {
        field,
        path,
      });
    }
    if (
      typeof child === "string" &&
      /\b(?:world_command|raw memory|raw candidate|private viewer|endpoint|oauth|token|api[_-]?key|bearer)\b|https?:\/\//i.test(child)
    ) {
      throw new ContractError(`${context}: lifecycle export contains unsafe public text`, {
        field,
        path,
      });
    }
    assertLifecyclePublicExportSafe(child, context, `${path}.${field}`);
  }
}

function buildReflectionSafetyResult({
  memory_carryover_candidates,
  community_memory_candidates,
  next_stream_seed,
  pre_stream_priming = null,
}) {
  const privateSeedRisk = next_stream_seed.some((seed) => containsPrivateSignal(seed.hint));
  const privatePrimingRisk = pre_stream_priming
    ? Object.values(pre_stream_priming).some((value) => typeof value === "string" && containsPrivateSignal(value))
    : false;
  return {
    status: privateSeedRisk || privatePrimingRisk ? "reject" : "safe",
    memory_candidates_require_validation: memory_carryover_candidates.length,
    community_candidates_require_validation: community_memory_candidates.length,
    next_stream_seed_policy: "no_private_detail_no_inside_exclusion",
    rejected_reason: privateSeedRisk || privatePrimingRisk ? "privacy_risk" : null,
  };
}

function buildPreStreamPriming({ previousLifecycle, next_stream_seed, session_phase }) {
  if (session_phase !== "pre_stream" && session_phase !== "opening") return null;
  const previousState = previousLifecycle?.stream_lifecycle_state ?? previousLifecycle ?? {};
  const previousTopics = Array.isArray(previousState.unresolved_topics)
    ? previousState.unresolved_topics
    : [];
  const previousJokes = Array.isArray(previousState.shared_jokes) ? previousState.shared_jokes : [];
  return {
    schema: "iris_pre_stream_priming_summary_v1",
    previous_topic_summary:
      safePrimingSummary(previousTopics[0]?.summary) ??
      safePrimingSummary(next_stream_seed[0]?.hint) ??
      "no_previous_topic",
    meme_summary: safePrimingSummary(previousJokes[0]?.summary) ?? "no_recent_meme",
    safety_summary: "use_safe_public_context_only",
    goal_summary: safePrimingSummary(next_stream_seed[0]?.seed_kind) ?? "start_warmly",
    privacy_policy: "safe_summary_public_only",
  };
}

function assertPreStreamPrimingSafe(preStreamPriming, context) {
  if (preStreamPriming === null || preStreamPriming === undefined) return;
  if (preStreamPriming.schema !== "iris_pre_stream_priming_summary_v1") {
    throw new ContractError(`${context}: invalid pre-stream priming schema`, {
      schema: preStreamPriming.schema,
    });
  }
  if (preStreamPriming.privacy_policy !== "safe_summary_public_only") {
    throw new ContractError(`${context}: pre-stream priming must use safe summary privacy policy`);
  }
  for (const [field, value] of Object.entries(preStreamPriming)) {
    if (!PRE_STREAM_PRIMING_FIELDS.has(field)) {
      throw new ContractError(`${context}: pre-stream priming contains unsupported field`, {
        field,
      });
    }
    if (typeof value !== "string") {
      throw new ContractError(`${context}: pre-stream priming must only expose safe text fields`, {
        field,
      });
    }
    if (containsPrivateSignal(value)) {
      throw new ContractError(`${context}: pre-stream priming must not include private data`, {
        field,
      });
    }
  }
}

function assertNextStreamSeedSafe(nextStreamSeed, context) {
  if (!Array.isArray(nextStreamSeed)) {
    throw new ContractError(`${context}: next_stream_seed must be an array`);
  }
  for (const seed of nextStreamSeed) {
    if (!seed || typeof seed !== "object") {
      throw new ContractError(`${context}: next_stream_seed item must be an object`);
    }
    if (!SAFE_NEXT_STREAM_SEED_BURDEN_POLICIES.has(seed.burden_policy)) {
      throw new ContractError(`${context}: next_stream_seed requires safe burden policy`, {
        burden_policy: seed.burden_policy,
      });
    }
    for (const field of Object.keys(seed)) {
      if (NEXT_STREAM_SEED_COMMAND_FIELDS.has(field)) {
        throw new ContractError(`${context}: next_stream_seed must not produce commands or game input`, {
          field,
        });
      }
    }
    const searchable = Object.entries(seed)
      .filter(([field, value]) => field !== "burden_policy" && typeof value === "string")
      .map(([, value]) => value)
      .join(" ");
    if (containsPrivateSignal(searchable)) {
      throw new ContractError(`${context}: next_stream_seed must not include private detail`);
    }
    if (
      NEW_VIEWER_EXCLUSION_PATTERNS.some((pattern) => pattern.test(searchable)) &&
      seed.burden_policy !== "explain_for_new_viewers"
    ) {
      throw new ContractError(`${context}: next_stream_seed must not exclude new viewers`);
    }
  }
}

function assertUnresolvedTopicsSafe(unresolvedTopics, context) {
  if (!Array.isArray(unresolvedTopics)) {
    throw new ContractError(`${context}: unresolved_topics must be an array`);
  }
  for (const topic of unresolvedTopics) {
    if (!topic || typeof topic !== "object") {
      throw new ContractError(`${context}: unresolved_topic item must be an object`);
    }
    const searchable = Object.entries(topic)
      .filter(([, value]) => typeof value === "string")
      .map(([, value]) => value)
      .join(" ");
    if (containsPrivateSignal(searchable)) {
      throw new ContractError(`${context}: unresolved_topic must not include private detail`);
    }
    if (NEW_VIEWER_EXCLUSION_PATTERNS.some((pattern) => pattern.test(searchable))) {
      throw new ContractError(`${context}: unresolved_topic must not be inside-only`);
    }
  }
}

function assertCarryoverCandidateNotPersistenceBound(candidate, context) {
  const approvedSchema =
    candidate.approved_schema === true ||
    candidate.schema === "iris_approved_memory_record_v1" ||
    candidate.schema === "iris_approved_community_memory_record_v1";
  for (const field of [
    "persistence_writer",
    "persistence_write",
    "memory_store",
    "community_memory_store",
    "target_store",
  ]) {
    if (Object.prototype.hasOwnProperty.call(candidate, field) && !approvedSchema) {
      throw new ContractError(
        `${context}: carryover candidate must not be sent to persistence without approved schema`,
        { field }
      );
    }
  }
}

function sanitizeId(value) {
  return String(value ?? "local-dev-stream")
    .replace(/[^a-zA-Z0-9:_-]/g, "_")
    .slice(0, 80);
}

function safeSummary(value, maxLength = 160) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function safePrimingSummary(value, maxLength = 120) {
  const text = safeSummary(value, maxLength);
  if (!text || containsPrivateSignal(text)) return null;
  return text;
}

function safeMetricStatus(value) {
  const status = String(value ?? "unknown")
    .replace(/[^a-zA-Z0-9:_-]/g, "_")
    .slice(0, 40);
  return containsPrivateSignal(status) ? "redacted" : status || "unknown";
}

function safeCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.floor(number);
}

function safeSafetyStatus(value) {
  const status = String(value ?? "none")
    .toLowerCase()
    .replace(/[^a-z0-9:_-]/g, "_")
    .slice(0, 40);
  if (containsUnsafeSafetyNoteDetail(status)) return "attention_required";
  return status || "none";
}

function safeSafetyAttentionLabel(value) {
  const label = String(value ?? "none")
    .toLowerCase()
    .replace(/[^a-z0-9:_-]/g, "_")
    .slice(0, 60);
  if (containsUnsafeSafetyNoteDetail(label)) return "operator_attention_required";
  return label || "none";
}

function containsUnsafeSafetyNoteDetail(value) {
  const text = String(value ?? "");
  return (
    containsPrivateSignal(text) ||
    /\b(?:suicide|self[- ]?harm|kill myself|crisis text|harassment text|slur|doxx|private disclosure)\b/i.test(text)
  );
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0.5;
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
    if (FORBIDDEN_LIFECYCLE_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: stream lifecycle must not define command, commit, or canonical fields`,
        { field, path }
      );
    }
    assertNoForbiddenFieldsRecursive(child, context, `${path}.${field}`);
  }
}

function assertNoSessionPhaseCanonicalExport(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoSessionPhaseCanonicalExport(item, context, `${path}[${index}]`)
    );
    return;
  }
  const entries = Object.entries(value);
  const declaresConversationState = entries.some(([field, child]) => {
    const normalizedField = String(field).toLowerCase();
    return (
      ["kind", "type", "key", "name", "enum", "canonical_enum"].includes(normalizedField) &&
      child === "conversation_state"
    );
  });
  if (declaresConversationState) {
    const exportedSessionPhase = entries.some(([field, child]) => {
      const normalizedField = String(field).toLowerCase();
      return (
        ["value", "state", "status", "phase", "session_phase"].includes(normalizedField) &&
        SESSION_PHASES.has(child)
      );
    });
    if (exportedSessionPhase) {
      throw new ContractError(
        `${context}: session_phase must not be exported as conversation_state`,
        { path }
      );
    }
  }
  for (const [field, child] of entries) {
    assertNoSessionPhaseCanonicalExport(child, context, `${path}.${field}`);
  }
}
