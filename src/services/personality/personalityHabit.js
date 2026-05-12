import { ContractError, assertNoWorldCommand, normalizeFinalDecision } from "../../core/contracts.js";
import { assertAffectiveContinuitySafe } from "./affectiveContinuity.js";
import { assertBodyContinuitySafe } from "../presence/bodyContinuity.js";
import { assertTurnRhythmSafe } from "../presence/turnRhythm.js";

const HABIT_TYPES = new Set([
  "none",
  "light_self_deprecation",
  "playful_tsukkomi",
  "soft_boast",
  "thinking_mutter",
  "laugh_aftertaste",
  "game_focus_mutter",
]);

const FORBIDDEN_HABIT_FIELDS = new Set([
  "world_command",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "execute",
  "commit",
  "write",
  "apply",
  "intent",
  "action_type",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
  "raw_user_comment",
  "user_comment",
  "viewer_comment",
  "learned_from_user_comment",
  "permanent_phrase_addition",
  "canonical_enum",
]);

const STATIC_CATCHPHRASE_HINTS = new Set([
  "wait_what_was_that",
  "that_was_a_little_too_smooth",
  "did_you_see_that",
  "tiny_proud_moment",
  "give_me_one_second",
  "i_am_putting_the_pieces_together",
  "no_wait_i_am_still_recovering",
  "that_timing_got_me",
  "eyes_on_the_screen",
  "hold_on_i_am_watching_this",
  "i_made_that_sound_like_a_strategy",
  "my_brain_took_the_scenic_route",
]);

export function createPersonalityHabit({
  finalOutput,
  affectiveContinuity,
  bodyContinuity,
  turnRhythm,
  recentHabitHistory = [],
} = {}) {
  assertNoWorldCommand(finalOutput, "Personality habit final output input");
  assertAffectiveContinuitySafe(affectiveContinuity, "Personality habit affective continuity");
  assertBodyContinuitySafe(bodyContinuity, "Personality habit body continuity");
  assertTurnRhythmSafe(turnRhythm, "Personality habit turn rhythm");

  const safetyStatus = normalizeSafetyStatus(finalOutput?.final_decision);
  const textPresent = String(finalOutput?.final_text ?? "").trim() !== "";
  const contextTags = buildContextTags({ affectiveContinuity, bodyContinuity, turnRhythm });
  const allowedHabits = allowedForContext({ contextTags, safetyStatus, textPresent });
  const blockedHabits = blockedByCooldown(allowedHabits, recentHabitHistory);
  const selectedHabit = chooseHabit(allowedHabits, blockedHabits, {
    affectiveContinuity,
    bodyContinuity,
    turnRhythm,
  });
  const rejectedReason = selectedHabit === "none" ? rejectReason(allowedHabits, blockedHabits, safetyStatus, textPresent) : null;

  const habit = {
    schema: "iris_personality_habit_v1",
    trace_id: finalOutput?.trace_id ?? null,
    event_id: finalOutput?.event_id ?? null,
    internal_profile: true,
    habit_profile_id: "iris_phase19_habit_mvp",
    selected_habit: selectedHabit,
    habit_text_hint: habitTextHint(selectedHabit),
    character_catchphrase_profile: buildCatchphraseProfile(selectedHabit, {
      contextTags,
      blockedHabits,
    }),
    habit_cooldown_update: {
      should_record: selectedHabit !== "none",
      cooldown_key: selectedHabit,
      cooldown_turns: cooldownTurns(selectedHabit),
    },
    personality_boundary_result: {
      status: selectedHabit === "none" ? "skip" : "safe",
      allowed_habits: allowedHabits,
      blocked_habits: blockedHabits,
      context_tags: contextTags,
      frequency_limit: "one_habit_per_turn",
      cooldown_repetition_guard: {
        selected_habit_rejected_when_blocked: true,
        same_habit_consecutive_forbidden: true,
      },
    },
    habit_reject_reason: rejectedReason,
    adapter_validation_required: true,
  };

  assertPersonalityHabitSafe(habit, "Personality habit output");
  return habit;
}

export function assertPersonalityHabitSafe(personalityHabit, context = "personality habit") {
  if (!personalityHabit || typeof personalityHabit !== "object") {
    throw new ContractError(`${context}: missing personality habit export`);
  }
  assertNoWorldCommand(personalityHabit, context);
  assertNoForbiddenFieldsRecursive(personalityHabit, context);
  if (personalityHabit.schema !== "iris_personality_habit_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: personalityHabit.schema });
  }
  if (personalityHabit.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (personalityHabit.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (!HABIT_TYPES.has(personalityHabit.selected_habit)) {
    throw new ContractError(`${context}: unsupported selected_habit`, {
      selected_habit: personalityHabit.selected_habit,
    });
  }
  const catchphraseProfile = personalityHabit.character_catchphrase_profile;
  if (!catchphraseProfile || typeof catchphraseProfile !== "object") {
    throw new ContractError(`${context}: missing character catchphrase profile`);
  }
  if (catchphraseProfile.internal_profile !== true) {
    throw new ContractError(`${context}: catchphrase profile must be internal`);
  }
  if (
    catchphraseProfile.phase19_catchphrase_profile_boundary?.internal_profile_only !== true ||
    catchphraseProfile.phase19_catchphrase_profile_boundary?.not_canonical_enum !== true ||
    catchphraseProfile.phase19_catchphrase_profile_boundary?.no_user_comment_permanent_addition !== true
  ) {
    throw new ContractError(`${context}: catchphrase profile boundary required`);
  }
  if (!Array.isArray(catchphraseProfile.phrase_pool)) {
    throw new ContractError(`${context}: catchphrase phrase_pool must be an array`);
  }
  for (const phraseHint of catchphraseProfile.phrase_pool) {
    if (!STATIC_CATCHPHRASE_HINTS.has(phraseHint)) {
      throw new ContractError(`${context}: catchphrase phrase_pool must remain static and approved`, {
        phraseHint,
      });
    }
  }
  const boundaryResult = personalityHabit.personality_boundary_result;
  if (!boundaryResult || typeof boundaryResult !== "object" || Array.isArray(boundaryResult)) {
    throw new ContractError(`${context}: personality boundary result is required`);
  }
  if (!Array.isArray(boundaryResult.allowed_habits)) {
    throw new ContractError(`${context}: allowed habits are required`);
  }
  if (!Array.isArray(boundaryResult.blocked_habits)) {
    throw new ContractError(`${context}: blocked habits are required`);
  }
  for (const habit of boundaryResult.allowed_habits) {
    if (!HABIT_TYPES.has(habit)) {
      throw new ContractError(`${context}: unsupported allowed habit`, { habit });
    }
  }
  for (const habit of boundaryResult.blocked_habits) {
    if (!HABIT_TYPES.has(habit)) {
      throw new ContractError(`${context}: unsupported blocked habit`, { habit });
    }
  }
  if (personalityHabit.selected_habit !== "none" && boundaryResult.blocked_habits.includes(personalityHabit.selected_habit)) {
    throw new ContractError(`${context}: selected_habit violates cooldown`, {
      selected_habit: personalityHabit.selected_habit,
    });
  }
  if (
    boundaryResult.cooldown_repetition_guard?.selected_habit_rejected_when_blocked !== true ||
    boundaryResult.cooldown_repetition_guard?.same_habit_consecutive_forbidden !== true
  ) {
    throw new ContractError(`${context}: cooldown repetition guard required`);
  }
  if (personalityHabit.selected_habit === "none" && personalityHabit.habit_cooldown_update?.should_record === true) {
    throw new ContractError(`${context}: rejected habit must not update cooldown`);
  }
  if (
    personalityHabit.selected_habit !== "none" &&
    personalityHabit.character_catchphrase_profile?.cooldown_policy?.blocked_habits?.includes(personalityHabit.selected_habit)
  ) {
    throw new ContractError(`${context}: selected_habit violates catchphrase repetition limit`, {
      selected_habit: personalityHabit.selected_habit,
    });
  }
}

export function createPersonalityHabitHistory({ maxEntries = 12 } = {}) {
  const history = [];
  return {
    list() {
      return structuredClone(history);
    },
    record(personalityHabit) {
      assertPersonalityHabitSafe(personalityHabit, "Personality habit history record");
      if (personalityHabit.selected_habit === "none") return this.list();
      history.push({
        selected_habit: personalityHabit.selected_habit,
        recorded_at_ms: Date.now(),
      });
      while (history.length > maxEntries) history.shift();
      return this.list();
    },
  };
}

function buildContextTags({ affectiveContinuity, bodyContinuity, turnRhythm }) {
  const tags = [];
  if (affectiveContinuity.laughter_state !== "none") tags.push("laugh_recovery");
  if (bodyContinuity.body_state_id === "body_screen_focus_talk") tags.push("game_focus");
  if (turnRhythm.response_mode === "thoughtful_reply") tags.push("thinking");
  if (turnRhythm.response_mode === "playful_reply") tags.push("playful");
  if (affectiveContinuity.affective_state?.mood_level === "focused") tags.push("focused");
  if (tags.length === 0) tags.push("soft_default");
  return tags;
}

function allowedForContext({ contextTags, safetyStatus, textPresent }) {
  if (safetyStatus !== "safe" || !textPresent) return [];
  const allowed = new Set(["light_self_deprecation"]);
  if (contextTags.includes("playful")) allowed.add("playful_tsukkomi");
  if (contextTags.includes("laugh_recovery")) allowed.add("laugh_aftertaste");
  if (contextTags.includes("game_focus")) allowed.add("game_focus_mutter");
  if (contextTags.includes("thinking")) allowed.add("thinking_mutter");
  if (contextTags.includes("focused")) allowed.add("soft_boast");
  return [...allowed];
}

function blockedByCooldown(allowedHabits, recentHabitHistory) {
  const recent = Array.isArray(recentHabitHistory) ? recentHabitHistory.slice(-4) : [];
  const recentlyUsed = new Set(recent.map((entry) => entry.selected_habit));
  return allowedHabits.filter((habit) => recentlyUsed.has(habit));
}

function chooseHabit(allowedHabits, blockedHabits, { affectiveContinuity, bodyContinuity, turnRhythm }) {
  const allowed = allowedHabits.filter((habit) => !blockedHabits.includes(habit));
  if (allowed.length === 0) return "none";
  if (affectiveContinuity.laughter_state !== "none" && allowed.includes("laugh_aftertaste")) {
    return "laugh_aftertaste";
  }
  if (bodyContinuity.body_state_id === "body_screen_focus_talk" && allowed.includes("game_focus_mutter")) {
    return "game_focus_mutter";
  }
  if (turnRhythm.response_mode === "thoughtful_reply" && allowed.includes("thinking_mutter")) {
    return "thinking_mutter";
  }
  if (turnRhythm.response_mode === "playful_reply" && allowed.includes("playful_tsukkomi")) {
    return "playful_tsukkomi";
  }
  return allowed[0] ?? "none";
}

function habitTextHint(selectedHabit) {
  switch (selectedHabit) {
    case "light_self_deprecation":
      return "tiny self-aware aside, never self-negating";
    case "playful_tsukkomi":
      return "soft playful correction, not targeted harassment";
    case "soft_boast":
      return "brief proud sparkle, then return to topic";
    case "thinking_mutter":
      return "quiet thinking mutter before the main point";
    case "laugh_aftertaste":
      return "short laugh-aftertaste breath, then reconnect";
    case "game_focus_mutter":
      return "low-volume game focus mutter, observational only";
    default:
      return null;
  }
}

function buildCatchphraseProfile(selectedHabit, { contextTags, blockedHabits }) {
  const phrasePool = phrasePoolForHabit(selectedHabit);
  return {
    schema: "iris_character_catchphrase_profile_v1",
    internal_profile: true,
    character_profile_id: "iris_default",
    catchphrase_profile_id: "iris_catchphrase_warm_tease_v1",
    selected_phrase_hint: phrasePool[0] ?? null,
    phrase_pool: phrasePool,
    usage_contexts: contextTags,
    forbidden_contexts: [
      "unsafe_status",
      "serious_moderation",
      "viewer_distress",
      "repetition_spam",
      "donation_amount_ranking",
    ],
    cooldown_policy: {
      repetition_limit: "do_not_repeat_same_phrase_back_to_back",
      blocked_habits: blockedHabits,
      minimum_turn_gap: selectedHabit === "none" ? 0 : cooldownTurns(selectedHabit),
    },
    phase19_catchphrase_profile_boundary: {
      internal_profile_only: true,
      not_canonical_enum: true,
      no_user_comment_permanent_addition: true,
    },
    relation_safe_variants: {
      new_viewer: "open_warmth",
      familiar_viewer: "light_specific_warmth",
      trusted_viewer: "still_no_exclusive_claims",
    },
  };
}

function phrasePoolForHabit(selectedHabit) {
  switch (selectedHabit) {
    case "playful_tsukkomi":
      return ["wait_what_was_that", "that_was_a_little_too_smooth"];
    case "soft_boast":
      return ["did_you_see_that", "tiny_proud_moment"];
    case "thinking_mutter":
      return ["give_me_one_second", "i_am_putting_the_pieces_together"];
    case "laugh_aftertaste":
      return ["no_wait_i_am_still_recovering", "that_timing_got_me"];
    case "game_focus_mutter":
      return ["eyes_on_the_screen", "hold_on_i_am_watching_this"];
    case "light_self_deprecation":
      return ["i_made_that_sound_like_a_strategy", "my_brain_took_the_scenic_route"];
    default:
      return [];
  }
}

function cooldownTurns(selectedHabit) {
  switch (selectedHabit) {
    case "soft_boast":
      return 6;
    case "laugh_aftertaste":
      return 3;
    case "playful_tsukkomi":
      return 4;
    case "light_self_deprecation":
      return 5;
    case "game_focus_mutter":
      return 2;
    case "thinking_mutter":
      return 2;
    default:
      return 0;
  }
}

function rejectReason(allowedHabits, blockedHabits, safetyStatus, textPresent) {
  if (safetyStatus !== "safe") return "unsafe_status";
  if (!textPresent) return "silent_turn";
  if (allowedHabits.length > 0 && blockedHabits.length >= allowedHabits.length) return "cooldown";
  return "no_context_fit";
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
    value.forEach((item, index) => assertNoForbiddenFieldsRecursive(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_HABIT_FIELDS.has(field)) {
      throw new ContractError(`${context}: personality habit must not define command or canonical fields`, {
        field,
        path,
      });
    }
    assertNoForbiddenFieldsRecursive(child, context, `${path}.${field}`);
  }
}
