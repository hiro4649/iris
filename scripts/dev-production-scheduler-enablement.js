#!/usr/bin/env node
import "../src/config/loadIrisEnv.js";
import {
  assertProductionSchedulerEnablementPlanSafe,
  createProductionSchedulerEnablementPlan,
} from "../src/services/dev/productionSchedulerEnablementPlan.js";

const report = createProductionSchedulerEnablementPlan();
assertProductionSchedulerEnablementPlanSafe(
  report,
  "production scheduler enablement CLI"
);

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_production_scheduler_enablement_cli_v1",
      production_scheduler_enablement: report,
      boundary_policy: {
        env_names_only: true,
        script_names_only: true,
        booleans_counts_and_fixed_statuses_only: true,
        no_secret_values: true,
        no_endpoint_values: true,
        no_live_payloads: true,
        no_text_payloads: true,
        no_support_message_text: true,
        no_platform_ids: true,
        no_platform_cursor_values: true,
        no_memory_records: true,
        no_relationship_records: true,
        no_candidates: true,
        no_commands: true,
        no_raw_frames: true,
        no_raw_scheduler_results: true,
        no_raw_stream_state: true,
        no_polling_side_effects: true,
        no_control_side_effects: true,
        read_only_cli: true,
      },
    },
    null,
    2
  )
);
