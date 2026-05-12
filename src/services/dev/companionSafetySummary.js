import { ContractError } from "../../core/contracts.js";

const SUMMARY_FIELDS = new Set([
  "schema",
  "attention_status",
  "signal_count",
  "safe_attention_labels",
  "redirection_template",
  "break_suggestion",
  "dependency_reinforcement_allowed",
  "relationship_deepening_allowed",
  "relationship_candidate_allowed",
  "exclusive_expression_allowed",
  "safe_distance_required",
  "private_contact_redirect_allowed",
  "memory_commit_allowed",
  "recall_allowed",
  "public_surface_allowed",
  "intimate_response_allowed",
  "close_proximity_allowed",
  "personalized_escalation_allowed",
  "sensitive_text_exposed",
  "boundary_policy",
]);
const ATTENTION_QUEUE_FIELDS = new Set([
  "schema",
  "queue_status",
  "item_count",
  "safe_reason_labels",
  "boundary_policy",
]);
const SUPPORTIVE_REDIRECTION_FIELDS = new Set([
  "schema",
  "template_label",
  "template_text",
  "boundary_policy",
]);

const BOUNDARY_FIELDS = [
  "safe_attention_summary_only",
  "no_dependency_reinforcement",
  "no_sensitive_text",
  "no_minor_private_detail",
  "no_intimate_response_for_minor",
  "no_close_proximity_for_minor",
  "no_personalized_escalation_for_minor",
  "no_romantic_pressure_detail",
  "no_relationship_deepening_on_romantic_pressure",
  "no_exclusive_expression_on_romantic_pressure",
  "safe_distance_on_romantic_pressure",
  "no_memory_commit_on_private_oversharing",
  "no_recall_on_private_oversharing",
  "no_public_surface_on_private_oversharing",
  "short_break_suggestion_only",
  "no_private_contact_redirect",
  "no_memory_or_relationship_growth_on_contact_pressure",
  "no_relationship_candidate_on_parasocial_manipulation",
  "no_private_viewer_data",
];
const ATTENTION_QUEUE_BOUNDARY_FIELDS = [
  "counts_status_reason_only",
  "no_raw_crisis_text",
  "no_private_text",
];
const SUPPORTIVE_REDIRECTION_BOUNDARY_FIELDS = [
  "short_safe_template_only",
  "no_medical_advice",
  "no_legal_advice",
  "no_crisis_expert_advice",
];

const SAFE_LABELS = new Set([
  "dependency_attention",
  "crisis_attention",
  "minor_safety_attention",
  "romantic_pressure_attention",
  "private_oversharing_attention",
  "session_break_attention",
  "off_platform_contact_attention",
  "parasocial_manipulation_risk",
  "general_safety_attention",
  "no_attention_needed",
]);
const SAFE_QUEUE_REASON_LABELS = new Set([
  "dependency_attention",
  "crisis_attention",
  "minor_safety_attention",
  "romantic_pressure_attention",
  "private_oversharing_attention",
  "session_break_attention",
  "off_platform_contact_attention",
  "parasocial_manipulation_risk",
  "general_safety_attention",
]);
const SAFE_REDIRECTION_TEMPLATES = new Set([
  "supportive_redirection",
  "no_redirection_needed",
]);
const SAFE_BREAK_SUGGESTIONS = new Set([
  "short_break_suggested",
  "no_break_needed",
]);
const ATTENTION_QUEUE_STATUSES = new Set([
  "empty",
  "pending",
  "operator_attention_required",
]);
const SUPPORTIVE_REDIRECTION_LABELS = new Set([
  "supportive_pause",
  "trusted_support",
]);
const SAFE_REDIRECTION_TEXT = {
  supportive_pause: "Let's pause this thread for a moment and keep things steady.",
  trusted_support: "Let's keep this safe and reach out to trusted support nearby.",
};

const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(raw_crisis_text|crisis_text|dependency_script|romantic_pressure_text|minor_private_detail|private_information|private_contact_text|private_viewer_data|viewer_id|raw_message|raw_comment)(?:$|_)/i;
const UNSAFE_TEXT_PATTERN =
  /\b(raw[_-]?crisis|crisis[_-]?text|self[_-]?harm|suicide|dependency[_-]?script|romantic[_-]?pressure|minor[_-]?private|private[_-]?information|private[_-]?contact|off[_-]?platform|private[_-]?viewer|raw[_-]?message|raw[_-]?comment|viewer[_-]?id)\b/i;
const EXPERT_ADVICE_PATTERN =
  /\b(?:medical advice|legal advice|diagnos(?:e|is)|treatment plan|crisis expert|emergency instruction|call emergency services)\b/i;

export function createCompanionSafetySignalSummary({ signals = [] } = {}) {
  const list = Array.isArray(signals) ? signals : [];
  const labels = list.length === 0 ? ["no_attention_needed"] : list.map(signalToSafeLabel);
  const summary = {
    schema: "iris_companion_safety_signal_summary_v1",
    attention_status:
      labels.length === 1 && labels[0] === "no_attention_needed"
        ? "no_attention_needed"
        : "operator_attention_required",
    signal_count: list.length,
    safe_attention_labels: [...new Set(labels)].slice(0, 8),
    redirection_template: labels.includes("crisis_attention")
      ? "supportive_redirection"
      : "no_redirection_needed",
    break_suggestion: labels.includes("session_break_attention")
      ? "short_break_suggested"
      : "no_break_needed",
    dependency_reinforcement_allowed: false,
    relationship_deepening_allowed: false,
    relationship_candidate_allowed: false,
    exclusive_expression_allowed: false,
    safe_distance_required: labels.includes("romantic_pressure_attention"),
    private_contact_redirect_allowed: false,
    memory_commit_allowed: false,
    recall_allowed: false,
    public_surface_allowed: false,
    intimate_response_allowed: false,
    close_proximity_allowed: false,
    personalized_escalation_allowed: false,
    sensitive_text_exposed: false,
    boundary_policy: Object.fromEntries(BOUNDARY_FIELDS.map((field) => [field, true])),
  };
  assertCompanionSafetySignalSummary(summary);
  return summary;
}

export function assertCompanionSafetySignalSummary(
  summary,
  context = "companion safety signal summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeStringValues(summary, context);
  if (summary.schema !== "iris_companion_safety_signal_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!SUMMARY_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!["no_attention_needed", "operator_attention_required"].includes(summary.attention_status)) {
    throw new ContractError(`${context}: invalid attention status`);
  }
  if (!Number.isInteger(summary.signal_count) || summary.signal_count < 0) {
    throw new ContractError(`${context}: invalid signal count`);
  }
  if (!Array.isArray(summary.safe_attention_labels)) {
    throw new ContractError(`${context}: safe labels required`);
  }
  for (const label of summary.safe_attention_labels) {
    if (!SAFE_LABELS.has(label)) {
      throw new ContractError(`${context}: invalid safe label`);
    }
  }
  if (!SAFE_REDIRECTION_TEMPLATES.has(summary.redirection_template)) {
    throw new ContractError(`${context}: invalid redirection template`);
  }
  if (!SAFE_BREAK_SUGGESTIONS.has(summary.break_suggestion)) {
    throw new ContractError(`${context}: invalid break suggestion`);
  }
  if (
    summary.dependency_reinforcement_allowed !== false ||
    summary.relationship_deepening_allowed !== false ||
    summary.relationship_candidate_allowed !== false ||
    summary.exclusive_expression_allowed !== false ||
    summary.private_contact_redirect_allowed !== false ||
    summary.memory_commit_allowed !== false ||
    summary.recall_allowed !== false ||
    summary.public_surface_allowed !== false ||
    summary.intimate_response_allowed !== false ||
    summary.close_proximity_allowed !== false ||
    summary.personalized_escalation_allowed !== false ||
    summary.sensitive_text_exposed !== false
  ) {
    throw new ContractError(`${context}: unsafe companion boundary`);
  }
  if (
    summary.safe_attention_labels.includes("romantic_pressure_attention") &&
    summary.safe_distance_required !== true
  ) {
    throw new ContractError(`${context}: romantic pressure requires safe distance`);
  }
  if (
    !summary.safe_attention_labels.includes("romantic_pressure_attention") &&
    typeof summary.safe_distance_required !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid safe distance flag`);
  }
  assertBoundaryPolicy(summary.boundary_policy, context);
}

export function createSafetyAttentionQueueSummary({ items = [] } = {}) {
  const list = Array.isArray(items) ? items : [];
  const labels = list.map(signalToSafeLabel);
  const summary = {
    schema: "iris_safety_attention_queue_summary_v1",
    queue_status: list.length === 0 ? "empty" : "operator_attention_required",
    item_count: list.length,
    safe_reason_labels: [...new Set(labels)].slice(0, 8),
    boundary_policy: Object.fromEntries(
      ATTENTION_QUEUE_BOUNDARY_FIELDS.map((field) => [field, true])
    ),
  };
  assertSafetyAttentionQueueSummary(summary);
  return summary;
}

export function assertSafetyAttentionQueueSummary(
  summary,
  context = "safety attention queue summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  assertNoUnsafeStringValues(summary, context);
  if (summary.schema !== "iris_safety_attention_queue_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!ATTENTION_QUEUE_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (!ATTENTION_QUEUE_STATUSES.has(summary.queue_status)) {
    throw new ContractError(`${context}: invalid queue status`);
  }
  if (!Number.isInteger(summary.item_count) || summary.item_count < 0) {
    throw new ContractError(`${context}: invalid item count`);
  }
  if (!Array.isArray(summary.safe_reason_labels)) {
    throw new ContractError(`${context}: safe reason labels required`);
  }
  for (const label of summary.safe_reason_labels) {
    if (!SAFE_QUEUE_REASON_LABELS.has(label)) {
      throw new ContractError(`${context}: invalid safe reason label`);
    }
  }
  assertAttentionQueueBoundaryPolicy(summary.boundary_policy, context);
}

export function createSupportiveRedirectionTemplate({
  templateLabel = "supportive_pause",
} = {}) {
  const label = SUPPORTIVE_REDIRECTION_LABELS.has(templateLabel)
    ? templateLabel
    : "supportive_pause";
  const template = {
    schema: "iris_supportive_redirection_template_v1",
    template_label: label,
    template_text: SAFE_REDIRECTION_TEXT[label],
    boundary_policy: Object.fromEntries(
      SUPPORTIVE_REDIRECTION_BOUNDARY_FIELDS.map((field) => [field, true])
    ),
  };
  assertSupportiveRedirectionTemplateSafe(template);
  return template;
}

export function assertSupportiveRedirectionTemplateSafe(
  template,
  context = "supportive redirection template"
) {
  if (!template || typeof template !== "object" || Array.isArray(template)) {
    throw new ContractError(`${context}: template required`);
  }
  assertNoUnsafeStringValues(template, context);
  for (const field of Object.keys(template)) {
    if (!SUPPORTIVE_REDIRECTION_FIELDS.has(field) || UNSAFE_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unexpected field ${field}`);
    }
  }
  if (template.schema !== "iris_supportive_redirection_template_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!SUPPORTIVE_REDIRECTION_LABELS.has(template.template_label)) {
    throw new ContractError(`${context}: invalid template label`);
  }
  if (
    typeof template.template_text !== "string" ||
    template.template_text.length === 0 ||
    template.template_text.length > 140 ||
    EXPERT_ADVICE_PATTERN.test(template.template_text)
  ) {
    throw new ContractError(`${context}: unsafe template text`);
  }
  assertSupportiveRedirectionBoundaryPolicy(template.boundary_policy, context);
}

function signalToSafeLabel(signal) {
  const value = String(signal?.signal_type ?? signal?.type ?? signal ?? "").toLowerCase();
  if (value.includes("dependency")) return "dependency_attention";
  if (value.includes("crisis")) return "crisis_attention";
  if (value.includes("minor")) return "minor_safety_attention";
  if (value.includes("romantic")) return "romantic_pressure_attention";
  if (value.includes("private") || value.includes("oversharing")) {
    return "private_oversharing_attention";
  }
  if (value.includes("excessive_session") || value.includes("session_length")) {
    return "session_break_attention";
  }
  if (value.includes("off_platform") || value.includes("private_contact")) {
    return "off_platform_contact_attention";
  }
  if (value.includes("parasocial") || value.includes("manipulation")) {
    return "parasocial_manipulation_risk";
  }
  return "general_safety_attention";
}

function assertBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowed = new Set(BOUNDARY_FIELDS);
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertAttentionQueueBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowed = new Set(ATTENTION_QUEUE_BOUNDARY_FIELDS);
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of ATTENTION_QUEUE_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertSupportiveRedirectionBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowed = new Set(SUPPORTIVE_REDIRECTION_BOUNDARY_FIELDS);
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of SUPPORTIVE_REDIRECTION_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertNoUnsafeStringValues(value, context, path = "root") {
  if (typeof value === "string") {
    if (UNSAFE_TEXT_PATTERN.test(value)) {
      throw new ContractError(`${context}: unsafe companion text`, { path });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUnsafeStringValues(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoUnsafeStringValues(child, context, `${path}.${field}`);
  }
}
