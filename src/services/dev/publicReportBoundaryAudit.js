import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SCRIPT_DIR = join(process.cwd(), "scripts");
const DEV_SERVICE_DIR = join(process.cwd(), "src", "services", "dev");
const SERVER_DIR = join(process.cwd(), "src", "server");
const SRC_DIR = join(process.cwd(), "src");
const DEV_SCRIPT_PATTERN = /^dev-.*\.js$/;
const RUN_SCRIPT_PATTERN = /^run-.*\.js$/;
const ASSERT_PATTERN = /\b(?:export\s+)?function\s+assert[A-Za-z0-9_]*\s*\(/;
const ALLOWLIST_PATTERN =
  /(?:_FIELDS|REPORT_FIELDS|PAYLOAD_FIELDS|SUMMARY_FIELDS|CHECKLIST_FIELDS|REHEARSAL_FIELDS)/;
const OUTPUT_ALLOWLIST_DECLARATION_PATTERNS = [
  /const\s+([A-Z0-9_]*(?:_FIELDS|REPORT_FIELDS|PAYLOAD_FIELDS|SUMMARY_FIELDS|CHECKLIST_FIELDS|REHEARSAL_FIELDS))\s*=\s*new Set\(\s*\[([\s\S]*?)\]\s*\);/g,
  /const\s+([A-Z0-9_]*(?:_FIELDS|REPORT_FIELDS|PAYLOAD_FIELDS|SUMMARY_FIELDS|CHECKLIST_FIELDS|REHEARSAL_FIELDS))\s*=\s*\[([\s\S]*?)\];/g
];
const OUTPUT_SOURCE_PATTERN =
  /(?:public|admin|readiness|diagnostic|diagnostics|production|probe|report|summary)/i;
const OUTPUT_FIELD_LITERAL_PATTERN = /["']([A-Za-z0-9_]+)["']/g;
const FORBIDDEN_PUBLIC_OUTPUT_FIELD_NAMES = new Set([
  "api_key",
  "api_key_value",
  "endpoint",
  "endpoint_value",
  "endpoint_values",
  "exact_delta",
  "hidden_rank",
  "hidden_score",
  "input_action_candidate",
  "internal_relationship_stage",
  "memory_carryover_candidates",
  "private_viewer_id",
  "raw_candidate",
  "raw_candidates",
  "raw_command",
  "raw_comment",
  "raw_frame",
  "raw_frames",
  "raw_log",
  "raw_logs",
  "raw_memory",
  "raw_payload",
  "raw_sql",
  "raw_support_text",
  "raw_vector",
  "raw_voice",
  "raw_voice_sample",
  "raw_voice_samples",
  "recall_candidate",
  "relation_score",
  "relationship_update_candidate",
  "secret",
  "secret_value",
  "secret_values",
  "selected_memory_ids",
  "token",
  "token_value"
]);
const SERVER_ALLOWLIST_PATTERN =
  /(?:_FIELDS|REPORT_FIELDS|PAYLOAD_FIELDS|SUMMARY_FIELDS|STATUS_FIELDS|HEALTH_FIELDS)/;
const RUN_SCRIPT_BOUNDARY_PATTERN =
  /(?:boundary_policy|REPORT_FIELDS|PREFLIGHT_REPORT_FIELDS|SCENARIO_|SMOKE_)/;
const SRC_SCRIPT_LAYER_IMPORT_PATTERN =
  /from\s+["'][.]{2,}\/(?:[.]{2}\/)*scripts\/(?:dev|run)-[^"']+\.js["']/;
const REQUIRED_LIGHTWEIGHT_SCRIPT_NAMES = [
  "dev-admin-operations-summary.js",
  "dev-admin-character-voice-settings-summary.js",
  "dev-engine-probe.js",
  "dev-production-attention-digest.js",
  "dev-foundation-runtime-summary.js",
  "dev-foundation-blocked-worker-roundtrip.js"
];

const PUBLIC_REPORT_BOUNDARY_AUDIT_FIELDS = new Set([
  "ok",
  "schema",
  "scanned_script_count",
  "assert_script_count",
  "missing_allowlist_count",
  "missing_allowlist_scripts",
  "scanned_run_script_count",
  "missing_run_boundary_count",
  "missing_run_boundary_scripts",
  "scanned_dev_service_count",
  "dev_service_assert_count",
  "missing_dev_service_allowlist_count",
  "missing_dev_service_allowlist_files",
  "scanned_server_file_count",
  "server_assert_count",
  "missing_server_allowlist_count",
  "missing_server_allowlist_files",
  "scanned_src_import_file_count",
  "script_layer_import_violation_count",
  "script_layer_import_violation_files",
  "required_lightweight_script_count",
  "required_lightweight_scripts",
  "missing_required_lightweight_script_count",
  "missing_required_lightweight_scripts",
  "unsafe_public_output_field_count",
  "unsafe_public_output_fields",
  "boundary_policy"
]);

function toPublicScriptName(name) {
  return `scripts/${name}`;
}

function toPublicDevServiceName(name) {
  return `src/services/dev/${name}`;
}

function toPublicServerName(name) {
  return `src/server/${name}`;
}

function toPublicSrcName(name) {
  return `src/${name}`;
}

function listJsFilesRecursively(dir, prefix = "") {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const relativeName = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absoluteName = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listJsFilesRecursively(absoluteName, relativeName));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(relativeName);
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function findDevScriptsMissingAllowlists() {
  const scriptNames = readdirSync(SCRIPT_DIR)
    .filter((name) => DEV_SCRIPT_PATTERN.test(name))
    .sort((left, right) => left.localeCompare(right));

  const assertScripts = [];
  const missingAllowlistScripts = [];

  for (const name of scriptNames) {
    const source = readFileSync(join(SCRIPT_DIR, name), "utf8");
    if (!ASSERT_PATTERN.test(source)) {
      continue;
    }

    const publicName = toPublicScriptName(name);
    assertScripts.push(publicName);

    if (!ALLOWLIST_PATTERN.test(source)) {
      missingAllowlistScripts.push(publicName);
    }
  }

  return {
    scriptNames,
    assertScripts,
    missingAllowlistScripts
  };
}

function findRunScriptsMissingBoundaryMetadata() {
  const scriptNames = readdirSync(SCRIPT_DIR)
    .filter((name) => RUN_SCRIPT_PATTERN.test(name))
    .sort((left, right) => left.localeCompare(right));
  const missingRunBoundaryScripts = [];

  for (const name of scriptNames) {
    const source = readFileSync(join(SCRIPT_DIR, name), "utf8");
    if (!RUN_SCRIPT_BOUNDARY_PATTERN.test(source)) {
      missingRunBoundaryScripts.push(toPublicScriptName(name));
    }
  }

  return {
    scriptNames,
    missingRunBoundaryScripts
  };
}

function findDevServicesMissingAllowlists() {
  const serviceNames = readdirSync(DEV_SERVICE_DIR)
    .filter((name) => name.endsWith(".js"))
    .sort((left, right) => left.localeCompare(right));
  const assertServices = [];
  const missingDevServiceAllowlistFiles = [];

  for (const name of serviceNames) {
    const source = readFileSync(join(DEV_SERVICE_DIR, name), "utf8");
    if (!ASSERT_PATTERN.test(source)) {
      continue;
    }

    const publicName = toPublicDevServiceName(name);
    assertServices.push(publicName);

    if (!ALLOWLIST_PATTERN.test(source)) {
      missingDevServiceAllowlistFiles.push(publicName);
    }
  }

  return {
    serviceNames,
    assertServices,
    missingDevServiceAllowlistFiles
  };
}

function findServerFilesMissingAllowlists() {
  const fileNames = readdirSync(SERVER_DIR)
    .filter((name) => name.endsWith(".js"))
    .sort((left, right) => left.localeCompare(right));
  const assertFiles = [];
  const missingServerAllowlistFiles = [];

  for (const name of fileNames) {
    const source = readFileSync(join(SERVER_DIR, name), "utf8");
    if (!ASSERT_PATTERN.test(source)) {
      continue;
    }

    const publicName = toPublicServerName(name);
    assertFiles.push(publicName);

    if (!SERVER_ALLOWLIST_PATTERN.test(source)) {
      missingServerAllowlistFiles.push(publicName);
    }
  }

  return {
    fileNames,
    assertFiles,
    missingServerAllowlistFiles
  };
}

function findSrcFilesImportingScriptLayer() {
  const fileNames = listJsFilesRecursively(SRC_DIR);
  const scriptLayerImportViolationFiles = [];

  for (const name of fileNames) {
    const source = readFileSync(join(SRC_DIR, name), "utf8");
    if (SRC_SCRIPT_LAYER_IMPORT_PATTERN.test(source)) {
      scriptLayerImportViolationFiles.push(toPublicSrcName(name));
    }
  }

  return {
    fileNames,
    scriptLayerImportViolationFiles
  };
}

function findMissingRequiredLightweightScripts() {
  const missingRequiredLightweightScripts = REQUIRED_LIGHTWEIGHT_SCRIPT_NAMES
    .filter((name) => !existsSync(join(SCRIPT_DIR, name)))
    .map(toPublicScriptName);

  return {
    requiredLightweightScriptNames:
      REQUIRED_LIGHTWEIGHT_SCRIPT_NAMES.map(toPublicScriptName),
    missingRequiredLightweightScripts
  };
}

function collectUnsafeAllowlistFields(source, publicName) {
  const unsafeFields = [];

  for (const pattern of OUTPUT_ALLOWLIST_DECLARATION_PATTERNS) {
    pattern.lastIndex = 0;
    let declarationMatch;
    while ((declarationMatch = pattern.exec(source)) !== null) {
      const [, declarationName, declarationBody] = declarationMatch;
      if (declarationName.startsWith("FORBIDDEN_")) {
        continue;
      }

      OUTPUT_FIELD_LITERAL_PATTERN.lastIndex = 0;
      let fieldMatch;
      while ((fieldMatch = OUTPUT_FIELD_LITERAL_PATTERN.exec(declarationBody)) !== null) {
        const fieldName = fieldMatch[1];
        if (FORBIDDEN_PUBLIC_OUTPUT_FIELD_NAMES.has(fieldName)) {
          unsafeFields.push(`${publicName}#${fieldName}`);
        }
      }
    }
  }

  return unsafeFields;
}

function findUnsafePublicOutputAllowlistFields() {
  const unsafePublicOutputFields = new Set();
  const serviceNames = readdirSync(DEV_SERVICE_DIR)
    .filter((name) => name.endsWith(".js") && OUTPUT_SOURCE_PATTERN.test(name))
    .sort((left, right) => left.localeCompare(right));
  const scriptNames = readdirSync(SCRIPT_DIR)
    .filter((name) => DEV_SCRIPT_PATTERN.test(name) && OUTPUT_SOURCE_PATTERN.test(name))
    .sort((left, right) => left.localeCompare(right));

  for (const name of serviceNames) {
    const publicName = toPublicDevServiceName(name);
    const source = readFileSync(join(DEV_SERVICE_DIR, name), "utf8");
    for (const unsafeField of collectUnsafeAllowlistFields(source, publicName)) {
      unsafePublicOutputFields.add(unsafeField);
    }
  }

  for (const name of scriptNames) {
    const publicName = toPublicScriptName(name);
    const source = readFileSync(join(SCRIPT_DIR, name), "utf8");
    for (const unsafeField of collectUnsafeAllowlistFields(source, publicName)) {
      unsafePublicOutputFields.add(unsafeField);
    }
  }

  return [...unsafePublicOutputFields].sort((left, right) =>
    left.localeCompare(right)
  );
}

function verifyPublicReportBoundaryAuditReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("Public report boundary audit report must be an object");
  }

  for (const field of Object.keys(report)) {
    if (!PUBLIC_REPORT_BOUNDARY_AUDIT_FIELDS.has(field)) {
      throw new Error(`Unexpected public report boundary audit field: ${field}`);
    }
  }

  if (report.schema !== "iris_public_report_boundary_audit_v1") {
    throw new Error("Public report boundary audit schema mismatch");
  }
  if (typeof report.ok !== "boolean") {
    throw new Error("Public report boundary audit ok must be a boolean");
  }

  for (const field of [
    "scanned_script_count",
    "assert_script_count",
    "missing_allowlist_count",
    "scanned_run_script_count",
    "missing_run_boundary_count",
    "scanned_dev_service_count",
    "dev_service_assert_count",
    "missing_dev_service_allowlist_count",
    "scanned_server_file_count",
    "server_assert_count",
    "missing_server_allowlist_count",
    "scanned_src_import_file_count",
    "script_layer_import_violation_count",
    "required_lightweight_script_count",
    "missing_required_lightweight_script_count",
    "unsafe_public_output_field_count"
  ]) {
    if (!Number.isInteger(report[field]) || report[field] < 0) {
      throw new Error(`Public report boundary audit count invalid: ${field}`);
    }
  }
  if (report.assert_script_count > report.scanned_script_count) {
    throw new Error(
      "Public report boundary audit assert script count exceeds scanned script count"
    );
  }
  if (report.dev_service_assert_count > report.scanned_dev_service_count) {
    throw new Error(
      "Public report boundary audit dev-service assert count exceeds scanned dev-service count"
    );
  }
  if (report.server_assert_count > report.scanned_server_file_count) {
    throw new Error(
      "Public report boundary audit server assert count exceeds scanned server file count"
    );
  }
  for (const [missingField, scannedField] of [
    ["missing_allowlist_count", "scanned_script_count"],
    ["missing_run_boundary_count", "scanned_run_script_count"],
    ["missing_dev_service_allowlist_count", "scanned_dev_service_count"],
    ["missing_server_allowlist_count", "scanned_server_file_count"],
    ["script_layer_import_violation_count", "scanned_src_import_file_count"],
    [
      "missing_required_lightweight_script_count",
      "required_lightweight_script_count"
    ]
  ]) {
    if (report[missingField] > report[scannedField]) {
      throw new Error(
        `Public report boundary audit ${missingField} exceeds ${scannedField}`
      );
    }
  }
  const missingCountTotal =
    report.missing_allowlist_count +
    report.missing_run_boundary_count +
    report.missing_dev_service_allowlist_count +
    report.missing_server_allowlist_count +
    report.script_layer_import_violation_count +
    report.missing_required_lightweight_script_count +
    report.unsafe_public_output_field_count;
  if (report.ok === true && missingCountTotal !== 0) {
    throw new Error("Public report boundary audit ok must have zero missing counts");
  }
  if (report.ok === false && missingCountTotal === 0) {
    throw new Error("Public report boundary audit not-ok must have missing counts");
  }

  const assertUniquePublicNames = (names, label) => {
    if (new Set(names).size !== names.length) {
      throw new Error(`Public report boundary audit ${label} names must be unique`);
    }
  };

  if (!Array.isArray(report.missing_allowlist_scripts)) {
    throw new Error("Public report boundary audit missing list must be an array");
  }

  if (report.missing_allowlist_scripts.length !== report.missing_allowlist_count) {
    throw new Error("Public report boundary audit missing count mismatch");
  }
  assertUniquePublicNames(report.missing_allowlist_scripts, "missing allowlist script");

  for (const scriptName of report.missing_allowlist_scripts) {
    if (
      typeof scriptName !== "string" ||
      !/^scripts\/dev-[A-Za-z0-9_.-]+\.js$/.test(scriptName)
    ) {
      throw new Error("Public report boundary audit script name is not public-safe");
    }
  }
  if (!Array.isArray(report.missing_run_boundary_scripts)) {
    throw new Error("Public report boundary audit run-script missing list must be an array");
  }
  if (
    report.missing_run_boundary_scripts.length !==
    report.missing_run_boundary_count
  ) {
    throw new Error("Public report boundary audit run-script missing count mismatch");
  }
  assertUniquePublicNames(report.missing_run_boundary_scripts, "run-script missing");
  for (const scriptName of report.missing_run_boundary_scripts) {
    if (
      typeof scriptName !== "string" ||
      !/^scripts\/run-[A-Za-z0-9_.-]+\.js$/.test(scriptName)
    ) {
      throw new Error("Public report boundary audit run-script name is not public-safe");
    }
  }
  if (!Array.isArray(report.missing_dev_service_allowlist_files)) {
    throw new Error("Public report boundary audit dev-service missing list must be an array");
  }
  if (
    report.missing_dev_service_allowlist_files.length !==
    report.missing_dev_service_allowlist_count
  ) {
    throw new Error("Public report boundary audit dev-service missing count mismatch");
  }
  assertUniquePublicNames(
    report.missing_dev_service_allowlist_files,
    "dev-service missing"
  );
  for (const fileName of report.missing_dev_service_allowlist_files) {
    if (
      typeof fileName !== "string" ||
      !/^src\/services\/dev\/[A-Za-z0-9_.-]+\.js$/.test(fileName)
    ) {
      throw new Error("Public report boundary audit dev-service name is not public-safe");
    }
  }
  if (!Array.isArray(report.missing_server_allowlist_files)) {
    throw new Error("Public report boundary audit server missing list must be an array");
  }
  if (
    report.missing_server_allowlist_files.length !==
    report.missing_server_allowlist_count
  ) {
    throw new Error("Public report boundary audit server missing count mismatch");
  }
  assertUniquePublicNames(report.missing_server_allowlist_files, "server missing");
  for (const fileName of report.missing_server_allowlist_files) {
    if (
      typeof fileName !== "string" ||
      !/^src\/server\/[A-Za-z0-9_.-]+\.js$/.test(fileName)
    ) {
      throw new Error("Public report boundary audit server name is not public-safe");
    }
  }
  if (!Array.isArray(report.missing_required_lightweight_scripts)) {
    throw new Error(
      "Public report boundary audit lightweight missing list must be an array"
    );
  }
  if (!Array.isArray(report.required_lightweight_scripts)) {
    throw new Error(
      "Public report boundary audit lightweight required list must be an array"
    );
  }
  if (
    report.required_lightweight_scripts.length !==
    report.required_lightweight_script_count
  ) {
    throw new Error("Public report boundary audit lightweight required count mismatch");
  }
  assertUniquePublicNames(
    report.required_lightweight_scripts,
    "lightweight required"
  );
  for (const scriptName of report.required_lightweight_scripts) {
    if (
      typeof scriptName !== "string" ||
      !/^scripts\/dev-[A-Za-z0-9_.-]+\.js$/.test(scriptName)
    ) {
      throw new Error(
        "Public report boundary audit lightweight required script name is not public-safe"
      );
    }
  }
  if (
    report.missing_required_lightweight_scripts.length !==
    report.missing_required_lightweight_script_count
  ) {
    throw new Error("Public report boundary audit lightweight missing count mismatch");
  }
  assertUniquePublicNames(
    report.missing_required_lightweight_scripts,
    "lightweight missing"
  );
  for (const scriptName of report.missing_required_lightweight_scripts) {
    if (
      typeof scriptName !== "string" ||
      !/^scripts\/dev-[A-Za-z0-9_.-]+\.js$/.test(scriptName)
    ) {
      throw new Error(
        "Public report boundary audit lightweight script name is not public-safe"
      );
    }
  }
  if (!Array.isArray(report.script_layer_import_violation_files)) {
    throw new Error(
      "Public report boundary audit script-layer import violation list must be an array"
    );
  }
  if (
    report.script_layer_import_violation_files.length !==
    report.script_layer_import_violation_count
  ) {
    throw new Error(
      "Public report boundary audit script-layer import violation count mismatch"
    );
  }
  assertUniquePublicNames(
    report.script_layer_import_violation_files,
    "script-layer import violation"
  );
  for (const fileName of report.script_layer_import_violation_files) {
    if (
      typeof fileName !== "string" ||
      !/^src\/[A-Za-z0-9_./-]+\.js$/.test(fileName)
    ) {
      throw new Error(
        "Public report boundary audit script-layer import violation file is not public-safe"
      );
    }
  }
  if (!Array.isArray(report.unsafe_public_output_fields)) {
    throw new Error(
      "Public report boundary audit unsafe output field list must be an array"
    );
  }
  if (
    report.unsafe_public_output_fields.length !==
    report.unsafe_public_output_field_count
  ) {
    throw new Error(
      "Public report boundary audit unsafe output field count mismatch"
    );
  }
  assertUniquePublicNames(report.unsafe_public_output_fields, "unsafe output field");
  for (const fieldName of report.unsafe_public_output_fields) {
    if (
      typeof fieldName !== "string" ||
      !/^(?:src\/services\/dev|scripts)\/[A-Za-z0-9_.-]+\.js#[A-Za-z0-9_]+$/.test(
        fieldName
      )
    ) {
      throw new Error(
        "Public report boundary audit unsafe output field is not public-safe"
      );
    }
  }

  const policy = report.boundary_policy;
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new Error("Public report boundary audit policy must be an object");
  }

  const requiredPolicyFields = [
    "script_names_only",
    "public_relative_file_names_only",
    "no_file_contents",
    "no_env_values",
    "allowlist_fields_only",
    "no_secret_or_raw_field_names",
    "no_candidate_field_names",
    "no_commands"
  ];
  for (const field of requiredPolicyFields) {
    if (!(field in policy)) {
      throw new Error(`Public report boundary audit policy field missing: ${field}`);
    }
  }
  for (const [field, value] of Object.entries(policy)) {
    if (
      !requiredPolicyFields.includes(field) ||
      value !== true
    ) {
      throw new Error(`Public report boundary audit policy field invalid: ${field}`);
    }
  }
}

export function createPublicReportBoundaryAuditReport() {
  const { scriptNames, assertScripts, missingAllowlistScripts } =
    findDevScriptsMissingAllowlists();
  const {
    scriptNames: runScriptNames,
    missingRunBoundaryScripts
  } = findRunScriptsMissingBoundaryMetadata();
  const {
    serviceNames,
    assertServices,
    missingDevServiceAllowlistFiles
  } = findDevServicesMissingAllowlists();
  const {
    fileNames: serverFileNames,
    assertFiles: serverAssertFiles,
    missingServerAllowlistFiles
  } = findServerFilesMissingAllowlists();
  const {
    fileNames: srcImportFileNames,
    scriptLayerImportViolationFiles
  } = findSrcFilesImportingScriptLayer();
  const {
    requiredLightweightScriptNames,
    missingRequiredLightweightScripts
  } = findMissingRequiredLightweightScripts();
  const unsafePublicOutputFields = findUnsafePublicOutputAllowlistFields();

  const report = {
    ok:
      missingAllowlistScripts.length === 0 &&
      missingRunBoundaryScripts.length === 0 &&
      missingDevServiceAllowlistFiles.length === 0 &&
      missingServerAllowlistFiles.length === 0 &&
      scriptLayerImportViolationFiles.length === 0 &&
      missingRequiredLightweightScripts.length === 0 &&
      unsafePublicOutputFields.length === 0,
    schema: "iris_public_report_boundary_audit_v1",
    scanned_script_count: scriptNames.length,
    assert_script_count: assertScripts.length,
    missing_allowlist_count: missingAllowlistScripts.length,
    missing_allowlist_scripts: missingAllowlistScripts,
    scanned_run_script_count: runScriptNames.length,
    missing_run_boundary_count: missingRunBoundaryScripts.length,
    missing_run_boundary_scripts: missingRunBoundaryScripts,
    scanned_dev_service_count: serviceNames.length,
    dev_service_assert_count: assertServices.length,
    missing_dev_service_allowlist_count:
      missingDevServiceAllowlistFiles.length,
    missing_dev_service_allowlist_files: missingDevServiceAllowlistFiles,
    scanned_server_file_count: serverFileNames.length,
    server_assert_count: serverAssertFiles.length,
    missing_server_allowlist_count: missingServerAllowlistFiles.length,
    missing_server_allowlist_files: missingServerAllowlistFiles,
    scanned_src_import_file_count: srcImportFileNames.length,
    script_layer_import_violation_count: scriptLayerImportViolationFiles.length,
    script_layer_import_violation_files: scriptLayerImportViolationFiles,
    required_lightweight_script_count: requiredLightweightScriptNames.length,
    required_lightweight_scripts: requiredLightweightScriptNames,
    missing_required_lightweight_script_count:
      missingRequiredLightweightScripts.length,
    missing_required_lightweight_scripts: missingRequiredLightweightScripts,
    unsafe_public_output_field_count: unsafePublicOutputFields.length,
    unsafe_public_output_fields: unsafePublicOutputFields,
    boundary_policy: {
      script_names_only: true,
      public_relative_file_names_only: true,
      no_file_contents: true,
      no_env_values: true,
      allowlist_fields_only: true,
      no_secret_or_raw_field_names: true,
      no_candidate_field_names: true,
      no_commands: true
    }
  };

  verifyPublicReportBoundaryAuditReportSafe(report);
  return report;
}

export { verifyPublicReportBoundaryAuditReportSafe };
