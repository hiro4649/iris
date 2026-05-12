import { ContractError, assertNoWorldCommand } from "./contracts.js";
import { phase01Intent } from "./phases/phase01Intent.js";
import { phase02Reaction } from "./phases/phase02Reaction.js";
import { phase03Context } from "./phases/phase03Context.js";
import { phase04Action } from "./phases/phase04Action.js";
import { phase05Persistence } from "./phases/phase05Persistence.js";
import { phase06Sync } from "./phases/phase06Sync.js";
import { phase07Task } from "./phases/phase07Task.js";
import { phase08Goal } from "./phases/phase08Goal.js";
import { phase09Constraint } from "./phases/phase09Constraint.js";
import { phase10Strategy } from "./phases/phase10Strategy.js";
import { phase11Economy } from "./phases/phase11Economy.js";
import { phase12SelfImprovement } from "./phases/phase12SelfImprovement.js";
import { phase13Canon } from "./phases/phase13Canon.js";
import { phase14Surface } from "./phases/phase14Surface.js";
import { phase15FinalGuard } from "./phases/phase15FinalGuard.js";
import { generateResponseDraft } from "../services/response/responseGenerator.js";
import {
  approveMemoryCandidate,
  commitApprovedMemoryRecord,
} from "../services/persistence/jsonMemoryStore.js";
import { createApprovedMemoryPromptSummary } from "../services/memory/memoryPromptSummary.js";
import {
  approveRelationshipCandidate,
  commitApprovedRelationshipRecord,
} from "../services/persistence/jsonRelationshipStore.js";
import { assertReadOnlyAffectSnapshot } from "../services/personality/affectState.js";
import {
  assertIrisPersonaProfileSafe,
  createIrisPersonaProfile,
  summarizePersonaForResponseProvider,
} from "../services/personality/irisPersonaProfile.js";
import {
  detectRequestedLanguageCode,
  detectSpokenLanguageCode,
} from "../services/voice/languageProfile.js";

const UNSAFE_RESPONSE_CONTEXT_TEXT_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|memory_write|direct_memory_write|commit_memory|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url)\b|https?:\/\//i;

export async function runCommentPipeline(event, runtime = {}) {
  assertNoWorldCommand(event, "Pipeline input");
  const phase01 = phase01Intent(event);
  const personaProfile = runtime.personaProfile ?? createIrisPersonaProfile();
  assertIrisPersonaProfileSafe(personaProfile, "Pipeline persona profile");
  const relationshipSummary = phase01.linked_identity_id
    ? summarizeRelationshipSafely(runtime.relationshipStore, phase01.linked_identity_id)
    : null;
  const safeRelationshipSummary = safeResponseContextText(relationshipSummary, 220) || null;
  const relationship_hint = relationshipSummary
    ? "returning_viewer"
    : runtime.relationship_hint ?? "new_or_unknown";
  const eventRuntime = {
    ...runtime,
    relationship_hint,
  };
  const phase02 = phase02Reaction(phase01);
  const affectSnapshot =
    runtime.affectState?.updateFromInput?.({ phase01, phase02 }) ??
    runtime.affectState?.getSnapshot?.() ??
    runtime.affectSnapshot ??
    null;
  assertReadOnlyAffectSnapshot(affectSnapshot, "Pipeline affect snapshot");
  const phase03 = phase03Context(phase02, eventRuntime);
  const phase04 = phase04Action(phase02, phase03);
  const phase05 = phase05Persistence(phase04, eventRuntime);
  const phase06 = phase06Sync(phase05, {
    intent: phase02.intent,
    target_presence_id: phase04.target_presence_id,
    source: phase01.source,
    timestamp_ms: phase01.timestamp_ms,
  });
  const phase07 = phase07Task(phase06);
  const phase08 = phase08Goal(phase07, runtime);
  const phase09 = phase09Constraint({ phase06, phase07, phase08 });
  const phase10 = phase10Strategy({ phase06, phase08, phase09 });
  const phase11 = phase11Economy({ phase07, phase09, phase10 });
  const phase12 = phase12SelfImprovement({ phase09, phase10, phase11 });
  const phase13 = phase13Canon({ phase06, phase07, phase08, phase09, phase10, phase11, phase12 });
  const requestedLanguage = detectRequestedLanguageCode(phase01.normalized_text);
  const detectedLanguage = detectSpokenLanguageCode(phase01.normalized_text);
  const responseLanguageHint = requestedLanguage ?? detectedLanguage ?? "en";
  const safeMemoryPromptSummary =
    runtime.allowDirectMemoryPrompt === true
      ? recentMemorySummarySafely(runtime.memoryStore)
      : buildSafeMemoryPromptSummarySafely({
          memoryStore: runtime.memoryStore,
          phase01,
        });
  const responseMemorySummary = safeResponseContextText(safeMemoryPromptSummary, 500);
  const responseDraft = await generateResponseDraft(
    {
      trace_id: phase01.trace_id,
      event_id: phase01.event_id,
      commentText: phase01.normalized_text,
      requestedLanguage,
      detectedLanguage,
      responseLanguageHint,
      intent: phase01.intent,
      emotion: phase02.emotion,
      tone: phase02.tone,
      character_tag: phase02.character_tag,
      phase08_primary_goal: phase08.phase08_primary_goal,
      strategy_mode: phase10.strategy_mode,
      recentMemorySummary: responseMemorySummary,
      viewerRelationshipSummary: safeRelationshipSummary,
      displayName: safeResponseContextText(phase01.display_name, 80) || "viewer",
      payloadKind: phase01.payload_kind,
      gameStateSummary: summarizeGameContext(phase01.game_context),
      externalTopicSummary: summarizeExternalTopic(phase01.external_topic_context),
      affectSnapshot,
      personaProfileSummary: summarizePersonaForResponseProvider(personaProfile),
    },
    runtime
  );
  const phase14 = phase14Surface(phase04, { phase09, phase13, responseDraft, affectSnapshot });
  const phase15 = phase15FinalGuard(phase14);
  const approvedMemoryRecord = approveMemoryCandidate(phase05, phase15);
  const persistence =
    runtime.memoryStore && approvedMemoryRecord
      ? commitApprovedMemoryRecordSafely(runtime.memoryStore, approvedMemoryRecord)
      : { committed: false, reason: approvedMemoryRecord ? "memory_store_missing" : "no_approved_record" };
  const approvedRelationshipRecord = approveRelationshipCandidate(phase05, phase15, {
    enableRelationshipMemory: runtime.enableRelationshipMemory === true,
  });
  const relationship =
    runtime.relationshipStore && approvedRelationshipRecord
      ? commitApprovedRelationshipRecordSafely(runtime.relationshipStore, approvedRelationshipRecord)
      : {
          committed: false,
          reason: approvedRelationshipRecord ? "relationship_store_missing" : "no_approved_record",
        };

  return {
    phase01,
    phase02,
    phase03,
    phase04,
    phase05,
    phase06,
    phase07,
    phase08,
    phase09,
    phase10,
    phase11,
    phase12,
    phase13,
    responseDraft,
    personaProfile,
    affectSnapshot,
    phase14,
    phase15,
    persistence,
    relationship,
  };
}

function buildSafeMemoryPromptSummary({ memoryStore, phase01 }) {
  return createApprovedMemoryPromptSummary({ memoryStore, phase01 }).prompt_summary;
}

function summarizeRelationshipSafely(relationshipStore, linkedIdentityId) {
  try {
    return relationshipStore?.summarize?.(linkedIdentityId) ?? null;
  } catch {
    return null;
  }
}

function recentMemorySummarySafely(memoryStore) {
  try {
    return memoryStore?.recentSummary?.() ?? "";
  } catch {
    return "";
  }
}

function buildSafeMemoryPromptSummarySafely({ memoryStore, phase01 }) {
  try {
    return buildSafeMemoryPromptSummary({ memoryStore, phase01 });
  } catch {
    return "";
  }
}

function commitApprovedMemoryRecordSafely(memoryStore, approvedRecord) {
  try {
    return commitApprovedMemoryRecord(memoryStore, approvedRecord);
  } catch (error) {
    return createSafePersistenceFailure("memory_store_commit_failed", error);
  }
}

function commitApprovedRelationshipRecordSafely(relationshipStore, approvedRecord) {
  try {
    return commitApprovedRelationshipRecord(relationshipStore, approvedRecord);
  } catch (error) {
    return createSafePersistenceFailure("relationship_store_commit_failed", error);
  }
}

function createSafePersistenceFailure(reason, error) {
  return {
    committed: false,
    reason,
    error_kind: classifyPersistenceError(error),
    retryable: true,
    boundary_policy: {
      commit_failures_summary_only: true,
      no_store_paths: true,
      no_error_messages: true,
    },
  };
}

function classifyPersistenceError(error) {
  if (error instanceof SyntaxError) return "store_parse_failed";
  if (error instanceof ContractError) return "store_contract_failed";
  const code = typeof error?.code === "string" ? error.code : "";
  if (["EACCES", "EPERM", "EROFS"].includes(code)) return "store_permission_failed";
  if (["ENOSPC", "EDQUOT"].includes(code)) return "store_capacity_failed";
  if (["ENOENT", "ENOTDIR"].includes(code)) return "store_location_unavailable";
  return "store_unavailable";
}

function scoreMemoryForPrompt(record, phase01) {
  const summary = String(record.summary ?? "").toLowerCase();
  const text = String(phase01.normalized_text ?? "").toLowerCase();
  const gameTitle = String(phase01.game_context?.game_title ?? "").toLowerCase();
  const payloadKind = phase01.payload_kind ?? "comment";
  let score = 0;
  if (payloadKind === "game_observation" && record.memory_type === "game_experience") score += 0.3;
  if (payloadKind === "media_watch_observation" && record.memory_type === "media_watch_experience") {
    score += 0.26;
  }
  if (payloadKind === "donation_event" && record.memory_type === "stream_experience") score += 0.18;
  if (gameTitle && summary.includes(gameTitle)) score += 0.34;
  if (/remember|again|previous|last time|前回|覚えて|また/i.test(text)) score += 0.28;
  for (const token of tokenizeMemoryPrompt(`${text} ${phase01.game_context?.scene_summary ?? ""}`)) {
    if (summary.includes(token)) score += 0.08;
  }
  return Math.min(1, Number(score.toFixed(4)));
}

function tokenizeMemoryPrompt(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .slice(0, 10);
}

function summarizeExternalTopic(topicContext) {
  if (!topicContext) return null;
  const pieces = [
    topicContext.topic_title ? `title=${topicContext.topic_title}` : null,
    topicContext.topic_summary ? `summary=${topicContext.topic_summary}` : null,
    `freshness=${topicContext.freshness_score ?? 0.5}`,
    `trust=${topicContext.source_trust_score ?? 0.5}`,
    topicContext.risk_category ? `risk=${topicContext.risk_category}` : null,
  ].filter(Boolean);
  return pieces.join("; ");
}

function summarizeGameContext(gameContext) {
  if (!gameContext) return null;
  const events = Array.isArray(gameContext.detected_events)
    ? gameContext.detected_events.filter(Boolean).join(", ")
    : "";
  const safeGameTitle = safeResponseContextText(gameContext.game_title, 120);
  const safeSceneSummary = safeResponseContextText(gameContext.scene_summary, 500);
  const safeEvents = safeResponseContextText(events, 240);
  const safePlayerState = safeResponseContextText(gameContext.player_state, 220);
  const safeOcrSummary = safeResponseContextText(
    gameContext.vision_metadata?.ocr_text_summary,
    220
  );
  const safeUiFocus = Array.isArray(gameContext.vision_metadata?.ui_focus_areas)
    ? gameContext.vision_metadata.ui_focus_areas
        .map((item) => safeResponseContextText(item, 80))
        .filter(Boolean)
        .join(", ")
    : "";
  const pieces = [
    safeGameTitle ? `title=${safeGameTitle}` : null,
    safeSceneSummary ? `scene=${safeSceneSummary}` : null,
    safeEvents ? `events=${safeEvents}` : null,
    safePlayerState ? `player=${safePlayerState}` : null,
    safeOcrSummary ? `ocr=${safeOcrSummary}` : null,
    safeUiFocus ? `ui=${safeUiFocus}` : null,
    `confidence=${gameContext.screen_confidence ?? 0.5}`,
  ].filter(Boolean);
  return pieces.join("; ");
}

function safeResponseContextText(value, maxLength = 220) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
  if (!text) return "";
  if (UNSAFE_RESPONSE_CONTEXT_TEXT_PATTERN.test(text)) return "";
  return text;
}
