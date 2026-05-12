import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { ContractError, assertNoWorldCommand } from "../../core/contracts.js";
import { sanitizeGameControlResultForPublicState } from "../../adapters/game/mockGameControlAdapter.js";
import { sanitizeBoundaryAuditForPublicState } from "../evaluation/boundaryAudit.js";
import { sanitizeExpressionProfileForPublicState } from "../expression/expressionProfile.js";
import { sanitizeGameEmbodimentForPublicState } from "../game/gameEmbodiment.js";
import { sanitizeGamePerceptionForPublicState } from "../game/gamePerception.js";
import { sanitizeGamePlayerForPublicState } from "../game/gamePlayer.js";
import { sanitizeGameActionValidationForPublicState } from "../game/gameActionValidator.js";
import { sanitizeDonationReactionForPublicState } from "../interaction/donationReaction.js";
import { sanitizeExternalTopicReactionForPublicState } from "../interaction/externalTopicReaction.js";
import { sanitizeMediaWatchReactionForPublicState } from "../interaction/mediaWatchReaction.js";
import {
  sanitizeCandidatePersistenceForPublicState,
  sanitizeCandidateValidationForPublicState,
} from "../persistence/candidateValidator.js";
import { sanitizeRelationshipDeepeningForPublicState } from "../relationship/relationshipDeepening.js";
import { sanitizeAutonomousExpressionForPublicState } from "../presence/autonomousExpression.js";
import { sanitizeCameraProximityForPublicState } from "../presence/cameraProximity.js";
import { sanitizeStreamLifecycleForPublicState } from "../stream/streamLifecycle.js";
import { sanitizeLanguageProfileForPublicState } from "../voice/languageProfile.js";
import {
  sanitizeSpeechRateProfileForPublicState,
  sanitizeTongueTwisterModeForPublicState,
} from "../voice/speechRateProfile.js";
import { sanitizeSubtitleCueForPublicState } from "../voice/subtitleCue.js";

const FORBIDDEN_REPLAY_FIELDS = new Set([
  "world_command",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "execute",
  "commit",
  "write",
  "apply",
  "internal_relationship_stage",
  "relation_score",
  "relationship_score",
  "hidden_rank",
  "hidden_relationship_rank",
  "proposed_relation_score_delta",
  "relationship_update_candidate",
]);

export function createJsonlReplayLog(filePath) {
  return {
    filePath,
    appendRuntimeResult(result) {
      const entry = createReplayEntry(result);
      assertReplayEntrySafe(entry);
      mkdirSync(dirname(filePath), { recursive: true });
      appendFileSync(filePath, `${JSON.stringify(entry)}\n`, "utf8");
      return entry;
    },
    readEntries(limit = 50) {
      if (!existsSync(filePath)) return [];
      const lines = readFileSync(filePath, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      return lines.slice(-limit).map((line) => {
        const entry = JSON.parse(line);
        assertReplayEntrySafe(entry);
        return entry;
      });
    },
  };
}

export function createReplayEntry(result) {
  const phase15 = result?.core?.phase15;
  const phase01 = result?.core?.phase01;
  const phase04 = result?.core?.phase04;
  const event = result?.event;
  const entry = {
    schema: "iris_replay_entry_v1",
    recorded_at_ms: Date.now(),
    trace_id: phase15?.trace_id ?? event?.trace_id ?? null,
    event_id: phase15?.event_id ?? event?.event_id ?? null,
    source: event?.source ?? phase01?.source ?? null,
    payload_kind: phase01?.payload_kind ?? event?.payload?.payload_kind ?? "comment",
    normalized_text: phase01?.normalized_text ?? "",
    final_text: phase15?.final_text ?? "",
    final_decision: phase15?.final_decision ?? null,
    persona_profile: result?.core?.personaProfile ?? result?.persona_profile ?? null,
    canonical_action: {
      action_type: phase04?.action_type ?? phase15?.phase15_continuity_envelope?.action_type ?? null,
      tone: phase04?.tone ?? phase15?.phase15_continuity_envelope?.tone ?? null,
      emotion: phase04?.emotion ?? phase15?.phase15_continuity_envelope?.emotion ?? null,
      character_tag:
        phase04?.character_tag ?? phase15?.phase15_continuity_envelope?.character_tag ?? null,
    },
    affect_snapshot: result?.core?.affectSnapshot ?? phase15?.affect_snapshot ?? null,
    speech_cue: result?.speech_cue ?? null,
    speech_rate_profile: sanitizeSpeechRateProfileForPublicState(
      result?.speech_rate_profile ?? null
    ),
    language_profile: sanitizeLanguageProfileForPublicState(result?.language_profile ?? null),
    subtitle_cue: sanitizeSubtitleCueForPublicState(result?.subtitle_cue ?? null),
    tongue_twister_mode: sanitizeTongueTwisterModeForPublicState(
      result?.tongue_twister_mode ?? null
    ),
    motion_cue: result?.motion_cue ?? null,
    performance_plan: result?.performance_plan ?? null,
    body_continuity: result?.body_continuity ?? null,
    camera_proximity: sanitizeCameraProximityForPublicState(result?.camera_proximity ?? null),
    turn_rhythm: result?.turn_rhythm ?? null,
    affective_continuity: result?.affective_continuity ?? null,
    personality_habit: result?.personality_habit ?? null,
    expression_profile: sanitizeExpressionProfileForPublicState(result?.expression_profile ?? null),
    autonomous_expression: sanitizeAutonomousExpressionForPublicState(
      result?.autonomous_expression ?? null
    ),
    relationship_deepening: sanitizeRelationshipDeepeningForPublicState(
      result?.relationship_deepening ?? null
    ),
    donation_reaction: sanitizeDonationReactionForPublicState(result?.donation_reaction ?? null),
    media_watch_reaction: sanitizeMediaWatchReactionForPublicState(
      result?.media_watch_reaction ?? null
    ),
    external_topic_reaction: sanitizeExternalTopicReactionForPublicState(
      result?.external_topic_reaction ?? null
    ),
    memory_recall: result?.memory_recall ?? null,
    game_perception: sanitizeGamePerceptionForPublicState(result?.game_perception ?? null),
    game_commentary: result?.game_commentary ?? null,
    game_player: sanitizeGamePlayerForPublicState(result?.game_player ?? null),
    game_action_validation: sanitizeGameActionValidationForPublicState(
      result?.game_action_validation ?? null
    ),
    game_control_result: sanitizeGameControlResultForPublicState(
      result?.game_control_result ?? null
    ),
    game_embodiment: sanitizeGameEmbodimentForPublicState(result?.game_embodiment ?? null),
    stream_lifecycle: sanitizeStreamLifecycleForPublicState(result?.stream_lifecycle ?? null),
    human_likeness_evaluation: result?.human_likeness_evaluation ?? null,
    boundary_audit: sanitizeBoundaryAuditForPublicState(result?.boundary_audit ?? null),
    candidate_validation: sanitizeCandidateValidationForPublicState(
      result?.candidate_validation ?? null
    ),
    candidate_persistence: sanitizeCandidatePersistenceForPublicState(
      result?.candidate_persistence ?? null
    ),
    candidate_review_items: result?.candidate_review_items,
  };
  assertReplayEntrySafe(entry);
  return entry;
}

export function assertReplayEntrySafe(entry, context = "replay entry") {
  if (!entry || typeof entry !== "object") {
    throw new ContractError(`${context}: missing entry`);
  }
  assertNoWorldCommand(entry, context);
  if (entry.schema !== "iris_replay_entry_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: entry.schema });
  }
  if (!Array.isArray(entry.candidate_review_items)) {
    throw new ContractError(`${context}: candidate review items are required`);
  }
  assertNoForbiddenFields(entry, context);
}

function assertNoForbiddenFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenFields(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_REPLAY_FIELDS.has(normalizeReplayField(field))) {
      throw new ContractError(`${context}: replay entry must not contain command fields`, {
        field,
        path,
      });
    }
    assertNoForbiddenFields(child, context, `${path}.${field}`);
  }
}

function normalizeReplayField(field) {
  return String(field ?? "")
    .replace(/([a-z0-9])([A-Z])/gu, "$1_$2")
    .toLowerCase();
}
