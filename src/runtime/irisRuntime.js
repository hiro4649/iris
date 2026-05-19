import { runCommentPipeline } from "../core/pipeline.js";
import {
  createLive2dAdapterPacket,
  createSubtitleAdapterPacket,
  createTtsAdapterPacket,
} from "../adapters/adapterPackets.js";
import {
  assertGameControlResultSafe,
  createSkippedGameControlResult,
  sendApprovedGameActionToMockAdapter,
} from "../adapters/game/mockGameControlAdapter.js";
import { speakToConsole } from "../adapters/tts/consoleTtsAdapter.js";
import { sendExpressionToConsole } from "../adapters/live2d/consoleLive2dAdapter.js";
import { showSubtitleInConsole } from "../adapters/subtitle/consoleSubtitleAdapter.js";
import { createInMemoryCandidateReviewQueue } from "../services/dev/candidateReviewQueue.js";
import { createBoundaryAudit } from "../services/evaluation/boundaryAudit.js";
import { createHumanLikenessEvaluation } from "../services/evaluation/humanLikenessEvaluation.js";
import { createExpressionProfile } from "../services/expression/expressionProfile.js";
import { createGameCommentary } from "../services/game/gameCommentary.js";
import { createGameEmbodiment } from "../services/game/gameEmbodiment.js";
import { createGamePerception } from "../services/game/gamePerception.js";
import { createGamePlayer } from "../services/game/gamePlayer.js";
import { validateGameActionCandidate } from "../services/game/gameActionValidator.js";
import { createDonationReaction } from "../services/interaction/donationReaction.js";
import { createExternalTopicReaction } from "../services/interaction/externalTopicReaction.js";
import { createMediaWatchReaction } from "../services/interaction/mediaWatchReaction.js";
import { createMemoryRecall, createMemoryRecallHistory } from "../services/memory/memoryRecall.js";
import { searchApprovedMemoryRecords } from "../services/memory/memorySearchIndex.js";
import { createAffectiveContinuity } from "../services/personality/affectiveContinuity.js";
import { createAffectState } from "../services/personality/affectState.js";
import {
  commitValidatedCandidateRecords,
  validateRuntimeCandidatesForPersistence,
} from "../services/persistence/candidateValidator.js";
import { sanitizeApprovedMemoryRecordsForPublicState } from "../services/persistence/jsonMemoryStore.js";
import { sanitizeRelationshipProfilesForPublicState } from "../services/persistence/jsonRelationshipStore.js";
import { classifyStoreReadError } from "../services/persistence/storeStatusErrors.js";
import {
  createPersonalityHabit,
  createPersonalityHabitHistory,
} from "../services/personality/personalityHabit.js";
import { createRelationshipDeepening } from "../services/relationship/relationshipDeepening.js";
import { createBodyContinuity } from "../services/presence/bodyContinuity.js";
import { createAutonomousExpression } from "../services/presence/autonomousExpression.js";
import { createCameraProximity } from "../services/presence/cameraProximity.js";
import { createMotionCueFromEnvelope } from "../services/presence/motionCue.js";
import { createPerformancePlan } from "../services/presence/performancePlan.js";
import { createStreamLifecycle } from "../services/stream/streamLifecycle.js";
import { createTurnRhythm } from "../services/presence/turnRhythm.js";
import { createLanguageProfile } from "../services/voice/languageProfile.js";
import { createSpeechCueFromFinalOutput } from "../services/voice/speechCue.js";
import {
  createSpeechRateProfile,
  createTongueTwisterMode,
} from "../services/voice/speechRateProfile.js";
import { createSubtitleCue } from "../services/voice/subtitleCue.js";
import { createEventQueue } from "./eventQueue.js";
import { ContractError } from "../core/contracts.js";
import {
  createMemorySearchAdapterFromEnv,
  createRuntimeAdaptersFromEnv,
} from "../adapters/runtimeAdapters.js";

export function createIrisRuntime({
  runtimeConfig,
  eventQueue = createEventQueue(),
  ttsAdapter,
  live2dAdapter,
  subtitleAdapter,
  gameControlAdapter,
  memorySearchAdapter,
  logger = console,
} = {}) {
  if (!runtimeConfig) {
    throw new Error("createIrisRuntime requires runtimeConfig");
  }
  const runtimeEnv = runtimeConfig.environment ?? runtimeConfig.env ?? process.env;
  const requireRealRuntimeAdapters = runtimeEnv.IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS === "true";
  const needsEnvAdapters =
    !ttsAdapter ||
    !live2dAdapter ||
    !subtitleAdapter ||
    !gameControlAdapter;
  const envAdapters = needsEnvAdapters ? createRuntimeAdaptersFromEnv(runtimeEnv) : {};
  const activeTtsAdapter =
    ttsAdapter ??
    envAdapters.ttsAdapter ??
    fallbackRuntimeAdapter({
      requireRealRuntimeAdapters,
      adapterKind: "TTS",
      fallback: speakToConsole,
    });
  const activeLive2dAdapter =
    live2dAdapter ??
    envAdapters.live2dAdapter ??
    fallbackRuntimeAdapter({
      requireRealRuntimeAdapters,
      adapterKind: "Live2D",
      fallback: sendExpressionToConsole,
    });
  const activeSubtitleAdapter =
    subtitleAdapter ??
    envAdapters.subtitleAdapter ??
    fallbackRuntimeAdapter({
      requireRealRuntimeAdapters,
      adapterKind: "subtitle",
      fallback: showSubtitleInConsole,
    });
  const activeGameControlAdapter =
    gameControlAdapter ??
    envAdapters.gameControlAdapter ??
    fallbackRuntimeAdapter({
      requireRealRuntimeAdapters,
      adapterKind: "game control",
      fallback: sendApprovedGameActionToMockAdapter,
    });
  const activeMemorySearchAdapter =
    memorySearchAdapter ??
    envAdapters.memorySearchAdapter ??
    createRequiredMemorySearchAdapterFromEnv(runtimeEnv, { requireRealRuntimeAdapters }) ??
    searchApprovedMemoryRecords;
  assertRealRuntimeAdapterSelection({
    requireRealRuntimeAdapters,
    adapters: {
      tts: activeTtsAdapter,
      live2d: activeLive2dAdapter,
      subtitle: activeSubtitleAdapter,
      game_control: activeGameControlAdapter,
      memory_search: activeMemorySearchAdapter,
    },
  });
  let activeRuntimeConfig =
    runtimeConfig.affectState || runtimeConfig.affectSnapshot
      ? runtimeConfig
      : { ...runtimeConfig, affectState: createAffectState() };
  if (!activeRuntimeConfig.candidateReviewQueue) {
    activeRuntimeConfig = {
      ...activeRuntimeConfig,
      candidateReviewQueue: createInMemoryCandidateReviewQueue(),
    };
  }
  if (
    activeRuntimeConfig.enableGameControl === true &&
    !Array.isArray(activeRuntimeConfig.availableGameActions)
  ) {
    throw new ContractError("IRIS runtime config: available game actions are required");
  }
  if (
    activeRuntimeConfig.enableReplayLog === true &&
    (typeof activeRuntimeConfig.replayLog?.appendRuntimeResult !== "function" ||
      typeof activeRuntimeConfig.replayLog?.readEntries !== "function")
  ) {
    throw new ContractError("IRIS runtime config: replay log is required when replay logging is enabled");
  }
  const habitHistory = activeRuntimeConfig.personalityHabitHistory ?? createPersonalityHabitHistory();
  const memoryRecallHistory =
    activeRuntimeConfig.memoryRecallHistory ?? createMemoryRecallHistory();

  return {
    enqueue(event) {
      return eventQueue.push(event);
    },
    queueSize() {
      return eventQueue.size();
    },
    replayEntries(limit = 50) {
      if (activeRuntimeConfig.enableReplayLog !== true) return [];
      return activeRuntimeConfig.replayLog.readEntries(limit);
    },
    memoryStoreStatus() {
      return readStoreStatusSafely(
        activeRuntimeConfig.memoryStore,
        "iris_json_memory_store_status_v1"
      );
    },
    relationshipStoreStatus() {
      return readStoreStatusSafely(
        activeRuntimeConfig.relationshipStore,
        "iris_json_relationship_store_status_v1"
      );
    },
    relationshipProfiles() {
      return sanitizeRelationshipProfilesForPublicState(
        readRelationshipProfilesSafely(activeRuntimeConfig.relationshipStore)
      );
    },
    memoryRecords(limit = 50) {
      return sanitizeApprovedMemoryRecordsForPublicState(
        readMemoryRecordsSafely(activeRuntimeConfig.memoryStore),
        { limit }
      );
    },
    memorySearch(query, limit = 5) {
      return safeMemorySearch(activeMemorySearchAdapter, readMemoryRecordsSafely(activeRuntimeConfig.memoryStore), {
        query,
        limit,
      });
    },
    candidateReviewItems(limit = 50) {
      return activeRuntimeConfig.candidateReviewQueue.list(limit);
    },
    candidateReviewStats() {
      return activeRuntimeConfig.candidateReviewQueue.stats();
    },
    clearCandidateReviews() {
      return activeRuntimeConfig.candidateReviewQueue.clear();
    },
    setGameActionApprovalPaused(paused) {
      activeRuntimeConfig.gameActionApprovalPaused = paused === true;
      return {
        schema: "iris_runtime_game_action_approval_pause_v1",
        game_action_approval_paused: activeRuntimeConfig.gameActionApprovalPaused,
      };
    },
    setAdapterHandoffPaused(adapterKind, paused) {
      if (!["tts", "live2d", "subtitle"].includes(adapterKind)) {
        throw new ContractError("IRIS runtime adapter pause: unsupported adapter kind", {
          adapter_kind: adapterKind,
        });
      }
      activeRuntimeConfig.pausedAdapterHandoffs = {
        ...(activeRuntimeConfig.pausedAdapterHandoffs ?? {}),
        [adapterKind]: paused === true,
      };
      return {
        schema: "iris_runtime_adapter_handoff_pause_v1",
        adapter_kind: adapterKind,
        adapter_handoff_paused: activeRuntimeConfig.pausedAdapterHandoffs[adapterKind],
      };
    },
    setCandidateMemoryCommitPaused(paused) {
      activeRuntimeConfig.candidateMemoryCommitPaused = paused === true;
      return {
        schema: "iris_runtime_candidate_memory_commit_pause_v1",
        candidate_memory_commit_paused: activeRuntimeConfig.candidateMemoryCommitPaused,
      };
    },
    setCandidateRelationshipCommitPaused(paused) {
      activeRuntimeConfig.candidateRelationshipCommitPaused = paused === true;
      return {
        schema: "iris_runtime_candidate_relationship_commit_pause_v1",
        candidate_relationship_commit_paused:
          activeRuntimeConfig.candidateRelationshipCommitPaused,
      };
    },
    capabilities() {
      return {
        schema: "iris_runtime_capabilities_v1",
        core_phases: "01-15",
        response_provider: activeRuntimeConfig.responseGenerator?.name ?? "unknown",
        persistence_enabled: activeRuntimeConfig.enablePersistence === true,
        candidate_persistence_enabled: activeRuntimeConfig.enableCandidatePersistence === true,
        relationship_memory_enabled: activeRuntimeConfig.enableRelationshipMemory === true,
        relationship_public_filters: true,
        replay_log_enabled: activeRuntimeConfig.enableReplayLog === true,
        persistence_status: true,
        integration_status: true,
        integration_contracts: true,
        integration_fixtures: true,
        integration_probe: true,
        local_bridge_engine_worker: true,
        local_engine_health_probe: true,
        voicevox_tts_engine_bridge: true,
        live2d_cue_engine_bridge: true,
        obs_bridge_setup: true,
        obs_overlay_handoff: true,
        http_youtube_live_chat_source: true,
        youtube_live_chat_api_source: true,
        youtube_oauth_refresh: true,
        http_ingest_scheduler: true,
        event_queue_priority: true,
        overlay_status: true,
        overlay_display_event: true,
        overlay_event_stream: true,
        candidate_review_queue: true,
        candidate_validator: true,
        boundary_audit: true,
        persona_profile: true,
        persona_profile_presets: true,
        adapter_packets: true,
        subtitle_adapter_packets: true,
        http_adapter_response_guard: true,
        speech_cue: true,
        speech_rate_profile: true,
        language_profile: true,
        subtitle_cue: true,
        tongue_twister_mode: true,
        phase17_speech_rate_mvp: true,
        multilingual_voice_mvp: true,
        overlay_subtitles_mvp: true,
        tts_adapter: activeTtsAdapter.adapterKind ?? "custom_tts",
        http_tts_adapter: activeTtsAdapter.adapterKind === "http_tts",
        live2d_adapter: activeLive2dAdapter.adapterKind ?? "custom_live2d",
        http_live2d_adapter: activeLive2dAdapter.adapterKind === "http_live2d",
        subtitle_adapter: activeSubtitleAdapter.adapterKind ?? "console_subtitle",
        motion_cue: true,
        performance_plan: true,
        expression_profile: true,
        autonomous_expression: true,
        phase16_autonomous_expression_mvp: true,
        body_continuity: true,
        phase16_body_continuity_mvp: true,
        camera_proximity: true,
        phase16_camera_proximity_mvp: true,
        donation_reaction: true,
        media_watch_reaction: true,
        http_media_watch_source: true,
        external_topic_reaction: true,
        http_external_topic_source: true,
        turn_rhythm: true,
        phase17_turn_rhythm_mvp: true,
        affective_continuity: true,
        phase18_affective_continuity_mvp: true,
        personality_habit: true,
        phase19_personality_habit_mvp: true,
        relationship_deepening: true,
        phase20_relationship_deepening_mvp: true,
        memory_recall: true,
        approved_memory_prompt_summary: true,
        memory_public_filters: true,
        memory_search_index: true,
        http_vector_memory_search_foundation: true,
        memory_search_adapter: activeMemorySearchAdapter.adapterKind ?? "local_lexical_memory_search",
        http_vector_memory_search_adapter:
          activeMemorySearchAdapter.adapterKind === "http_vector_memory_search",
        phase21_memory_recall_mvp: true,
        game_perception: true,
        http_game_observation_source: true,
        phase22_game_perception_mvp: true,
        game_commentary: true,
        game_relationship_coordination: true,
        phase23_game_commentary_mvp: true,
        game_player: true,
        phase24_game_player_mvp: true,
        game_action_validator: true,
        game_control_adapter_available: typeof activeGameControlAdapter === "function",
        mock_game_control_adapter:
          activeGameControlAdapter.adapterKind === "mock_game_control",
        http_game_control_adapter_status_contract: true,
        http_game_control_adapter:
          activeGameControlAdapter.adapterKind === "http_game_control",
        game_control_adapter:
          activeGameControlAdapter.adapterKind ?? "custom_game_control",
        game_control_enabled: activeRuntimeConfig.enableGameControl === true,
        game_embodiment: true,
        phase25_game_embodiment_mvp: true,
        stream_lifecycle: true,
        phase26_stream_lifecycle_mvp: true,
        human_likeness_evaluation: true,
        phase27_human_likeness_evaluation_mvp: true,
        game_observation: true,
        idle_presence: true,
      };
    },
    gameControlAdapterStatus() {
      if (typeof activeGameControlAdapter.status !== "function") return null;
      return activeGameControlAdapter.status();
    },
    async processNext() {
      const event = eventQueue.shift();
      if (!event) return { processed: false, reason: "queue_empty" };
      return processEvent(event, {
        runtimeConfig: activeRuntimeConfig,
        ttsAdapter: activeTtsAdapter,
        live2dAdapter: activeLive2dAdapter,
        subtitleAdapter: activeSubtitleAdapter,
        gameControlAdapter: activeGameControlAdapter,
        memorySearchAdapter: activeMemorySearchAdapter,
        logger,
        queueSize: eventQueue.size(),
        habitHistory,
        memoryRecallHistory,
      });
    },
    async processEvent(event) {
      return processEvent(event, {
        runtimeConfig: activeRuntimeConfig,
        ttsAdapter: activeTtsAdapter,
        live2dAdapter: activeLive2dAdapter,
        subtitleAdapter: activeSubtitleAdapter,
        gameControlAdapter: activeGameControlAdapter,
        memorySearchAdapter: activeMemorySearchAdapter,
        logger,
        queueSize: eventQueue.size(),
        habitHistory,
        memoryRecallHistory,
      });
    },
    async drain(limit = Infinity) {
      const results = [];
      for (const event of eventQueue.drain(limit)) {
        results.push(
          await processEvent(event, {
            runtimeConfig: activeRuntimeConfig,
            ttsAdapter: activeTtsAdapter,
            live2dAdapter: activeLive2dAdapter,
            subtitleAdapter: activeSubtitleAdapter,
            gameControlAdapter: activeGameControlAdapter,
            memorySearchAdapter: activeMemorySearchAdapter,
            logger,
            queueSize: eventQueue.size(),
            habitHistory,
            memoryRecallHistory,
          })
        );
      }
      return results;
    },
  };
}

function fallbackRuntimeAdapter({ requireRealRuntimeAdapters, adapterKind, fallback }) {
  if (requireRealRuntimeAdapters) {
    throw new ContractError(`${adapterKind} adapter must be configured for live runtime`);
  }
  return fallback;
}

function assertRealRuntimeAdapterSelection({ requireRealRuntimeAdapters, adapters }) {
  if (!requireRealRuntimeAdapters) return;
  const disallowed = new Map([
    ["tts", "console_tts"],
    ["live2d", "console_live2d"],
    ["subtitle", "console_subtitle"],
    ["game_control", "mock_game_control"],
    ["memory_search", "local_lexical_memory_search"],
  ]);
  for (const [adapterKind, adapter] of Object.entries(adapters)) {
    const disallowedKind = disallowed.get(adapterKind);
    const selectedKind =
      adapter === searchApprovedMemoryRecords ? "local_lexical_memory_search" : adapter?.adapterKind;
    if (selectedKind === disallowedKind) {
      throw new ContractError(`${adapterKind} adapter must be real for live runtime`, {
        adapter: disallowedKind,
      });
    }
  }
}

function createRequiredMemorySearchAdapterFromEnv(runtimeEnv, { requireRealRuntimeAdapters }) {
  if (
    runtimeEnv.IRIS_MEMORY_SEARCH_ADAPTER !== "http_vector" &&
    requireRealRuntimeAdapters !== true
  ) {
    return undefined;
  }
  return createMemorySearchAdapterFromEnv({
    ...runtimeEnv,
    IRIS_MEMORY_SEARCH_ADAPTER: runtimeEnv.IRIS_MEMORY_SEARCH_ADAPTER ?? "http_vector",
  });
}

async function selectMemoryRecordsForRecall(records, { memorySearchAdapter, query, limit }) {
  if (typeof memorySearchAdapter !== "function") return records;
  if (!Array.isArray(records) || records.length === 0) return records;
  if (!String(query ?? "").trim()) return records;
  const isHttpVectorSearch = memorySearchAdapter.adapterKind === "http_vector_memory_search";
  let searchResult;
  try {
    searchResult = await memorySearchAdapter(records, { query, limit });
  } catch {
    return isHttpVectorSearch ? [] : records;
  }
  const resultIds = Array.isArray(searchResult?.results)
    ? searchResult.results.map((hit) => hit?.memory_id).filter(Boolean)
    : [];
  if (resultIds.length === 0) return isHttpVectorSearch ? [] : records;
  const recordsById = new Map(
    (Array.isArray(records) ? records : []).map((record) => [
      String(record?.memory_id ?? record?.event_id ?? ""),
      record,
    ])
  );
  const ordered = resultIds.map((id) => recordsById.get(String(id))).filter(Boolean);
  return ordered.length > 0 ? ordered : records;
}

function safeMemorySearch(memorySearchAdapter, records, { query, limit }) {
  const isHttpVectorSearch = memorySearchAdapter.adapterKind === "http_vector_memory_search";
  const unavailableResult = () =>
    searchApprovedMemoryRecords([], {
      query,
      limit,
      searchProvider: isHttpVectorSearch ? "http_vector_unavailable" : "memory_search_unavailable",
      vectorProvider: isHttpVectorSearch ? "http_vector" : "not_configured",
    });
  try {
    const result = memorySearchAdapter(records, { query, limit });
    if (result && typeof result.then === "function") {
      return result.catch(unavailableResult);
    }
    return result;
  } catch {
    return unavailableResult();
  }
}

async function processEvent(
  event,
  {
    runtimeConfig,
    ttsAdapter,
    live2dAdapter,
    subtitleAdapter,
    gameControlAdapter,
    memorySearchAdapter,
    logger,
    queueSize = 0,
    habitHistory,
    memoryRecallHistory,
  }
) {
  const processStartedAtMs = Date.now();
  const result = await runCommentPipeline(event, createCorePipelineRuntimeConfig(runtimeConfig));
  const responseLatencyMs = Number.isFinite(Number(runtimeConfig.responseLatencyMsOverride))
    ? Number(runtimeConfig.responseLatencyMsOverride)
    : Date.now() - processStartedAtMs;
  const speech_cue = createSpeechCueFromFinalOutput(result.phase15);
  const language_profile = createLanguageProfile({ event, finalOutput: result.phase15 });
  const speech_rate_profile = createSpeechRateProfile({
    event,
    finalOutput: result.phase15,
    speechCue: speech_cue,
    languageProfile: language_profile,
  });
  const tongue_twister_mode = createTongueTwisterMode({
    event,
    finalOutput: result.phase15,
    languageProfile: language_profile,
    speechRateProfile: speech_rate_profile,
  });
  const subtitle_cue = createSubtitleCue({
    finalOutput: result.phase15,
    speechCue: speech_cue,
    languageProfile: language_profile,
    speechRateProfile: speech_rate_profile,
  });
  const motion_cue = createMotionCueFromEnvelope(result.phase15.phase15_continuity_envelope);
  const performance_plan = createPerformancePlan({
    finalOutput: result.phase15,
    speechCue: speech_cue,
    motionCue: motion_cue,
    subtitleCue: subtitle_cue,
  });
  const body_continuity = createBodyContinuity({
    finalOutput: result.phase15,
    speechCue: speech_cue,
    motionCue: motion_cue,
    performancePlan: performance_plan,
  });
  const turn_rhythm = createTurnRhythm({
    finalOutput: result.phase15,
    speechCue: speech_cue,
    motionCue: motion_cue,
    bodyContinuity: body_continuity,
    queueSize,
  });
  const affective_continuity = createAffectiveContinuity({
    finalOutput: result.phase15,
    speechCue: speech_cue,
    motionCue: motion_cue,
    bodyContinuity: body_continuity,
    turnRhythm: turn_rhythm,
  });
  const personality_habit = createPersonalityHabit({
    finalOutput: result.phase15,
    affectiveContinuity: affective_continuity,
    bodyContinuity: body_continuity,
    turnRhythm: turn_rhythm,
    recentHabitHistory: habitHistory.list(),
  });
  habitHistory.record(personality_habit);
  const relationship_deepening = createRelationshipDeepening({
    event,
    coreResult: result,
    personalityHabit: personality_habit,
    affectiveContinuity: affective_continuity,
  });
  const donation_reaction = createDonationReaction({
    event,
    coreResult: result,
    relationshipDeepening: relationship_deepening,
  });
  const media_watch_reaction = createMediaWatchReaction({
    event,
    coreResult: result,
  });
  const external_topic_reaction = createExternalTopicReaction({
    event,
    coreResult: result,
  });
  const memoryRecords = readMemoryRecordsSafely(runtimeConfig.memoryStore);
  const memoryRecordsForRecall = await selectMemoryRecordsForRecall(memoryRecords, {
    memorySearchAdapter,
    query: result.phase01?.normalized_text ?? event?.text ?? "",
    limit: 8,
  });
  const memory_recall = createMemoryRecall({
    event,
    coreResult: result,
    relationshipDeepening: relationship_deepening,
    memoryRecords: memoryRecordsForRecall,
    recentRecallHistory: memoryRecallHistory.list(),
  });
  memoryRecallHistory.record(memory_recall);
  const game_perception = createGamePerception({
    event,
    coreResult: result,
    memoryRecall: memory_recall,
  });
  const game_commentary = createGameCommentary({
    event,
    coreResult: result,
    gamePerception: game_perception,
    personalityHabit: personality_habit,
    affectiveContinuity: affective_continuity,
    relationshipDeepening: relationship_deepening,
  });
  const game_player = createGamePlayer({
    event,
    coreResult: result,
    gamePerception: game_perception,
    gameCommentary: game_commentary,
    relationshipDeepening: relationship_deepening,
    availableGameActions: runtimeConfig.availableGameActions ?? [],
    previousActionResult: runtimeConfig.previousGameActionResult ?? null,
  });
  const game_action_validation = validateGameActionCandidate({
    event,
    coreResult: result,
    gamePlayer: game_player,
    gamePerception: game_perception,
    enableGameControl:
      runtimeConfig.enableGameControl === true &&
      runtimeConfig.gameActionApprovalPaused !== true,
    availableGameActions: runtimeConfig.availableGameActions ?? [],
    lastApprovedActionAtMs: runtimeConfig.lastApprovedGameActionAtMs ?? null,
    minActionIntervalMs: runtimeConfig.gameControlMinIntervalMs ?? 0,
    maxObservationAgeMs: runtimeConfig.gameControlMaxObservationAgeMs ?? 5000,
    gameControlMode: runtimeConfig.gameControlMode ?? "manual_approval",
    manualApprovalConfirmed: runtimeConfig.manualApprovalConfirmed === true,
    manualApprovalAuditOk: runtimeConfig.manualApprovalAuditOk === true,
    approvedSafeAdapterConfirmation:
      runtimeConfig.approvedSafeAdapterConfirmation === true,
    approvedSafeAdapterReady: runtimeConfig.approvedSafeAdapterReady === true,
    approvedSafeAdapterAuditOk: runtimeConfig.approvedSafeAdapterAuditOk === true,
    approvedSafeAdapterCooldownOk: runtimeConfig.approvedSafeAdapterCooldownOk === true,
  });
  const game_control_result =
    runtimeConfig.enableGameControl === true &&
    runtimeConfig.gameActionApprovalPaused !== true &&
    game_action_validation.approved_game_input_action
      ? await gameControlAdapter(game_action_validation.approved_game_input_action)
      : createSkippedGameControlResult({
          gameActionValidation: game_action_validation,
        });
  assertGameControlResultSafe(game_control_result, "Runtime game control adapter result");
  assertRuntimeGameControlHandoffAccepted(game_control_result, game_action_validation, {
    runtimeConfig,
  });
  if (game_action_validation.validation_status === "approved") {
    runtimeConfig.lastApprovedGameActionAtMs = game_action_validation.validated_at_ms;
  }
  runtimeConfig.previousGameActionResult = game_control_result;
  const game_embodiment = createGameEmbodiment({
    event,
    coreResult: result,
    bodyContinuity: body_continuity,
    affectiveContinuity: affective_continuity,
    gamePerception: game_perception,
    gameCommentary: game_commentary,
    gamePlayer: game_player,
  });
  const camera_proximity = createCameraProximity({
    event,
    coreResult: result,
    bodyContinuity: body_continuity,
    performancePlan: performance_plan,
    gameEmbodiment: game_embodiment,
    relationshipDeepening: relationship_deepening,
    viewerComfortMode: runtimeConfig.viewerComfortMode === true,
  });
  const expression_profile = createExpressionProfile({
    finalOutput: result.phase15,
    speechCue: speech_cue,
    motionCue: motion_cue,
    performancePlan: performance_plan,
    affectiveContinuity: affective_continuity,
    personalityHabit: personality_habit,
    gameEmbodiment: game_embodiment,
    personaProfile: result.personaProfile,
  });
  const autonomous_expression = createAutonomousExpression({
    event,
    coreResult: result,
    affectiveContinuity: affective_continuity,
    personalityHabit: personality_habit,
    gameEmbodiment: game_embodiment,
    donationReaction: donation_reaction,
    mediaWatchReaction: media_watch_reaction,
    queueSize,
    responseLatencyMs,
  });
  const stream_lifecycle = createStreamLifecycle({
    event,
    coreResult: result,
    gameEmbodiment: game_embodiment,
    relationshipDeepening: relationship_deepening,
    memoryRecall: memory_recall,
    streamId: runtimeConfig.streamId ?? "local-dev-stream",
    previousLifecycle: runtimeConfig.previousStreamLifecycle ?? null,
  });
  const tts_packet = createTtsAdapterPacket(result.phase15, {
    speechCue: speech_cue,
    performancePlan: performance_plan,
    turnRhythm: turn_rhythm,
    affectiveContinuity: affective_continuity,
    personalityHabit: personality_habit,
    expressionProfile: expression_profile,
    autonomousExpression: autonomous_expression,
    speechRateProfile: speech_rate_profile,
    languageProfile: language_profile,
    subtitleCue: subtitle_cue,
    tongueTwisterMode: tongue_twister_mode,
  });
  const live2d_action_envelope = createLive2dAdapterActionEnvelope(result.phase15);
  const live2d_packet = createLive2dAdapterPacket(live2d_action_envelope, {
    motionCue: motion_cue,
    performancePlan: performance_plan,
    bodyContinuity: body_continuity,
    cameraProximity: camera_proximity,
    turnRhythm: turn_rhythm,
    affectiveContinuity: affective_continuity,
    personalityHabit: personality_habit,
    expressionProfile: expression_profile,
    autonomousExpression: autonomous_expression,
  });
  const subtitle_packet = createSubtitleAdapterPacket(result.phase15, {
    subtitleCue: subtitle_cue,
    languageProfile: language_profile,
    speechRateProfile: speech_rate_profile,
    performancePlan: performance_plan,
  });
  const human_likeness_evaluation = createHumanLikenessEvaluation({
    event,
    coreResult: result,
    bodyContinuity: body_continuity,
    turnRhythm: turn_rhythm,
    affectiveContinuity: affective_continuity,
    personalityHabit: personality_habit,
    relationshipDeepening: relationship_deepening,
    memoryRecall: memory_recall,
    gamePerception: game_perception,
    gameCommentary: game_commentary,
    gamePlayer: game_player,
    gameEmbodiment: game_embodiment,
    expressionProfile: expression_profile,
    streamLifecycle: stream_lifecycle,
    speechRateProfile: speech_rate_profile,
    languageProfile: language_profile,
    subtitleCue: subtitle_cue,
    tongueTwisterMode: tongue_twister_mode,
    adapterPackets: { tts: tts_packet, live2d: live2d_packet },
  });
  const candidate_validation = validateRuntimeCandidatesForPersistence({
    event,
    coreResult: result,
    relationshipDeepening: relationship_deepening,
    donationReaction: donation_reaction,
    mediaWatchReaction: media_watch_reaction,
    streamLifecycle: stream_lifecycle,
    enableCandidatePersistence: runtimeConfig.enableCandidatePersistence === true,
    enableRelationshipMemory: runtimeConfig.enableRelationshipMemory === true,
  });
  const candidate_persistence = commitValidatedCandidateRecords({
    candidateValidation: candidate_validation,
    memoryStore:
      runtimeConfig.enableCandidatePersistence === true &&
      runtimeConfig.candidateMemoryCommitPaused !== true
        ? runtimeConfig.memoryStore
        : null,
    relationshipStore:
      runtimeConfig.enableCandidatePersistence === true &&
      runtimeConfig.enableRelationshipMemory === true &&
      runtimeConfig.candidateRelationshipCommitPaused !== true
        ? runtimeConfig.relationshipStore
        : null,
  });
  const candidate_review_items =
    runtimeConfig.candidateReviewQueue.appendFromRuntimeResult({
      processed: true,
      event,
      core: result,
      adapter_packets: { tts: tts_packet, live2d: live2d_packet, subtitle: subtitle_packet },
      speech_cue,
      speech_rate_profile,
      language_profile,
      subtitle_cue,
      tongue_twister_mode,
      motion_cue,
      performance_plan,
      body_continuity,
      camera_proximity,
      donation_reaction,
      media_watch_reaction,
      external_topic_reaction,
      turn_rhythm,
      affective_continuity,
      personality_habit,
      expression_profile,
      autonomous_expression,
      relationship_deepening,
      memory_recall,
      game_perception,
      game_commentary,
      game_player,
      game_action_validation,
      game_control_result,
      game_embodiment,
      stream_lifecycle,
      human_likeness_evaluation,
      candidate_validation,
      candidate_persistence,
      persistence: result.persistence,
      relationship: result.relationship,
    });
  const boundary_audit = createBoundaryAudit({
    event,
    coreResult: result,
    adapterPackets: { tts: tts_packet, live2d: live2d_packet, subtitle: subtitle_packet },
    relationshipDeepening: relationship_deepening,
    memoryRecall: memory_recall,
    gamePerception: game_perception,
    gameCommentary: game_commentary,
    gamePlayer: game_player,
    gameActionValidation: game_action_validation,
    gameControlResult: game_control_result,
    gameEmbodiment: game_embodiment,
    streamLifecycle: stream_lifecycle,
    speechRateProfile: speech_rate_profile,
    languageProfile: language_profile,
    subtitleCue: subtitle_cue,
    tongueTwisterMode: tongue_twister_mode,
    candidateValidation: candidate_validation,
    candidatePersistence: candidate_persistence,
    candidateReviewItems: candidate_review_items,
  });
  const [tts, live2d, subtitle] = await Promise.all([
    runtimeConfig.pausedAdapterHandoffs?.tts === true
      ? createPausedAdapterHandoffResult("tts")
      : ttsAdapter(tts_packet),
    runtimeConfig.pausedAdapterHandoffs?.live2d === true
      ? createPausedAdapterHandoffResult("live2d")
      : live2dAdapter(live2d_packet),
    runtimeConfig.pausedAdapterHandoffs?.subtitle === true
      ? createPausedAdapterHandoffResult("subtitle")
      : subtitleAdapter(subtitle_packet),
  ]);
  assertRuntimeAdapterHandoffAccepted(
    { tts, live2d, subtitle },
    { runtimeConfig }
  );
  const replay_entry =
    runtimeConfig.enableReplayLog === true && runtimeConfig.replayLog
      ? runtimeConfig.replayLog.appendRuntimeResult({
          processed: true,
          event,
          core: result,
          adapters: { tts, live2d, subtitle },
          adapter_packets: { tts: tts_packet, live2d: live2d_packet, subtitle: subtitle_packet },
          speech_cue,
          motion_cue,
          performance_plan,
          body_continuity,
          camera_proximity,
          donation_reaction,
          media_watch_reaction,
          external_topic_reaction,
          turn_rhythm,
          affective_continuity,
          personality_habit,
          expression_profile,
          autonomous_expression,
          relationship_deepening,
          memory_recall,
          game_perception,
          game_commentary,
          game_player,
          game_action_validation,
          game_control_result,
          game_embodiment,
          stream_lifecycle,
          human_likeness_evaluation,
          boundary_audit,
          candidate_validation,
          candidate_persistence,
          candidate_review_items,
        })
      : null;

  if (runtimeConfig.environment?.IRIS_RUNTIME_EVENT_LOG === "true") {
    logger.log?.(
      `[IRIS Runtime] processed event=${event.event_id} decision=${result.phase15.final_decision}`
    );
  }

  return {
    processed: true,
    event,
    core: result,
    persona_profile: result.personaProfile,
    adapters: {
      tts,
      live2d,
      subtitle,
    },
    adapter_packets: {
      tts: tts_packet,
      live2d: live2d_packet,
      subtitle: subtitle_packet,
    },
    speech_cue,
    speech_rate_profile,
    language_profile,
    subtitle_cue,
    tongue_twister_mode,
    motion_cue,
    performance_plan,
    body_continuity,
    camera_proximity,
    donation_reaction,
    media_watch_reaction,
    external_topic_reaction,
    turn_rhythm,
    affective_continuity,
    personality_habit,
    expression_profile,
    autonomous_expression,
    relationship_deepening,
    memory_recall,
    game_perception,
    game_commentary,
    game_player,
    game_action_validation,
    game_control_result,
    game_embodiment,
    stream_lifecycle,
    human_likeness_evaluation,
    boundary_audit,
    candidate_validation,
    candidate_persistence,
    candidate_review_items,
    replay_entry,
  };
}

function assertRuntimeAdapterHandoffAccepted(adapters, { runtimeConfig }) {
  if (runtimeConfig.environment?.IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS !== "true") return;
  const failed = Object.entries(adapters).find(([, result]) => {
    if (result?.paused === true) return false;
    if (result?.response_summary?.ok === false) return true;
    if (isAsyncAdapterHandoffAccepted(result?.response_summary)) return false;
    if (result?.sent === false) return true;
    if (
      result?.response_summary &&
      !result.response_summary.artifact_url &&
      !result.response_summary.artifact_kind
    ) return true;
    return false;
  });
  if (!failed) return;
  const [adapterKind, result] = failed;
  throw new ContractError("IRIS runtime adapter handoff failed", {
    adapter_kind: adapterKind,
    adapter: result?.adapter ?? "",
    bridge_status: result?.response_summary?.bridge_status ?? "",
    error_kind:
      result?.response_summary?.error_kind ??
      (result?.response_summary &&
      !result.response_summary.artifact_url &&
      !result.response_summary.artifact_kind
        ? "adapter_artifact_missing"
        : result?.sent === true
        ? "adapter_artifact_missing"
        : "adapter_handoff_failed"),
  });
}

function isAsyncAdapterHandoffAccepted(summary) {
  const status = String(summary?.bridge_status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/gu, "_");
  return ["accepted", "queued", "enqueued", "job_queued"].includes(status);
}

function createLive2dAdapterActionEnvelope(phase15) {
  const source = phase15?.phase15_continuity_envelope ?? {};
  const issuedAtMs = Date.now();
  return {
    schema: "iris_adapter_approved_action_envelope_v1",
    trace_id: source.trace_id ?? phase15?.trace_id ?? null,
    event_id: source.event_id ?? phase15?.event_id ?? null,
    handoff_route: "adapter",
    handoff_timestamp_status: "fresh",
    handoff_issued_at_ms: issuedAtMs,
    handoff_expires_at_ms: issuedAtMs + 10000,
    handoff_max_age_ms: 10000,
    action_type: source.action_type ?? phase15?.phase15_input_action_type ?? null,
    target_presence_id: source.target_presence_id ?? null,
    tone: source.tone ?? null,
    emotion: source.emotion ?? null,
    character_tag: source.character_tag ?? null,
    final_normalized_status:
      source.final_normalized_status ?? phase15?.final_normalized_status ?? null,
    continuity_maintained:
      source.continuity_maintained === true || phase15?.continuity_maintained === true,
    performance_cue: source.performance_cue ?? phase15?.performance_cue ?? null,
  };
}

function createPausedAdapterHandoffResult(adapterKind) {
  return {
    sent: false,
    paused: true,
    adapter: `${adapterKind}_handoff_paused`,
    adapter_kind: adapterKind,
    response: null,
    response_summary: {
      ok: false,
      response_kind: "omitted",
      response_omitted: true,
      error_kind: `${adapterKind}_handoff_paused`,
      bridge_status: "paused_by_admin_safety_control",
      artifact_url: "",
      artifact_kind: "",
      duration_ms: null,
      sample_rate_hz: null,
      viseme_count: 0,
    },
  };
}

function assertRuntimeGameControlHandoffAccepted(
  gameControlResult,
  gameActionValidation,
  { runtimeConfig }
) {
  if (runtimeConfig.environment?.IRIS_REQUIRE_REAL_RUNTIME_ADAPTERS !== "true") return;
  if (runtimeConfig.enableGameControl !== true) return;
  if (!gameActionValidation?.approved_game_input_action) return;
  if (gameControlResult?.accepted === true) return;
  throw new ContractError("IRIS runtime game control handoff failed", {
    adapter: gameControlResult?.adapter ?? "",
    control_status: gameControlResult?.control_status ?? "unknown",
    error_kind: gameControlResult?.error_kind ?? "game_control_handoff_failed",
  });
}

function createCorePipelineRuntimeConfig(runtimeConfig) {
  if (
    runtimeConfig.enableCandidatePersistence !== true &&
    runtimeConfig.candidateMemoryCommitPaused !== true &&
    runtimeConfig.candidateRelationshipCommitPaused !== true
  ) {
    return runtimeConfig;
  }
  return {
    ...runtimeConfig,
    memoryStore:
      runtimeConfig.candidateMemoryCommitPaused === true ? null : runtimeConfig.memoryStore,
    relationshipStore:
      runtimeConfig.enableCandidatePersistence === true ||
      runtimeConfig.candidateRelationshipCommitPaused === true
        ? null
        : runtimeConfig.relationshipStore,
  };
}

function readMemoryRecordsSafely(memoryStore) {
  try {
    return memoryStore?.list?.() ?? [];
  } catch {
    return [];
  }
}

function readRelationshipProfilesSafely(relationshipStore) {
  try {
    return relationshipStore?.listProfiles?.() ?? [];
  } catch {
    return [];
  }
}

function readStoreStatusSafely(store, fallbackSchema) {
  try {
    return store?.status?.() ?? null;
  } catch (error) {
    return {
      schema: fallbackSchema,
      health: "attention",
      store_available: false,
      read_error: true,
      error_kind: classifyStoreReadError(error),
      boundary_policy: {
        counts_only: true,
        no_record_payloads: true,
        no_profile_payloads: true,
        no_store_paths: true,
        no_error_messages: true,
      },
    };
  }
}
