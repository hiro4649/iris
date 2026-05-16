export const canonical = Object.freeze({
  intents: immutableCanonicalSet(["greet", "respond", "observe", "ignore"]),
  conversationStates: immutableCanonicalSet(["opening", "active", "closing", "idle"]),
  actionTypes: immutableCanonicalSet(["SPEAK", "GESTURE", "LOOK", "WAIT", "NOOP"]),
  tones: immutableCanonicalSet(["friendly", "playful", "excited", "calm"]),
  emotions: immutableCanonicalSet(["neutral", "happy", "surprise", "awkward"]),
  characterTags: immutableCanonicalSet(["soft", "playful", "tease", "hype", "calm"]),
  taskTypes: immutableCanonicalSet([
    "CREATE_CONTENT",
    "MODIFY_WORLD",
    "INTERACT_USER",
    "EXECUTE_WORKFLOW",
    "CALL_EXTERNAL",
  ]),
  updatedStores: immutableCanonicalSet([
    "relationship_memory",
    "memory_store",
    "meaning_store",
    "experience_log",
  ]),
});

function immutableCanonicalSet(values) {
  const set = new Set(values);
  const rejectMutation = () => {
    throw new ContractError("canonical enum set is immutable");
  };
  return Object.freeze({
    has: (value) => set.has(value),
    get size() {
      return set.size;
    },
    values: () => set.values(),
    keys: () => set.keys(),
    entries: () => set.entries(),
    forEach: (callback, thisArg) => set.forEach(callback, thisArg),
    [Symbol.iterator]: () => set[Symbol.iterator](),
    add: rejectMutation,
    delete: rejectMutation,
    clear: rejectMutation,
  });
}

export class ContractError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ContractError";
    this.details = details;
  }
}

export function requireFields(object, fields, context) {
  for (const field of fields) {
    if (object[field] === undefined || object[field] === null) {
      throw new ContractError(`${context}: missing required field`, { field });
    }
  }
}

export function assertCanonicalValue(kind, value, allowed) {
  if (!allowed.has(value)) {
    throw new ContractError(`canonical ${kind} violation`, { kind, value });
  }
}

export function assertScore(name, value) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 1) {
    throw new ContractError("score out of range", { name, value });
  }
}

export function assertNoWorldCommand(payload, context) {
  assertNoWorldCommandInValue(payload, context, new WeakSet());
}

function assertNoWorldCommandInValue(value, context, seen) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);

  if (Object.prototype.hasOwnProperty.call(value, "world_command")) {
    throw new ContractError(`${context}: core payload must not include world_command`);
  }

  for (const nested of Object.values(value)) {
    assertNoWorldCommandInValue(nested, context, seen);
  }
}

export function assertNoDirectMemoryWrite(payload, context) {
  assertNoDirectMemoryWriteInValue(payload, context, new WeakSet());
}

function assertNoDirectMemoryWriteInValue(value, context, seen) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);

  for (const forbidden of ["memory_write", "direct_memory_write", "commit_memory"]) {
    if (Object.prototype.hasOwnProperty.call(value, forbidden)) {
      throw new ContractError(`${context}: direct memory write is forbidden`, {
        forbidden,
      });
    }
  }

  for (const nested of Object.values(value)) {
    assertNoDirectMemoryWriteInValue(nested, context, seen);
  }
}

export function assertNoDirectCandidateCommit(payload, context) {
  assertNoDirectCandidateCommitInValue(payload, context, new WeakSet());
}

function assertNoDirectCandidateCommitInValue(value, context, seen) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);

  for (const forbidden of [
    "memory_candidate",
    "relationship_update_candidate",
    "selected_memory_ids",
    "recall_candidate",
    "input_action_candidate",
    "memory_carryover_candidates",
    "community_memory_candidates",
  ]) {
    if (Object.prototype.hasOwnProperty.call(value, forbidden)) {
      throw new ContractError(`${context}: candidate or reference cannot be committed directly`, {
        forbidden,
      });
    }
  }

  for (const nested of Object.values(value)) {
    assertNoDirectCandidateCommitInValue(nested, context, seen);
  }
}

const INTERNAL_PROFILE_CANONICAL_FIREWALL_VALUES = new Set([
  "body_state",
  "laughter_state",
  "response_mode",
  "habit",
  "commentary_mode",
  "game_goal",
  "game_strategy",
  "game_embodied_state",
  "session_phase",
  "speech_rate_profile",
  "language_profile",
  "subtitle_cue",
  "camera_proximity_profile",
]);

const CANONICAL_FIELD_KINDS = new Set([
  "intent",
  "action_type",
  "tone",
  "emotion",
  "character_tag",
  "task_type",
  "conversation_state",
  "updated_store",
]);

export function assertNoInternalProfileCanonicalLeak(payload, context) {
  assertNoInternalProfileCanonicalLeakInValue(payload, context, new WeakSet());
}

function assertNoInternalProfileCanonicalLeakInValue(value, context, seen) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);

  for (const [field, child] of Object.entries(value)) {
    if (
      CANONICAL_FIELD_KINDS.has(field) &&
      INTERNAL_PROFILE_CANONICAL_FIREWALL_VALUES.has(String(child))
    ) {
      throw new ContractError(`${context}: internal profile must not enter canonical enum field`, {
        field,
      });
    }
    assertNoInternalProfileCanonicalLeakInValue(child, context, seen);
  }
}

export function assertCoreBoundary(payload, context) {
  assertNoWorldCommand(payload, context);
  assertNoDirectMemoryWrite(payload, context);
  assertNoDirectCandidateCommit(payload, context);
  assertNoInternalProfileCanonicalLeak(payload, context);
}

export function normalizeFinalDecision(finalDecision) {
  switch (finalDecision) {
    case "allow":
    case "pass":
      return "safe";
    case "degrade":
      return "degrade";
    case "block":
    case "reject":
    case "fail":
      return "reject";
    default:
      throw new ContractError("unknown status for normalization", { finalDecision });
  }
}

export function normalizeStatus(status) {
  switch (status) {
    case "safe":
    case "pass":
    case "allow":
    case "approved":
    case "synced":
      return "safe";
    case "degrade":
      return "degrade";
    case "reject":
    case "block":
    case "fail":
    case "rejected":
    case "unsafe":
      return "reject";
    case "pending":
      return "review_required";
    default:
      throw new ContractError("unknown status for normalization", { status });
  }
}

export function assertCandidateNotExecutable(candidate, context) {
  if (!candidate || typeof candidate !== "object") {
    return;
  }
  for (const forbidden of ["execute", "commit", "write", "apply"]) {
    if (Object.prototype.hasOwnProperty.call(candidate, forbidden)) {
      throw new ContractError(`${context}: candidate must not be executable`, {
        forbidden,
      });
    }
  }
  if (candidate.requires_validation !== true) {
    throw new ContractError(`${context}: candidate requires_validation must be true`);
  }
}

export function validateCanonicalAction(action) {
  requireFields(
    action,
    [
      "trace_id",
      "event_id",
      "action_type",
      "skill_id",
      "target_presence_id",
      "tone",
      "character_tag",
    ],
    "Phase04 action"
  );
  assertNoWorldCommand(action, "Phase04 action");
  assertCanonicalValue("action_type", action.action_type, canonical.actionTypes);
  assertCanonicalValue("tone", action.tone, canonical.tones);
  assertCanonicalValue("character_tag", action.character_tag, canonical.characterTags);
}
