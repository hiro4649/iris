import { ContractError, assertNoWorldCommand } from "../../core/contracts.js";
import { assertLanguageProfileSafe } from "./languageProfile.js";
import { assertSpeechCueSafe } from "./speechCue.js";
import {
  assertTongueTwisterLineSafe,
  getTongueTwisterLine,
  isTongueTwisterRequest,
} from "./tongueTwisterCatalog.js";

const FORBIDDEN_RATE_FIELDS = new Set([
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
  "selected_memory_ids",
  "raw_memory_ids",
  "memory_ids",
  "relationship_update_candidate",
  "raw_translation_prompt",
  "translation_prompt",
  "raw_translation_context",
  "vendor_token",
  "vendor_value",
  "vendor_values",
  "raw_vendor_value",
  "raw_vendor_values",
  "vendor_payload",
  "raw_vendor_diagnostics",
  "tts_internal_payload",
  "internal_tts_payload",
  "tts_payload",
  "translation_vendor_token",
  "api_key",
  "token",
  "action_type",
  "intent",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
  "relation_score",
  "canonical_action_type",
  "canonical_emotion",
  "canonical_task_type",
  "long_form_material",
  "source_material",
  "personal_info",
  "private_viewer_id",
  "custom_phrase",
]);

const RATE_LABELS = new Set([
  "very_slow",
  "slow",
  "natural",
  "lively",
  "fast",
  "tongue_twister_fast",
]);

export function createSpeechRateProfile({
  event = null,
  finalOutput = null,
  speechCue,
  languageProfile,
} = {}) {
  assertNoWorldCommand(event, "Speech rate event input");
  assertNoWorldCommand(finalOutput, "Speech rate final output input");
  assertSpeechCueSafe(speechCue, "Speech rate speech cue input");
  assertLanguageProfileSafe(languageProfile, "Speech rate language profile input");

  const text = String(finalOutput?.final_text ?? "").trim();
  const requestedTongueTwister = isTongueTwisterRequested(event, text);
  const measuredPace = clamp(Number(speechCue.pace ?? 0.94), 0.5, 1.5);
  const limits = languageRateLimits(languageProfile.response_language, requestedTongueTwister);
  const slowGuard = buildSlowSpeechGuard({ speechCue, measuredPace, limits, text });
  const baseRate = slowGuard.rate_repair_required
    ? "natural"
    : classifyBaseRate(measuredPace, requestedTongueTwister);

  const profile = {
    schema: "iris_speech_rate_profile_v1",
    trace_id: finalOutput?.trace_id ?? event?.trace_id ?? null,
    event_id: finalOutput?.event_id ?? event?.event_id ?? null,
    internal_profile: true,
    base_rate: baseRate,
    rate_variation_plan: buildRateVariationPlan({
      baseRate,
      measuredPace,
      finalOutput,
      speechCue,
      requestedTongueTwister,
    }),
    min_rate: limits.min_rate,
    max_rate: limits.max_rate,
    slow_speech_guard: slowGuard,
    intelligibility_guard: buildIntelligibilityGuard({
      measuredPace,
      limits,
      speechCue,
      requestedTongueTwister,
    }),
    emotion_rate_link: buildAffectRateLink({ finalOutput, speechCue }),
    adapter_validation_required: true,
  };

  assertSpeechRateProfileSafe(profile);
  return profile;
}

export function createTongueTwisterMode({
  event = null,
  finalOutput = null,
  languageProfile,
  speechRateProfile,
} = {}) {
  assertNoWorldCommand(event, "Tongue twister event input");
  assertNoWorldCommand(finalOutput, "Tongue twister final output input");
  assertLanguageProfileSafe(languageProfile, "Tongue twister language profile input");
  assertSpeechRateProfileSafe(speechRateProfile, "Tongue twister speech rate input");

  const enabled = isTongueTwisterRequested(event, finalOutput?.final_text ?? "");
  const line = enabled ? getTongueTwisterLine(languageProfile.response_language) : null;
  const mode = {
    schema: "iris_tongue_twister_mode_v1",
    trace_id: finalOutput?.trace_id ?? event?.trace_id ?? null,
    event_id: finalOutput?.event_id ?? event?.event_id ?? null,
    internal_profile: true,
    enabled,
    language: languageProfile.response_language,
    line,
    phrase_text: line?.phrase_text ?? "",
    phrase_source: line?.phrase_source ?? "not_applicable",
    max_attempt_duration_ms: line?.max_attempt_duration_ms ?? 0,
    phrase_length: line ? [...line.phrase_text].length : 0,
    retry_policy: line?.retry_policy ?? "not_applicable",
    duration_policy: "short_burst_only",
    speech_rate_target: enabled ? "fast_guarded" : "none",
    source_policy: "short_original_or_public_domain_only",
    failure_reaction: enabled ? "laugh_and_recover" : "not_applicable",
    subtitle_policy: enabled ? "subtitle_must_follow_phrase_without_overrun" : "not_applicable",
    mouth_sync_policy: enabled ? "adapter_validated_short_burst" : "not_applicable",
    rights_guard: "no_long_dialogue_lyrics_or_subtitles",
    adapter_validation_required: true,
  };

  assertTongueTwisterModeSafe(mode);
  return mode;
}

export function assertSpeechRateProfileSafe(profile, context = "speech rate profile") {
  if (!profile || typeof profile !== "object") {
    throw new ContractError(`${context}: missing speech rate profile`);
  }
  assertNoWorldCommand(profile, context);
  assertNoForbiddenRateFields(profile, context);
  if (profile.schema !== "iris_speech_rate_profile_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: profile.schema });
  }
  if (profile.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (profile.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (!RATE_LABELS.has(profile.base_rate)) {
    throw new ContractError(`${context}: invalid base rate`, { base_rate: profile.base_rate });
  }
  if (typeof profile.min_rate !== "number" || typeof profile.max_rate !== "number") {
    throw new ContractError(`${context}: min_rate and max_rate must be numeric`);
  }
  if (profile.min_rate >= profile.max_rate) {
    throw new ContractError(`${context}: invalid rate bounds`);
  }
}

export function assertTongueTwisterModeSafe(mode, context = "tongue twister mode") {
  if (!mode || typeof mode !== "object") {
    throw new ContractError(`${context}: missing tongue twister mode`);
  }
  assertNoWorldCommand(mode, context);
  assertNoForbiddenRateFields(mode, context);
  if (mode.schema !== "iris_tongue_twister_mode_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: mode.schema });
  }
  if (mode.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (typeof mode.enabled !== "boolean") {
    throw new ContractError(`${context}: enabled must be boolean`);
  }
  if (mode.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (mode.enabled === true) {
    assertTongueTwisterLineSafe(mode.line, `${context}: line`);
    if (mode.phrase_text !== mode.line.phrase_text) {
      throw new ContractError(`${context}: phrase_text must mirror the selected line`);
    }
    if (mode.phrase_source !== "iris_original_short_safe_phrase") {
      throw new ContractError(`${context}: invalid phrase source`);
    }
    if (mode.max_attempt_duration_ms > 4200 || mode.max_attempt_duration_ms <= 0) {
      throw new ContractError(`${context}: invalid bounded attempt duration`);
    }
    if (mode.phrase_length !== [...String(mode.phrase_text ?? "")].length) {
      throw new ContractError(`${context}: phrase_length must mirror the selected line`);
    }
    if (mode.retry_policy !== "one_retry_then_normal_conversation") {
      throw new ContractError(`${context}: invalid retry policy`);
    }
    if (mode.duration_policy !== "short_burst_only") {
      throw new ContractError(`${context}: duration policy must stay bounded`);
    }
    if (mode.subtitle_policy !== "subtitle_must_follow_phrase_without_overrun") {
      throw new ContractError(`${context}: subtitle policy must require sync`);
    }
    if (mode.mouth_sync_policy !== "adapter_validated_short_burst") {
      throw new ContractError(`${context}: mouth sync policy must require adapter validation`);
    }
  }
}

export function sanitizeSpeechRateProfileForPublicState(profile) {
  if (!profile) return null;
  assertSpeechRateProfileSafe(profile, "Speech rate public summary");
  return {
    schema: profile.schema,
    trace_id: profile.trace_id ?? null,
    event_id: profile.event_id ?? null,
    speech_rate_label: profile.base_rate,
    speech_rate_repair_status: speechRateRepairStatus(profile),
    slow_speech_guard_status: profile.slow_speech_guard?.guard_status ?? null,
    intelligibility_guard_status: profile.intelligibility_guard?.guard_status ?? null,
    subtitle_sync_required: profile.intelligibility_guard?.subtitle_sync_required === true,
    adapter_validation_required: true,
  };
}

export function sanitizeTongueTwisterModeForPublicState(mode) {
  if (!mode) return null;
  assertTongueTwisterModeSafe(mode, "Tongue twister public summary");
  return {
    schema: mode.schema,
    trace_id: mode.trace_id ?? null,
    event_id: mode.event_id ?? null,
    enabled: mode.enabled,
    language: mode.language,
    phrase_source: mode.phrase_source,
    phrase_length: Number(mode.phrase_length ?? 0),
    max_attempt_duration_ms: Number(mode.max_attempt_duration_ms ?? 0),
    duration_policy: mode.duration_policy,
    speech_rate_target: mode.speech_rate_target,
    source_policy: mode.source_policy,
    rights_guard: mode.rights_guard,
    adapter_validation_required: true,
  };
}

function buildSlowSpeechGuard({ speechCue, measuredPace, limits, text }) {
  const longPause = (speechCue.pause_points ?? []).some(
    (pause) => Number(pause.duration_ms ?? 0) > 900
  );
  const stretchedEnding = /([ぁ-んァ-ンーa-zA-Z])\1{5,}$/.test(text.replace(/\s+/g, ""));
  const tooSlow = measuredPace < limits.min_rate;
  const rateRepairRequired = tooSlow || longPause || stretchedEnding;
  return {
    guard_status: rateRepairRequired ? "repair_required" : "pass",
    minimum_pace: limits.min_rate,
    measured_pace: Number(measuredPace.toFixed(4)),
    long_pause_detected: longPause,
    stretched_ending_detected: stretchedEnding,
    rate_repair_required: rateRepairRequired,
    repair_strategy: rateRepairRequired
      ? "restore_natural_rate_shorten_pauses_and_recalculate_subtitles"
      : "none",
  };
}

function buildIntelligibilityGuard({ measuredPace, limits, speechCue, requestedTongueTwister }) {
  const tooFast = measuredPace > limits.max_rate;
  const mouthCueCount = speechCue.mouth_cues?.length ?? 0;
  const denseMouthCueRisk = mouthCueCount >= 64 && measuredPace > 1.16;
  const repairRequired = tooFast || denseMouthCueRisk;
  return {
    guard_status: repairRequired ? "repair_required" : "pass",
    maximum_pace: limits.max_rate,
    measured_pace: Number(measuredPace.toFixed(4)),
    tongue_twister_allowed: requestedTongueTwister && !repairRequired,
    subtitle_sync_required: true,
    mouth_sync_required: true,
    repair_strategy: repairRequired ? "lower_rate_preserve_words_and_subtitle_timing" : "none",
  };
}

function buildAffectRateLink({ finalOutput, speechCue }) {
  const affect = finalOutput?.affect_snapshot ?? {};
  return {
    affect_energy: clamp(Number(affect.energy ?? 0.42), 0, 1),
    affect_amusement: clamp(Number(affect.amusement ?? 0.22), 0, 1),
    laugh_recovery: speechCue.prosody_style === "laughing_speech",
    rule: speechCue.prosody_style === "laughing_speech"
      ? "short_breath_breaks_without_global_slowdown"
      : "natural_variation_without_monotone",
  };
}

function buildRateVariationPlan({
  baseRate,
  measuredPace,
  finalOutput,
  speechCue,
  requestedTongueTwister,
}) {
  const isLaugh = speechCue.prosody_style === "laughing_speech";
  const style = finalOutput?.performance_cue?.style ?? "talk";
  if (requestedTongueTwister) {
    return [
      {
        segment_role: "setup",
        rate_label: "lively",
        pace_multiplier: 1.04,
        reason: "playful_entry",
      },
      {
        segment_role: "tongue_twister_burst",
        rate_label: "tongue_twister_fast",
        pace_multiplier: 1.18,
        reason: "short_guarded_tongue_twister",
      },
      {
        segment_role: "recovery",
        rate_label: "natural",
        pace_multiplier: 0.98,
        reason: "laugh_and_return_to_conversation",
      },
    ];
  }
  if (isLaugh || style === "big_laugh") {
    return [
      {
        segment_role: "laugh_burst",
        rate_label: "lively",
        pace_multiplier: 1.05,
        reason: "amused_opening",
      },
      {
        segment_role: "breath_recovery",
        rate_label: "natural",
        pace_multiplier: 0.94,
        reason: "short_breath_recovery_not_global_slow",
      },
    ];
  }
  return [
    {
      segment_role: "opening",
      rate_label: baseRate === "slow" ? "natural" : baseRate,
      pace_multiplier: clamp(measuredPace + 0.02, 0.88, 1.14),
      reason: "avoid_monotone_entry",
    },
    {
      segment_role: "body",
      rate_label: baseRate,
      pace_multiplier: clamp(measuredPace, 0.82, 1.16),
      reason: "main_sentence_clarity",
    },
    {
      segment_role: "ending",
      rate_label: "natural",
      pace_multiplier: 0.98,
      reason: "soft_return",
    },
  ];
}

function classifyBaseRate(measuredPace, requestedTongueTwister) {
  if (requestedTongueTwister) return "tongue_twister_fast";
  if (measuredPace < 0.82) return "slow";
  if (measuredPace < 0.94) return "natural";
  if (measuredPace < 1.1) return "lively";
  return "fast";
}

function languageRateLimits(language, tongueTwister) {
  const cjkOrDense = new Set(["ja", "zh", "ko", "th", "hi", "ar", "bn", "ur", "ta"]).has(
    language
  );
  return {
    min_rate: cjkOrDense ? 0.78 : 0.82,
    max_rate: tongueTwister ? 1.28 : cjkOrDense ? 1.18 : 1.22,
  };
}

function isTongueTwisterRequested(event, finalText = "") {
  const source = [
    event?.payload?.text,
    event?.payload?.message,
    event?.payload?.comment,
    event?.payload?.requested_mode,
    finalText,
  ]
    .filter(Boolean)
    .join(" ");
  return isTongueTwisterRequest(source);
}

function assertNoForbiddenRateFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenRateFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_RATE_FIELDS.has(normalizeRateField(field))) {
      throw new ContractError(`${context}: rate profile must not define command or canonical fields`, {
        field,
        path,
      });
    }
    assertNoForbiddenRateFields(child, context, `${path}.${field}`);
  }
}

function speechRateRepairStatus(profile) {
  const slowRepair = profile.slow_speech_guard?.rate_repair_required === true;
  const intelligibilityRepair =
    profile.intelligibility_guard?.guard_status === "repair_required" ||
    profile.intelligibility_guard?.repair_required === true;
  if (slowRepair && intelligibilityRepair) return "repair_required_bounded";
  if (slowRepair) return "slow_rate_repaired";
  if (intelligibilityRepair) return "fast_rate_repaired";
  return "pass";
}

function normalizeRateField(field) {
  return String(field ?? "")
    .replace(/([a-z0-9])([A-Z])/gu, "$1_$2")
    .toLowerCase();
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  if (number < min) return min;
  if (number > max) return max;
  return Number(number.toFixed(4));
}
