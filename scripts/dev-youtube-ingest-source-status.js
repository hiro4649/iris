import { pathToFileURL } from "node:url";
import {
  assertYouTubeIngestSourceStatusReportSafe,
  createYouTubeIngestSourceStatusReport,
} from "../src/services/dev/youtubeIngestSourceStatus.js";

const YOUTUBE_INGEST_SOURCE_STATUS_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "youtube_ingest_source_status",
  "production_handoff_summary",
  "boundary_policy",
]);

if (isDirectExecution()) {
  const sourceStatus = createYouTubeIngestSourceStatusReport();
  assertYouTubeIngestSourceStatusReportSafe(
    sourceStatus,
    "youtube ingest source status CLI"
  );
  console.log(JSON.stringify(createYouTubeIngestSourceStatusCliReport(sourceStatus), null, 2));
}

export function createYouTubeIngestSourceStatusCliReport(sourceStatus) {
  const report = {
    ok: true,
    schema: "iris_youtube_ingest_source_status_cli_v1",
    youtube_ingest_source_status: sourceStatus,
    production_handoff_summary: {
      schema: "iris_youtube_ingest_source_status_handoff_summary_v1",
      source_status_report_only: true,
      direct_youtube_api_not_called_by_status: true,
      oauth_flow_not_started_by_status: true,
      scheduler_not_started_by_status: true,
      support_messages_not_exposed: true,
      platform_ids_not_exposed: true,
      platform_cursor_values_not_exposed: true,
      memory_candidates_not_committed_directly: true,
      relationship_candidates_not_committed_directly: true,
      candidates_not_exposed: true,
      endpoint_values_not_exposed: true,
      secret_values_not_exposed: true,
      source_kind: sourceStatus.source_kind,
      source_instantiation_status: sourceStatus.instantiation_status,
      source_ingest_readiness_status:
        sourceStatus.status_summary?.ingest_readiness_status ?? "unknown",
      external_real_evidence_status: sourceStatus.external_real_evidence_status,
      production_ready_allowed: sourceStatus.production_ready_allowed,
      go_no_go: sourceStatus.go_no_go,
      source_status_not_production_ready_evidence: true,
      fixture_or_local_relay_not_real_ready: true,
      next_readiness_state: sourceStatus.next_readiness_state,
      readiness_state_counts: sourceStatus.readiness_state_counts,
      auth_mode: sourceStatus.status_summary?.auth_mode ?? "unknown",
      request_count: safeInteger(sourceStatus.status_summary?.request_count),
      live_chat_request_count: safeInteger(
        sourceStatus.status_summary?.live_chat_request_count
      ),
      support_event_count: safeInteger(
        sourceStatus.status_summary?.support_event_count
      ),
      last_error_seen: sourceStatus.status_summary?.last_error !== null,
      last_error_operator_action_required:
        sourceStatus.status_summary?.last_error_operator_action_required === true,
      last_error_kind: sourceStatus.error_kind,
      next_check_script: "npm run dev:youtube:source-status",
      next_ingest_once_script: "npm run dev:youtube:ingest-once",
      live_readiness_script: "npm run dev:youtube:live-readiness",
    },
    boundary_policy: {
      no_secret_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      no_support_message_text: true,
      no_platform_cursor_values: true,
      no_candidates: true,
      no_commands: true,
      read_only_cli: true,
      no_polling_side_effects: true,
      production_handoff_summary_counts_only: true,
      source_status_not_production_ready_evidence: true,
      fixture_or_local_relay_not_real_ready: true,
    },
  };
  assertYouTubeIngestSourceStatusCliReportSafe(report);
  return report;
}

export function assertYouTubeIngestSourceStatusCliReportSafe(
  report,
  context = "YouTube ingest source status CLI report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error(`${context}: report missing`);
  }
  if (report.ok !== true || report.schema !== "iris_youtube_ingest_source_status_cli_v1") {
    throw new Error(`${context}: invalid report schema`);
  }
  for (const field of Object.keys(report)) {
    if (!YOUTUBE_INGEST_SOURCE_STATUS_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`${context}: unexpected report field ${field}`);
    }
  }
  assertNoUrlStrings(report, context);
  assertYouTubeIngestSourceStatusReportSafe(
    report.youtube_ingest_source_status,
    `${context}: source status`
  );
  const summary = report.production_handoff_summary;
  if (
    !summary ||
    summary.schema !== "iris_youtube_ingest_source_status_handoff_summary_v1"
  ) {
    throw new Error(`${context}: production handoff summary missing`);
  }
  if (
    Object.prototype.hasOwnProperty.call(summary, "source_status") ||
    Object.prototype.hasOwnProperty.call(summary, "endpoint") ||
    Object.prototype.hasOwnProperty.call(summary, "url") ||
    Object.prototype.hasOwnProperty.call(summary, "payload") ||
    Object.prototype.hasOwnProperty.call(summary, "text") ||
    Object.prototype.hasOwnProperty.call(summary, "event_id") ||
    Object.prototype.hasOwnProperty.call(summary, "trace_id")
  ) {
    throw new Error(`${context}: unsafe production handoff field`);
  }
  for (const field of [
    "source_status_report_only",
    "direct_youtube_api_not_called_by_status",
    "oauth_flow_not_started_by_status",
    "scheduler_not_started_by_status",
    "support_messages_not_exposed",
    "platform_ids_not_exposed",
    "platform_cursor_values_not_exposed",
    "memory_candidates_not_committed_directly",
    "relationship_candidates_not_committed_directly",
    "candidates_not_exposed",
    "endpoint_values_not_exposed",
    "secret_values_not_exposed",
    "source_status_not_production_ready_evidence",
    "fixture_or_local_relay_not_real_ready",
  ]) {
    if (summary[field] !== true) throw new Error(`${context}: flag failed ${field}`);
  }
  for (const field of [
    "request_count",
    "live_chat_request_count",
    "support_event_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new Error(`${context}: invalid count ${field}`);
    }
  }
  for (const field of [
    "last_error_seen",
    "last_error_operator_action_required",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new Error(`${context}: invalid flag ${field}`);
    }
  }
  if (
    summary.source_kind !== report.youtube_ingest_source_status.source_kind ||
    summary.source_instantiation_status !==
      report.youtube_ingest_source_status.instantiation_status ||
    summary.source_ingest_readiness_status !==
      report.youtube_ingest_source_status.status_summary?.ingest_readiness_status ||
    summary.external_real_evidence_status !==
      report.youtube_ingest_source_status.external_real_evidence_status ||
    summary.production_ready_allowed !== false ||
    summary.go_no_go !== "no_go" ||
    summary.next_readiness_state !==
      report.youtube_ingest_source_status.next_readiness_state ||
    !sameReadinessStateCounts(
      summary.readiness_state_counts,
      report.youtube_ingest_source_status.readiness_state_counts
    ) ||
    summary.auth_mode !== report.youtube_ingest_source_status.status_summary?.auth_mode ||
    summary.request_count !==
      safeInteger(report.youtube_ingest_source_status.status_summary?.request_count) ||
    summary.live_chat_request_count !==
      safeInteger(
        report.youtube_ingest_source_status.status_summary?.live_chat_request_count
      ) ||
    summary.support_event_count !==
      safeInteger(
        report.youtube_ingest_source_status.status_summary?.support_event_count
      ) ||
    summary.last_error_seen !==
      (report.youtube_ingest_source_status.status_summary?.last_error !== null) ||
    summary.last_error_operator_action_required !==
      (report.youtube_ingest_source_status.status_summary
        ?.last_error_operator_action_required === true) ||
    summary.last_error_kind !== report.youtube_ingest_source_status.error_kind
  ) {
    throw new Error(`${context}: summary mismatch`);
  }
  for (const field of [
    "next_check_script",
    "next_ingest_once_script",
    "live_readiness_script",
  ]) {
    assertSafeScriptName(summary[field], `${context}: ${field}`);
  }
  for (const field of [
    "no_secret_values",
    "no_endpoint_values",
    "no_live_payloads",
    "no_support_message_text",
    "no_platform_cursor_values",
    "no_candidates",
    "no_commands",
    "read_only_cli",
    "no_polling_side_effects",
    "production_handoff_summary_counts_only",
    "source_status_not_production_ready_evidence",
    "fixture_or_local_relay_not_real_ready",
  ]) {
    if (report.boundary_policy[field] !== true) {
      throw new Error(`${context}: ${field} boundary required`);
    }
  }
}

function assertSafeScriptName(value, context) {
  if (
    typeof value !== "string" ||
    !value.startsWith("npm run dev:") ||
    !/^[a-z0-9: -]+$/i.test(value) ||
    /[;&|<>]/.test(value)
  ) {
    throw new Error(`${context}: invalid script name`);
  }
}

function assertNoUrlStrings(value, context, path = "root") {
  if (typeof value === "string") {
    if (/https?:\/\//i.test(value)) {
      throw new Error(`${context}: endpoint value exposed at ${path}`);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUrlStrings(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoUrlStrings(child, context, `${path}.${field}`);
  }
}

function sameReadinessStateCounts(left, right) {
  if (!left || !right) return false;
  for (const state of [
    "ready",
    "configuration_waiting",
    "runtime_waiting",
    "real_device_waiting",
    "operator_review_required",
  ]) {
    if (left[state] !== right[state]) return false;
  }
  return true;
}

function safeInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.trunc(number);
}

function isDirectExecution() {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(process.argv[1]).href;
}
