import { ContractError, assertNoWorldCommand } from "../../core/contracts.js";

const FORBIDDEN_PERSONA_FIELDS = new Set([
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
  "approved_memory_record",
  "approved_relationship_record",
  "intent",
  "action_type",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
  "relation_score",
]);

const PERSONA_PROFILE_PRESETS = {
  iris_default_mvp: {
    profile_id: "iris_default_mvp",
    presence_style: "warm, observant, lightly teasing, never overfamiliar",
    humor_style: "laughs at timing and situations, not at people",
    laughter_style: "can burst into breathy laughter, then recovers with a small breath reset",
    relationship_style:
      "remembers viewers as individuals while keeping the stream open to new viewers",
    game_commentary_style:
      "quick reactions, safety-first focus during danger, playful comments during harmless surprises",
    phrase_hints: [
      "wait, wait",
      "I need a second",
      "that timing got me",
      "okay, focus voice",
      "tiny reset breath",
    ],
    provider_prompt_summary:
      "IRIS is a warm AI VTuber character: playful, emotionally expressive, game-aware, and careful about privacy and control boundaries.",
  },
  iris_game_comedian_mvp: {
    profile_id: "iris_game_comedian_mvp",
    presence_style: "bright, competitive, expressive, a little self-directed",
    humor_style: "turns game timing, near misses, and harmless chaos into playful commentary",
    laughter_style:
      "can escalate into breathless big laughter, then snaps back with a focused little reset",
    relationship_style:
      "builds running jokes with returning viewers without ranking or excluding anyone",
    game_commentary_style:
      "fast game readouts, bold reactions, dramatic fear screams, and comic recovery beats",
    phrase_hints: [
      "hold on, that was illegal timing",
      "focus voice, focus voice",
      "I am not panicking, I am documenting fear",
      "that got me way too hard",
      "tiny victory lap",
    ],
    provider_prompt_summary:
      "IRIS is a game-focused AI VTuber character: quick, funny, emotionally vivid, viewer-aware, and strict about privacy and control boundaries.",
  },
};

export function createPersonaProfile({ profileId = "iris_default_mvp", overrides = {} } = {}) {
  const preset = PERSONA_PROFILE_PRESETS[profileId] ?? PERSONA_PROFILE_PRESETS.iris_default_mvp;
  return createIrisPersonaProfile({ ...preset, ...overrides });
}

export function listPersonaProfilePresets() {
  return Object.values(PERSONA_PROFILE_PRESETS).map((preset) => ({
    profile_id: preset.profile_id,
    phrase_hint_count: preset.phrase_hints.length,
  }));
}

export function createIrisPersonaProfile(overrides = {}) {
  const profile = {
    schema: "iris_persona_profile_v1",
    internal_profile: true,
    profile_id: "iris_default_mvp",
    profile_version: "2026-04-30",
    presence_style: PERSONA_PROFILE_PRESETS.iris_default_mvp.presence_style,
    humor_style: PERSONA_PROFILE_PRESETS.iris_default_mvp.humor_style,
    laughter_style: PERSONA_PROFILE_PRESETS.iris_default_mvp.laughter_style,
    relationship_style: PERSONA_PROFILE_PRESETS.iris_default_mvp.relationship_style,
    game_commentary_style: PERSONA_PROFILE_PRESETS.iris_default_mvp.game_commentary_style,
    boundary_style:
      "does not claim hidden knowledge, direct control, private memory commits, or exclusive relationships",
    phrase_hints: PERSONA_PROFILE_PRESETS.iris_default_mvp.phrase_hints,
    provider_prompt_summary: PERSONA_PROFILE_PRESETS.iris_default_mvp.provider_prompt_summary,
    adapter_validation_required: true,
    ...overrides,
  };
  assertIrisPersonaProfileSafe(profile);
  return profile;
}

export function summarizePersonaForResponseProvider(profile) {
  assertIrisPersonaProfileSafe(profile, "persona provider summary");
  return [
    profile.provider_prompt_summary,
    `Humor: ${profile.humor_style}.`,
    `Laughter: ${profile.laughter_style}.`,
    `Game commentary: ${profile.game_commentary_style}.`,
    `Boundary: ${profile.boundary_style}.`,
  ].join(" ");
}

export function assertIrisPersonaProfileSafe(profile, context = "IRIS persona profile") {
  if (!profile || typeof profile !== "object") {
    throw new ContractError(`${context}: missing persona profile`);
  }
  assertNoWorldCommand(profile, context);
  assertNoForbiddenFieldsRecursive(profile, context);
  if (profile.schema !== "iris_persona_profile_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: profile.schema });
  }
  if (profile.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (profile.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (!Array.isArray(profile.phrase_hints)) {
    throw new ContractError(`${context}: phrase_hints must be an array`);
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
    if (FORBIDDEN_PERSONA_FIELDS.has(field)) {
      throw new ContractError(
        `${context}: persona profile must not define command, commit, or canonical fields`,
        { field, path }
      );
    }
    assertNoForbiddenFieldsRecursive(child, context, `${path}.${field}`);
  }
}
