import { ContractError, assertNoWorldCommand } from "../../core/contracts.js";

const FORBIDDEN_INTERNAL_FIELDS = new Set([
  "world_command",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "execute",
  "commit",
  "write",
  "apply",
  "action_type",
  "intent",
  "emotion",
  "tone",
  "character_tag",
]);

export function createAffectState(initial = {}) {
  const state = {
    energy: clamp01(initial.energy ?? 0.42),
    amusement: clamp01(initial.amusement ?? 0.22),
    focus: clamp01(initial.focus ?? 0.48),
    warmth: clamp01(initial.warmth ?? 0.54),
    turns_since_rest: Number.isInteger(initial.turns_since_rest) ? initial.turns_since_rest : 0,
    last_trigger: initial.last_trigger ?? "startup",
    updated_at_ms: Date.now(),
  };

  return {
    getSnapshot() {
      return finalizeSnapshot(state);
    },
    updateFromInput({ phase01, phase02 } = {}) {
      assertNoWorldCommand(phase01, "Affect input phase01");
      assertNoWorldCommand(phase02, "Affect input phase02");

      const isGame = phase01?.payload_kind === "game_observation";
      const isHumor =
        phase02?.tone === "playful" ||
        /lol|lmao|funny|haha|www/i.test(phase01?.normalized_text ?? "");
      const isAddressed = phase01?.intent === "respond";

      state.energy = decay(state.energy, 0.88) + (isHumor ? 0.14 : 0) + (isGame ? 0.04 : 0);
      state.amusement = decay(state.amusement, 0.72) + (isHumor ? 0.32 : 0);
      state.focus = decay(state.focus, 0.9) + (isGame ? 0.2 : 0.02);
      state.warmth = decay(state.warmth, 0.94) + (isAddressed ? 0.08 : 0.02);
      state.turns_since_rest += 1;
      state.last_trigger = isHumor ? "humor" : isGame ? "game_observation" : "conversation";
      state.updated_at_ms = Date.now();

      state.energy = clamp01(state.energy);
      state.amusement = clamp01(state.amusement);
      state.focus = clamp01(state.focus);
      state.warmth = clamp01(state.warmth);

      return finalizeSnapshot(state);
    },
  };
}

export function assertReadOnlyAffectSnapshot(snapshot, context = "affect snapshot") {
  if (!snapshot || typeof snapshot !== "object") return;
  assertNoWorldCommand(snapshot, context);
  for (const field of Object.keys(snapshot)) {
    if (FORBIDDEN_INTERNAL_FIELDS.has(field)) {
      throw new ContractError(`${context}: internal affect must not define canonical or command fields`, {
        field,
      });
    }
  }
}

function finalizeSnapshot(state) {
  const snapshot = {
    schema: "iris_affect_snapshot_v1",
    energy: clamp01(state.energy),
    amusement: clamp01(state.amusement),
    focus: clamp01(state.focus),
    warmth: clamp01(state.warmth),
    affect_label: labelFor(state),
    turns_since_rest: state.turns_since_rest,
    last_trigger: state.last_trigger,
    updated_at_ms: state.updated_at_ms,
  };
  assertReadOnlyAffectSnapshot(snapshot);
  return structuredClone(snapshot);
}

function labelFor(state) {
  if (state.amusement >= 0.62) return "laughing_bright";
  if (state.focus >= 0.68) return "focused";
  if (state.energy >= 0.62) return "lively";
  if (state.warmth >= 0.62) return "warm";
  return "settled";
}

function decay(value, factor) {
  return clamp01(value * factor);
}

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  if (number < 0) return 0;
  if (number > 1) return 1;
  return Number(number.toFixed(4));
}
