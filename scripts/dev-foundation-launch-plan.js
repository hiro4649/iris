import {
  assertFoundationLaunchPlanSafe,
  createFoundationLaunchPlan,
} from "../src/services/dev/foundationLaunchPlan.js";
import {
  assertOperatorLaunchPlanSafe,
  createProductionReadinessRunbook,
} from "../src/services/dev/productionReadinessRunbook.js";

const runbook = createProductionReadinessRunbook();
const foundationLaunchPlan = createFoundationLaunchPlan();
assertOperatorLaunchPlanSafe(runbook.operator_launch_plan, "foundation launch plan CLI");
assertFoundationLaunchPlanSafe(foundationLaunchPlan, "foundation launch plan CLI");

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_foundation_launch_plan_cli_v1",
      readiness_status: runbook.readiness_status,
      next_stage: runbook.next_stage,
      foundation_launch_plan: foundationLaunchPlan,
      operator_launch_plan: runbook.operator_launch_plan,
      verification_plan: {
        plan_status: runbook.verification_plan.plan_status,
        next_stage_id: runbook.verification_plan.next_stage_id,
        next_stage_priority: runbook.verification_plan.next_stage_priority,
        next_stage_verification_scripts:
          runbook.verification_plan.next_stage_verification_scripts,
        total_verification_script_count:
          runbook.verification_plan.total_verification_script_count,
        boundary_policy: {
          script_names_only: true,
          env_names_only: true,
          no_secret_values: true,
          no_endpoint_values: true,
          read_only_plan: true,
        },
      },
      boundary_policy: {
        safe_local_commands_only: true,
        env_names_only: true,
        no_secret_values: true,
        no_endpoint_values: true,
        no_payloads: true,
        no_candidates: true,
        no_commands: true,
        read_only_cli: true,
      },
    },
    null,
    2
  )
);
