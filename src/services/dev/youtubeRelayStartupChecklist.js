import { ContractError } from "../../core/contracts.js";

const URL_PATTERN = /\bhttps?:\/\//i;
const FORBIDDEN_FIELDS = new Set([
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
  "approved_memory_record",
  "approved_relationship_record",
  "canonical",
  "canonical_envelope",
  "final_text",
  "text",
  "subtitle_text",
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
  "value",
  "payload",
]);

const YOUTUBE_RELAY_STARTUP_CHECKLIST_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "target_stage_id",
  "target_stage_priority",
  "checklist_status",
  "startup_step_count",
  "long_running_service_count",
  "one_shot_rehearsal_count",
  "read_only_check_count",
  "next_startup_step_id",
  "next_startup_script",
  "next_readiness_script",
  "next_readiness_state",
  "startup_readiness_state_counts",
  "next_configure_env",
  "steps",
  "verification_scripts",
  "production_handoff_summary",
  "boundary_policy",
  "adapter_validation_required",
]);

const STEP_IDS = new Set([
  "start_local_youtube_relay_bridge",
  "review_youtube_local_env",
  "run_relay_readiness_rehearsal",
  "review_youtube_source_status",
  "review_youtube_runtime_status",
  "review_youtube_live_readiness",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);

export function createYouTubeRelayStartupChecklist({ generatedAtMs = Date.now() } = {}) {
  const steps = [
    step(1, "start_local_youtube_relay_bridge", "long_running_service", "npm run dev:youtube:relay-bridge", "npm run dev:youtube:relay-readiness-rehearsal", [
      "IRIS_YOUTUBE_RELAY_BRIDGE_HOST",
      "IRIS_YOUTUBE_RELAY_BRIDGE_PORT",
    ]),
    step(2, "review_youtube_local_env", "read_only_check", "npm run dev:youtube:local-env-profile", "npm run dev:youtube:env-setup-plan", [
      "IRIS_YOUTUBE_LIVE_CHAT_SOURCE",
      "IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT",
      "IRIS_ENABLE_HTTP_INGEST_SCHEDULER",
    ]),
    step(3, "run_relay_readiness_rehearsal", "one_shot_rehearsal", "npm run dev:youtube:relay-readiness-rehearsal", "npm run dev:youtube:relay-status-roundtrip", []),
    step(4, "review_youtube_source_status", "read_only_check", "npm run dev:youtube:source-status", "npm run dev:youtube:relay-status-roundtrip", []),
    step(5, "review_youtube_runtime_status", "read_only_check", "npm run dev:youtube:runtime-status", "npm run dev:youtube:runtime-ingest-roundtrip", []),
    step(6, "review_youtube_live_readiness", "read_only_check", "npm run dev:youtube:live-readiness", "npm run dev:youtube:readiness-rehearsal", []),
  ];
  const checklist = {
    schema: "iris_youtube_relay_startup_checklist_v1",
    generated_at_ms: generatedAtMs,
    target_stage_id: "youtube_comments_and_support",
    target_stage_priority: 2,
    checklist_status: "ready_to_follow_local_relay_startup_checklist",
    startup_step_count: steps.length,
    long_running_service_count: 1,
    one_shot_rehearsal_count: 1,
    read_only_check_count: 4,
    next_startup_step_id: steps[0].step_id,
    next_startup_script: steps[0].startup_script,
    next_readiness_script: steps[0].readiness_script,
    next_readiness_state: steps[0].readiness_state,
    startup_readiness_state_counts: summarizeStartupReadinessStateCounts(steps),
    next_configure_env: steps[0].configure_env,
    steps,
    verification_scripts: {
      schema: "iris_youtube_relay_startup_verification_scripts_v1",
      relay_bridge_script: "npm run dev:youtube:relay-bridge",
      relay_readiness_rehearsal_script:
        "npm run dev:youtube:relay-readiness-rehearsal",
      relay_roundtrip_script: "npm run dev:youtube:relay-roundtrip",
      relay_status_roundtrip_script: "npm run dev:youtube:relay-status-roundtrip",
      runtime_ingest_roundtrip_script: "npm run dev:youtube:runtime-ingest-roundtrip",
      live_readiness_script: "npm run dev:youtube:live-readiness",
    },
    production_handoff_summary: {
      schema: "iris_youtube_relay_startup_production_handoff_summary_v1",
      local_relay_rehearsal_only: true,
      direct_youtube_api_not_started: true,
      oauth_flow_not_started: true,
      real_api_key_not_required_for_relay_rehearsal: true,
      real_chat_or_support_payloads_not_required: true,
      next_production_decision_ids: [
        "choose_direct_api_or_local_relay",
        "configure_live_chat_target",
        "choose_api_key_or_oauth",
        "enable_scheduler_after_source_review",
      ],
      next_production_decision_count: 4,
      next_plan_script: "npm run dev:youtube:env-setup-plan",
      next_readiness_state: steps[0].readiness_state,
      startup_readiness_state_counts: summarizeStartupReadinessStateCounts(steps),
    },
    boundary_policy: {
      local_relay_only: true,
      env_names_only: true,
      script_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      no_support_message_text: true,
      no_candidates: true,
      no_commands: true,
      read_only_checklist: true,
    },
    adapter_validation_required: true,
  };
  assertYouTubeRelayStartupChecklistSafe(checklist);
  return checklist;
}

export function assertYouTubeRelayStartupChecklistSafe(
  checklist,
  context = "YouTube relay startup checklist"
) {
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist)) {
    throw new ContractError(`${context}: checklist is required`);
  }
  assertNoForbiddenFields(checklist, context);
  if (URL_PATTERN.test(JSON.stringify(checklist))) {
    throw new ContractError(`${context}: endpoint values must not be exposed`);
  }
  if (checklist.schema !== "iris_youtube_relay_startup_checklist_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(checklist)) {
    if (!YOUTUBE_RELAY_STARTUP_CHECKLIST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected checklist field`, { field });
    }
  }
  if (!Array.isArray(checklist.steps) || checklist.steps.length !== checklist.startup_step_count) {
    throw new ContractError(`${context}: invalid steps`);
  }
  for (const [index, item] of checklist.steps.entries()) {
    if (item.sequence_order !== index + 1) {
      throw new ContractError(`${context}: invalid step order`);
    }
    if (!STEP_IDS.has(item.step_id)) throw new ContractError(`${context}: invalid step id`);
    if (
      !["long_running_service", "one_shot_rehearsal", "read_only_check"].includes(
        item.startup_kind
      )
    ) {
      throw new ContractError(`${context}: invalid startup kind`);
    }
    assertSafeScript(item.startup_script, context);
    assertSafeScript(item.readiness_script, context);
    assertSafeReadinessState(item.readiness_state, context);
    if (item.readiness_state !== summarizeStepReadinessState(item.startup_kind)) {
      throw new ContractError(`${context}: invalid step readiness state`);
    }
    assertEnvNameListSafe(item.configure_env, `${context}: step env`);
    if (item.configure_env_count !== item.configure_env.length) {
      throw new ContractError(`${context}: invalid step env count`);
    }
  }
  for (const [field, kind] of [
    ["long_running_service_count", "long_running_service"],
    ["one_shot_rehearsal_count", "one_shot_rehearsal"],
    ["read_only_check_count", "read_only_check"],
  ]) {
    if (checklist[field] !== checklist.steps.filter((step) => step.startup_kind === kind).length) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  const nextStep = checklist.steps[0];
  if (
    checklist.next_startup_step_id !== nextStep.step_id ||
    checklist.next_startup_script !== nextStep.startup_script ||
    checklist.next_readiness_script !== nextStep.readiness_script ||
    checklist.next_readiness_state !== nextStep.readiness_state
  ) {
    throw new ContractError(`${context}: invalid next startup step summary`);
  }
  assertSafeReadinessState(checklist.next_readiness_state, context);
  assertEnvNameListSafe(checklist.next_configure_env, `${context}: next env`);
  if (JSON.stringify(checklist.next_configure_env) !== JSON.stringify(nextStep.configure_env)) {
    throw new ContractError(`${context}: invalid next configure env`);
  }
  assertStartupReadinessStateCountsSafe(
    checklist.startup_readiness_state_counts,
    checklist.steps,
    context
  );
  assertProductionHandoffSummarySafe(
    checklist.production_handoff_summary,
    checklist,
    context
  );
  assertBoundaryPolicySafe(checklist.boundary_policy, `${context}: boundary policy`);
}

function assertBoundaryPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const requiredFields = [
    "local_relay_only",
    "env_names_only",
    "script_names_only",
    "no_secret_values",
    "no_endpoint_values",
    "no_live_payloads",
    "no_support_message_text",
    "no_candidates",
    "no_commands",
    "read_only_checklist",
  ];
  const allowedFields = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected boundary policy field ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertProductionHandoffSummarySafe(summary, checklist, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: production handoff summary is required`);
  }
  if (
    summary.schema !==
    "iris_youtube_relay_startup_production_handoff_summary_v1"
  ) {
    throw new ContractError(`${context}: invalid production handoff schema`);
  }
  for (const field of [
    "local_relay_rehearsal_only",
    "direct_youtube_api_not_started",
    "oauth_flow_not_started",
    "real_api_key_not_required_for_relay_rehearsal",
    "real_chat_or_support_payloads_not_required",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: invalid production handoff flag`);
    }
  }
  if (
    !Array.isArray(summary.next_production_decision_ids) ||
    summary.next_production_decision_ids.length !==
      summary.next_production_decision_count
  ) {
    throw new ContractError(`${context}: invalid production decision count`);
  }
  if (
    new Set(summary.next_production_decision_ids).size !==
    summary.next_production_decision_ids.length
  ) {
    throw new ContractError(`${context}: duplicate production decision ids`);
  }
  for (const decisionId of summary.next_production_decision_ids) {
    if (typeof decisionId !== "string" || !/^[a-z0-9_:-]+$/i.test(decisionId)) {
      throw new ContractError(`${context}: invalid production decision id`);
    }
  }
  assertSafeScript(summary.next_plan_script, context);
  assertSafeReadinessState(summary.next_readiness_state, context);
  assertStartupReadinessStateCountsObjectSafe(
    summary.startup_readiness_state_counts,
    `${context}: production handoff startup readiness counts`
  );
  if (
    summary.next_readiness_state !== checklist.next_readiness_state ||
    !sameStartupReadinessStateCounts(
      summary.startup_readiness_state_counts,
      checklist.startup_readiness_state_counts
    )
  ) {
    throw new ContractError(`${context}: production handoff readiness mismatch`);
  }
}

function step(sequenceOrder, stepId, startup_kind, startupScript, readinessScript, configureEnv) {
  const readinessState = summarizeStepReadinessState(startup_kind);
  return {
    schema: "iris_youtube_relay_startup_step_v1",
    sequence_order: sequenceOrder,
    step_id: stepId,
    startup_kind,
    readiness_state: readinessState,
    startup_script: startupScript,
    readiness_script: readinessScript,
    configure_env: configureEnv,
    configure_env_count: configureEnv.length,
    boundary_policy: {
      env_names_only: true,
      script_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
      no_candidates: true,
      no_commands: true,
    },
  };
}

function summarizeStepReadinessState(startupKind) {
  if (startupKind === "long_running_service" || startupKind === "one_shot_rehearsal") {
    return "real_device_waiting";
  }
  if (startupKind === "read_only_check") {
    return "operator_review_required";
  }
  return "runtime_waiting";
}

function summarizeStartupReadinessStateCounts(steps) {
  const counts = {
    ready: 0,
    configuration_waiting: 0,
    runtime_waiting: 0,
    real_device_waiting: 0,
    operator_review_required: 0,
  };
  for (const item of steps) {
    const state = READINESS_STATES.has(item.readiness_state)
      ? item.readiness_state
      : "operator_review_required";
    counts[state] += 1;
  }
  return counts;
}

function assertSafeReadinessState(state, context) {
  if (!READINESS_STATES.has(state)) {
    throw new ContractError(`${context}: invalid readiness state`);
  }
}

function assertStartupReadinessStateCountsSafe(counts, steps, context) {
  assertStartupReadinessStateCountsObjectSafe(
    counts,
    `${context}: startup readiness counts`
  );
  const expected = summarizeStartupReadinessStateCounts(steps);
  for (const state of READINESS_STATES) {
    if (counts[state] !== expected[state]) {
      throw new ContractError(`${context}: mismatched startup ${state} count`);
    }
  }
}

function assertStartupReadinessStateCountsObjectSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: startup readiness counts are required`);
  }
  for (const state of READINESS_STATES) {
    if (!Number.isInteger(counts[state]) || counts[state] < 0) {
      throw new ContractError(`${context}: invalid ${state}`);
    }
  }
  for (const key of Object.keys(counts)) {
    if (!READINESS_STATES.has(key)) {
      throw new ContractError(`${context}: invalid startup readiness key`);
    }
  }
}

function sameStartupReadinessStateCounts(left, right) {
  if (!left || !right) return false;
  for (const state of READINESS_STATES) {
    if (left[state] !== right[state]) return false;
  }
  return true;
}

function assertSafeScript(value, context) {
  if (
    typeof value !== "string" ||
    !/^npm run dev(?::[a-z0-9_-]+)+(?: -- --[a-z0-9:_-]+(?: --[a-z0-9:_-]+)*)?$/i.test(
      value
    )
  ) {
    throw new ContractError(`${context}: invalid script`);
  }
}

function assertEnvNameListSafe(values, context) {
  if (!Array.isArray(values)) {
    throw new ContractError(`${context}: env list is required`);
  }
  if (
    values.some((value) => typeof value !== "string" || !/^IRIS_[A-Z0-9_]+$/.test(value))
  ) {
    throw new ContractError(`${context}: invalid env name`);
  }
  if (new Set(values).size !== values.length) {
    throw new ContractError(`${context}: duplicate env names`);
  }
}

function assertNoForbiddenFields(value, context, path = []) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenFields(item, context, path.concat(String(index))));
    return;
  }
  for (const [field, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe field`, { field, path: path.concat(field).join(".") });
    }
    assertNoForbiddenFields(nestedValue, context, path.concat(field));
  }
}
