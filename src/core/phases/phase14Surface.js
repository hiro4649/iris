import {
  ContractError,
  assertNoWorldCommand,
  requireFields,
  validateCanonicalAction,
} from "../contracts.js";
import { assertReadOnlyAffectSnapshot } from "../../services/personality/affectState.js";

export function phase14Surface(action, guards = {}) {
  validateCanonicalAction(action);
  assertNoWorldCommand(action, "Phase14 input");
  assertReadOnlyAffectSnapshot(guards.affectSnapshot, "Phase14 affect snapshot");

  const canonical_message = buildCanonicalMessage(action, guards);
  const naturalized_text = naturalize(canonical_message, action, guards.affectSnapshot);
  const phase09Status = guards.phase09?.phase09_constraint_status ?? "pass";
  const semantic_score = normalizeSemanticScore(guards.semanticScore ?? guards.semantic_score ?? 1);
  const semantic_status = phase09Status === "reject"
    ? "degrade"
    : semantic_score < 0.85
      ? "reject"
      : semantic_score < 0.92
        ? "degrade"
        : "pass";
  const semantic_reverted_to_canonical = semantic_status === "reject";
  const surface_text = semantic_reverted_to_canonical ? canonical_message : naturalized_text;
  const final_performance_cue = buildPerformanceCue(action, surface_text, guards.affectSnapshot);
  const raw_variation_applied = semantic_reverted_to_canonical
    ? []
    : buildVariationList(canonical_message, surface_text, final_performance_cue);
  const variation_distribution = applyVariationDistribution(
    raw_variation_applied,
    guards.recentVariations ?? guards.recent_variations
  );
  const naturalness_status = phase09Status === "reject" ? "degrade" : "pass";

  const output = {
    trace_id: action.trace_id,
    event_id: action.event_id,
    phase14_input_action_type: action.action_type,
    action_type: action.action_type,
    canonical_message,
    surface_text,
    variation_applied: variation_distribution.variation_applied,
    variation_usage_count: variation_distribution.variation_usage_count,
    repeat_violation: variation_distribution.repeat_violation,
    phase14_variation_distribution_boundary: {
      max_consecutive_same_variation: 3,
      fourth_repeat_switch_or_reject: true,
    },
    latency_adjustment_ms: 250,
    performance_cue: final_performance_cue,
    affect_snapshot: guards.affectSnapshot ?? null,
    semantic_status,
    semantic_score,
    semantic_reverted_to_canonical,
    phase14_semantic_equivalence_boundary: {
      revert_to_canonical_on_reject: true,
      no_meaning_change: true,
      no_new_information: true,
    },
    phase14_action_type_boundary: {
      immutable_from_input: true,
      no_action_type_rewrite: true,
    },
    semantic_normalized_status: semantic_status === "pass" ? "safe" : "degrade",
    identity_preserved: true,
    naturalness_status,
    naturalness_normalized_status: naturalness_status === "pass" ? "safe" : "degrade",
    tone: action.tone,
    emotion: action.emotion,
    character_tag: action.character_tag,
    target_presence_id: action.target_presence_id,
    phase09_constraint_status: phase09Status,
    phase13_continuity_score: guards.phase13?.phase13_continuity_score ?? null,
    phase13_drift_score: guards.phase13?.phase13_drift_score ?? null,
    response_draft_source: guards.responseDraft?.source ?? "phase14_template",
  };
  assertPhase14SurfaceSafe(output);
  return output;
}

export function assertPhase14SurfaceSafe(output, context = "Phase14 surface") {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw new ContractError(`${context}: output required`);
  }
  assertNoWorldCommand(output, context);
  if (output.phase14_input_action_type !== output.action_type) {
    throw new ContractError(`${context}: action_type must remain immutable`);
  }
  if (
    output.phase14_action_type_boundary?.immutable_from_input !== true ||
    output.phase14_action_type_boundary?.no_action_type_rewrite !== true
  ) {
    throw new ContractError(`${context}: action_type immutability boundary required`);
  }
  if (output.semantic_status === "reject") {
    if (output.surface_text !== output.canonical_message || output.semantic_reverted_to_canonical !== true) {
      throw new ContractError(`${context}: semantic reject must revert to canonical message`);
    }
    if (Array.isArray(output.variation_applied) && output.variation_applied.length > 0) {
      throw new ContractError(`${context}: semantic reject must not apply variation`);
    }
  }
  if (
    output.phase14_variation_distribution_boundary?.max_consecutive_same_variation !== 3 ||
    output.phase14_variation_distribution_boundary?.fourth_repeat_switch_or_reject !== true
  ) {
    throw new ContractError(`${context}: variation distribution boundary required`);
  }
  if (output.repeat_violation === true) {
    throw new ContractError(`${context}: variation repeat violation forbidden`);
  }
  for (const count of Object.values(output.variation_usage_count ?? {})) {
    if (count > 3) {
      throw new ContractError(`${context}: same variation exceeded consecutive limit`);
    }
  }
  if (
    output.phase14_semantic_equivalence_boundary?.revert_to_canonical_on_reject !== true ||
    output.phase14_semantic_equivalence_boundary?.no_meaning_change !== true ||
    output.phase14_semantic_equivalence_boundary?.no_new_information !== true
  ) {
    throw new ContractError(`${context}: semantic equivalence boundary required`);
  }
}

function buildCanonicalMessage(action, guards) {
  requireFields(action, ["action_type"], "Phase14 canonical message input");
  if (action.action_type === "NOOP") return null;
  if (action.action_type === "WAIT") return null;
  if (guards.responseDraft?.text) return guards.responseDraft.text;

  const text = action.parameters?.normalized_text;
  if (!text) return "I am watching.";
  if (action.emotion === "happy") return `I like that. ${text}`;
  if (action.emotion === "surprise") return `That caught my attention. ${text}`;
  return `I hear you. ${text}`;
}

function naturalize(message, action, affectSnapshot) {
  if (message === null) return null;
  if (action.character_tag === "tease") return `${message} Hehe.`;
  if (isBigLaugh(action, message)) {
    if ((affectSnapshot?.amusement ?? 0) >= 0.62) {
      return `Hahaha, no, wait... I am actually losing it. ${message}`;
    }
    return `Hahaha, wait, wait... I need a second. ${message}`;
  }
  if (action.tone === "playful") return `${message} Hehe, that was good.`;
  return message;
}

function buildPerformanceCue(action, surfaceText, affectSnapshot) {
  if (!surfaceText) {
    return {
      style: "silent",
      intensity: 0,
      tts_hint: "none",
      live2d_hint: "idle",
      affect_hint: affectSnapshot?.affect_label ?? null,
      adapter_validation_required: true,
    };
  }
  if (isBigLaugh(action, surfaceText)) {
    return {
      style: "big_laugh",
      intensity: clamp01(0.72 + (affectSnapshot?.amusement ?? 0.22) * 0.22 + (affectSnapshot?.energy ?? 0.42) * 0.06),
      tts_hint: "laughing with short breath breaks",
      live2d_hint: "laugh_big",
      affect_hint: affectSnapshot?.affect_label ?? null,
      adapter_validation_required: true,
    };
  }
  return {
    style: "normal_speech",
    intensity: clamp01(0.25 + (affectSnapshot?.warmth ?? 0.54) * 0.2 + (affectSnapshot?.energy ?? 0.42) * 0.1),
    tts_hint: "natural",
    live2d_hint: "talk",
    affect_hint: affectSnapshot?.affect_label ?? null,
    adapter_validation_required: true,
  };
}

function buildVariationList(canonicalMessage, surfaceText, performanceCue) {
  const variations = [];
  if (surfaceText !== canonicalMessage) variations.push("iris_softening");
  if (performanceCue.style === "big_laugh") variations.push("iris_big_laugh");
  if (performanceCue.affect_hint) variations.push("iris_affect_modulation");
  return variations;
}

function applyVariationDistribution(variations, recentVariations) {
  const variation_applied = [...variations].slice(0, 2);
  const usage = {};
  for (const variation of variation_applied) {
    usage[variation] = countRecentVariationStreak(variation, recentVariations) + 1;
  }
  const repeated = variation_applied.find((variation) => usage[variation] > 3);
  if (!repeated) {
    return {
      variation_applied,
      variation_usage_count: usage,
      repeat_violation: false,
    };
  }
  const replacement = ["iris_distribution_shift", "iris_softening", "iris_affect_modulation"]
    .find((variation) => variation !== repeated && countRecentVariationStreak(variation, recentVariations) < 3);
  const switched = variation_applied.filter((variation) => variation !== repeated);
  if (replacement && !switched.includes(replacement)) switched.push(replacement);
  const switchedUsage = {};
  for (const variation of switched.slice(0, 2)) {
    switchedUsage[variation] = countRecentVariationStreak(variation, recentVariations) + 1;
  }
  return {
    variation_applied: switched.slice(0, 2),
    variation_usage_count: switchedUsage,
    repeat_violation: false,
  };
}

function countRecentVariationStreak(variation, recentVariations) {
  if (!Array.isArray(recentVariations)) return 0;
  let count = 0;
  for (let index = recentVariations.length - 1; index >= 0; index -= 1) {
    const entry = recentVariations[index];
    const entryVariations = Array.isArray(entry) ? entry : [entry];
    if (!entryVariations.includes(variation)) break;
    count += 1;
  }
  return count;
}

function isBigLaugh(action, text) {
  const sourceText = `${action.parameters?.normalized_text ?? ""} ${text ?? ""}`;
  return (
    action.action_type === "SPEAK" &&
    action.tone === "playful" &&
    action.emotion === "happy" &&
    /lol|lmao|funny|haha|www/i.test(sourceText)
  );
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number(value.toFixed(4));
}

function normalizeSemanticScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 1;
  if (score < 0) return 0;
  if (score > 1) return 1;
  return score;
}
