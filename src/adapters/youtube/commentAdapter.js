import { randomUUID } from "node:crypto";
import { ContractError } from "../../core/contracts.js";
import { phase01Intent } from "../../core/phases/phase01Intent.js";

const FORBIDDEN_COMMENT_FIELDS = new Set([
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
  "relationship_update_candidate",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "approved_memory_record",
  "approved_relationship_record",
  "canonical",
  "canonical_envelope",
  "intent",
  "conversation_state",
  "action_type",
  "tone",
  "emotion",
  "character_tag",
  "task_type",
  "relation_score",
  "endpoint",
  "url",
  "api_key",
  "apiKey",
  "oauth_token",
  "oauthToken",
  "access_token",
  "refresh_token",
  "token",
  "secret",
  "password",
  "authorization",
]);
const SUPPORT_DETAIL_FIELDS = new Set([
  "superChatDetails",
  "superStickerDetails",
  "superThanksDetails",
  "paidMessageDetails",
  "paidStickerDetails",
  "memberMilestoneChatDetails",
  "newSponsorDetails",
  "sponsorDetails",
  "sponsorshipDetails",
  "membershipDetails",
  "membershipGiftingDetails",
  "giftMembershipReceivedDetails",
  "membershipGiftDetails",
  "giftMembershipDetails",
  "giftDetails",
  "support_details",
  "supportDetails",
]);
const SUPPORT_AMOUNT_FIELDS = new Set([
  "amount_tier",
  "amountTier",
  "tier",
  "amount",
  "amount_micros",
  "amountMicros",
  "amount_display_string",
  "amountDisplayString",
  "formattedAmount",
  "displayAmount",
  "giftMembershipsCount",
  "giftMembershipCount",
  "giftedMembershipCount",
  "gift_memberships_count",
  "gift_membership_count",
  "gift_count",
  "giftCount",
  "memberCount",
  "member_count",
]);
const SUPPORT_TYPE_FIELDS = new Set([
  "type",
  "event_type",
  "eventType",
  "support_event_type",
  "supportEventType",
]);
const SUPPORT_EVENT_TYPES = new Set([
  "superChatEvent",
  "superStickerEvent",
  "superThanksEvent",
  "newSponsorEvent",
  "memberMilestoneChatEvent",
  "membershipGiftingEvent",
  "giftMembershipReceivedEvent",
  "normalizedSupportEvent",
]);
const SUPPORT_EVENT_TYPE_ALIASES = new Set([
  "paidmessageevent",
  "paidmessage",
  "paid_message",
  "superchat",
  "super_chat",
  "paidstickerevent",
  "paidsticker",
  "paid_sticker",
  "supersticker",
  "super_sticker",
  "superthanks",
  "super_thanks",
  "sponsorevent",
  "sponsor",
  "membership",
  "membershipevent",
  "newmemberevent",
  "newmembershipevent",
  "new_member",
  "new_membership",
  "membermilestoneevent",
  "membershipmilestoneevent",
  "member_milestone",
  "membership_milestone",
  "membershipgiftevent",
  "membershipgift",
  "membership_gift",
  "membershipgifting",
  "giftmembershipevent",
  "giftmembershipsevent",
  "giftedmembershipevent",
  "giftmembershipreceived",
  "giftmembershipreceivedevent",
  "gift_received_membership",
  "receivedmembershipgift",
  "normalizedsupportevent",
  "supportevent",
  "support_event",
  "donation",
]);
const YOUTUBE_INGEST_EVENT_SUMMARY_CONTRACT_MANIFEST_FIELDS = new Set([
  "schema",
  "contract_kind",
  "event_summary_schema",
  "accepted_sources",
  "allowed_summary_fields",
  "boundary_policy",
  "adapter_validation_required",
]);
const YOUTUBE_INGEST_EVENT_SUMMARY_FIELDS = new Set([
  "schema",
  "source",
  "event_id_present",
  "trace_id_present",
  "timestamp_present",
  "payload_kind",
  "author_present",
  "message_text_present",
  "support_event_present",
  "contract_manifest",
  "boundary_policy",
  "adapter_validation_required",
]);
const YOUTUBE_INGEST_PHASE01_E2E_SUMMARY_FIELDS = new Set([
  "schema",
  "source",
  "phase01_event_ready",
  "phase01_intent",
  "payload_kind",
  "trace_id_present",
  "event_id_present",
  "timestamp_present",
  "target_presence_present",
  "linked_identity_present",
  "normalized_text_present",
  "boundary_policy",
  "adapter_validation_required",
]);

export function normalizeYouTubeComment(raw) {
  assertCommentInputSafe(raw);
  const eventId = cleanText(
    raw.event_id ?? raw.eventId ?? raw.platform_event_id ?? raw.platformEventId ?? raw.id ?? "",
    180
  );
  const traceId = cleanText(raw.trace_id ?? raw.traceId ?? "", 180);
  return {
    trace_id: traceId || randomUUID(),
    event_id: eventId || randomUUID(),
    source: "youtube_live_chat",
    timestamp_ms: normalizeTimestampMs(raw.timestamp_ms ?? raw.timestampMs ?? raw.publishedAt ?? raw.createdAt),
    target_presence_id: "presence:youtube-main",
    payload: {
      author_channel_id:
        cleanText(raw.author_channel_id ?? raw.authorChannelId ?? "unknown", 160) || "unknown",
      display_name: cleanText(raw.display_name ?? raw.displayName ?? "viewer", 120) || "viewer",
      text: cleanText(
        raw.text ?? raw.message_text ?? raw.messageText ?? raw.textOriginal ?? raw.textDisplay ?? "",
        500
      ),
      moderation_status: "unconfirmed",
    },
  };
}

export function createYouTubeIngestEventSummary(event) {
  assertCommentInputSafe(event, "YouTube ingest event summary input");
  const summary = {
    schema: "iris_youtube_ingest_event_summary_v1",
    source: summarizeEventSource(event?.source),
    event_id_present: cleanText(event?.event_id, 180) !== "",
    trace_id_present: cleanText(event?.trace_id, 180) !== "",
    timestamp_present: Number.isFinite(Number(event?.timestamp_ms)),
    payload_kind: summarizePayloadKind(event),
    author_present:
      cleanText(event?.payload?.author_channel_id, 160) !== "" ||
      cleanText(event?.payload?.display_name, 120) !== "",
    message_text_present: cleanText(event?.payload?.text, 500) !== "",
    support_event_present: summarizePayloadKind(event) === "support_event",
    contract_manifest: createYouTubeIngestEventSummaryContractManifest(),
    boundary_policy: {
      counts_types_and_booleans_only: true,
      no_raw_comment_text: true,
      no_api_response_body: true,
      no_private_author_ids: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_candidates: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
  assertYouTubeIngestEventSummarySafe(summary);
  return summary;
}

export function createYouTubeIngestEventSummaryContractManifest() {
  const manifest = {
    schema: "iris_youtube_ingest_event_summary_contract_manifest_v1",
    contract_kind: "youtube_ingest_event_summary",
    event_summary_schema: "iris_youtube_ingest_event_summary_v1",
    accepted_sources: ["youtube_live_chat", "youtube_donation"],
    allowed_summary_fields: [
      "schema",
      "source",
      "event_id_present",
      "trace_id_present",
      "timestamp_present",
      "payload_kind",
      "author_present",
      "message_text_present",
      "support_event_present",
      "boundary_policy",
      "adapter_validation_required",
    ],
    boundary_policy: {
      counts_types_and_booleans_only: true,
      no_raw_comment_text: true,
      no_api_response_body: true,
      no_private_author_ids: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_candidates: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
  assertYouTubeIngestEventSummaryContractManifestSafe(manifest);
  return manifest;
}

export function createYouTubeIngestPhase01E2ESummary(rawComment) {
  const event = normalizeYouTubeComment(rawComment);
  const phase01 = phase01Intent(event);
  const summary = {
    schema: "iris_youtube_ingest_phase01_e2e_summary_v1",
    source: summarizeEventSource(phase01.source),
    phase01_event_ready: phase01.payload_kind === "comment" && phase01.source === "youtube_live_chat",
    phase01_intent: summarizePhase01Intent(phase01.intent),
    payload_kind: phase01.payload_kind === "comment" ? "comment" : "unknown",
    trace_id_present: cleanText(phase01.trace_id, 180) !== "",
    event_id_present: cleanText(phase01.event_id, 180) !== "",
    timestamp_present: Number.isFinite(Number(phase01.timestamp_ms)),
    target_presence_present: cleanText(phase01.target_presence_id, 180) !== "",
    linked_identity_present: cleanText(phase01.linked_identity_id, 180) !== "",
    normalized_text_present: cleanText(phase01.normalized_text, 500) !== "",
    boundary_policy: {
      status_counts_and_labels_only: true,
      no_raw_comment_text: true,
      no_api_response_body: true,
      no_private_author_ids: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_candidates: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
  assertYouTubeIngestPhase01E2ESummarySafe(summary);
  return summary;
}

export function assertYouTubeIngestEventSummarySafe(
  summary,
  context = "YouTube ingest event summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary must be an object`);
  }
  for (const field of Object.keys(summary)) {
    if (!YOUTUBE_INGEST_EVENT_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field`, { field });
    }
  }
  if (summary.schema !== "iris_youtube_ingest_event_summary_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: summary.schema });
  }
  if (!["youtube_live_chat", "youtube_donation", "unknown"].includes(summary.source)) {
    throw new ContractError(`${context}: invalid source`, { source: summary.source });
  }
  if (!["comment", "support_event", "unknown"].includes(summary.payload_kind)) {
    throw new ContractError(`${context}: invalid payload kind`, {
      payload_kind: summary.payload_kind,
    });
  }
  for (const field of [
    "event_id_present",
    "trace_id_present",
    "timestamp_present",
    "author_present",
    "message_text_present",
    "support_event_present",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: boolean field required`, { field });
    }
  }
  assertYouTubeIngestEventSummaryContractManifestSafe(
    summary.contract_manifest,
    `${context} contract manifest`
  );
  assertSummaryBoundaryPolicySafe(summary.boundary_policy, context);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation is required`);
  }
  assertNoUnsafeSummaryMaterial(summary, context);
}

export function assertYouTubeIngestEventSummaryContractManifestSafe(
  manifest,
  context = "YouTube ingest event summary contract manifest"
) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new ContractError(`${context}: manifest must be an object`);
  }
  for (const field of Object.keys(manifest)) {
    if (!YOUTUBE_INGEST_EVENT_SUMMARY_CONTRACT_MANIFEST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field`, { field });
    }
  }
  if (manifest.schema !== "iris_youtube_ingest_event_summary_contract_manifest_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: manifest.schema });
  }
  if (
    manifest.contract_kind !== "youtube_ingest_event_summary" ||
    manifest.event_summary_schema !== "iris_youtube_ingest_event_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid summary contract`);
  }
  if (
    !Array.isArray(manifest.accepted_sources) ||
    !manifest.accepted_sources.includes("youtube_live_chat") ||
    !manifest.accepted_sources.includes("youtube_donation")
  ) {
    throw new ContractError(`${context}: accepted sources are required`);
  }
  if (
    !Array.isArray(manifest.allowed_summary_fields) ||
    !manifest.allowed_summary_fields.includes("payload_kind") ||
    !manifest.allowed_summary_fields.includes("message_text_present")
  ) {
    throw new ContractError(`${context}: allowed summary fields are incomplete`);
  }
  assertSummaryBoundaryPolicySafe(manifest.boundary_policy, context);
  if (manifest.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation is required`);
  }
  assertNoUnsafeSummaryMaterial(manifest, context);
}

export function assertYouTubeIngestPhase01E2ESummarySafe(
  summary,
  context = "YouTube ingest Phase01 E2E summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary must be an object`);
  }
  for (const field of Object.keys(summary)) {
    if (!YOUTUBE_INGEST_PHASE01_E2E_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field`, { field });
    }
  }
  if (summary.schema !== "iris_youtube_ingest_phase01_e2e_summary_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: summary.schema });
  }
  if (summary.source !== "youtube_live_chat" || summary.payload_kind !== "comment") {
    throw new ContractError(`${context}: invalid source or payload kind`);
  }
  if (!["respond", "observe", "ignore"].includes(summary.phase01_intent)) {
    throw new ContractError(`${context}: invalid Phase01 intent`, {
      phase01_intent: summary.phase01_intent,
    });
  }
  for (const field of [
    "phase01_event_ready",
    "trace_id_present",
    "event_id_present",
    "timestamp_present",
    "target_presence_present",
    "linked_identity_present",
    "normalized_text_present",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: boolean field required`, { field });
    }
  }
  assertPhase01BoundaryPolicySafe(summary.boundary_policy, context);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation is required`);
  }
  assertNoUnsafePhase01SummaryMaterial(summary, context);
}

function assertCommentInputSafe(value, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertCommentInputSafe(item, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_COMMENT_FIELDS.has(field)) {
      throw new ContractError("YouTube comment input must be read-only", { field, path });
    }
    if (isStructuredSupportMarker(field, child)) {
      throw new ContractError(
        "YouTube comment input must not contain structured support event fields",
        { field, path }
      );
    }
    assertCommentInputSafe(child, `${path}.${field}`);
  }
}

function isStructuredSupportMarker(field, value) {
  if (SUPPORT_DETAIL_FIELDS.has(field)) return value !== undefined && value !== null;
  if (SUPPORT_AMOUNT_FIELDS.has(field)) return value !== undefined && value !== null && value !== "";
  if (field === "payload_kind" || field === "payloadKind") {
    return normalizeMarker(value) === "donation_event";
  }
  if (field === "kind" || field === "event_kind" || field === "eventKind") {
    return ["donation", "support_event", "youtube_donation"].includes(normalizeMarker(value));
  }
  if (field === "source") {
    return normalizeMarker(value) === "youtube_donation";
  }
  if (SUPPORT_TYPE_FIELDS.has(field)) return isSupportEventType(value);
  return false;
}

function isSupportEventType(value) {
  const text = cleanText(value, 80);
  if (!text || text === "textMessageEvent") return false;
  if (SUPPORT_EVENT_TYPES.has(text)) return true;
  const key = text
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return SUPPORT_EVENT_TYPE_ALIASES.has(key);
}

function summarizeEventSource(source) {
  const text = cleanText(source, 80);
  if (text === "youtube_live_chat" || text === "youtube_donation") return text;
  return "unknown";
}

function summarizePayloadKind(event) {
  if (event?.source === "youtube_donation" || event?.payload?.support_event_type) {
    return "support_event";
  }
  if (event?.source === "youtube_live_chat") return "comment";
  return "unknown";
}

function summarizePhase01Intent(intent) {
  return ["respond", "observe", "ignore"].includes(intent) ? intent : "ignore";
}

function assertSummaryBoundaryPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of [
    "counts_types_and_booleans_only",
    "no_raw_comment_text",
    "no_api_response_body",
    "no_private_author_ids",
    "no_endpoint_values",
    "no_secret_values",
    "no_candidates",
    "no_commands",
  ]) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy missing`, { field });
    }
  }
}

function assertPhase01BoundaryPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of [
    "status_counts_and_labels_only",
    "no_raw_comment_text",
    "no_api_response_body",
    "no_private_author_ids",
    "no_endpoint_values",
    "no_secret_values",
    "no_candidates",
    "no_commands",
  ]) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary policy missing`, { field });
    }
  }
}

function assertNoUnsafeSummaryMaterial(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /\b(world_command|input_action_candidate|approved_game_input_action|execute|commit|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url|response_body|api_response_body)\b|https?:\/\//iu.test(
        value
      )
    ) {
      throw new ContractError(`${context}: unsafe summary material`, { path });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUnsafeSummaryMaterial(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoUnsafeSummaryMaterial(child, context, `${path}.${field}`);
  }
}

function assertNoUnsafePhase01SummaryMaterial(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /\b(world_command|input_action_candidate|approved_game_input_action|execute|commit|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url|raw[_-]?comment|comment[_-]?text|comment[_-]?body|api[_-]?response|response[_-]?body|private[_-]?channel|author[_-]?channel[_-]?id|candidate|command)\b|https?:\/\//iu.test(
        value
      )
    ) {
      throw new ContractError(`${context}: unsafe summary material`, { path });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUnsafePhase01SummaryMaterial(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (/^(raw|payload|candidate|command|api_response|response_body)$/iu.test(field)) {
      throw new ContractError(`${context}: unsafe summary field`, { path: `${path}.${field}` });
    }
    assertNoUnsafePhase01SummaryMaterial(child, context, `${path}.${field}`);
  }
}

function normalizeMarker(value) {
  return cleanText(value, 80)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function normalizeTimestampMs(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function cleanText(value, maxLength = 500) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
