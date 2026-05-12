import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { ContractError } from "../core/contracts.js";

const DEFAULT_ENV_FILES = [".env", ".env.local"];
const SAFE_ENV_NAME_PATTERN = /^IRIS_[A-Z0-9_]+$/;

export const irisEnvFileLoadResult =
  process.env.IRIS_DISABLE_ENV_FILE_LOAD === "true"
    ? createEmptyLoadResult()
    : loadIrisEnvFiles();

export function loadIrisEnvFiles({
  cwd = process.cwd(),
  env = process.env,
  files = DEFAULT_ENV_FILES,
} = {}) {
  const protectedEnvNames = new Set(Object.keys(env));
  const loadedFiles = [];
  const loadedEnvNames = new Set();
  const skippedExistingEnvNames = new Set();

  for (const fileName of files) {
    const envPath = resolve(cwd, fileName);
    if (!existsSync(envPath)) continue;
    const parsed = parseIrisEnvFile(readFileSync(envPath, "utf8"));
    const fileLoadedEnvNames = [];
    for (const [name, envValue] of Object.entries(parsed)) {
      if (!SAFE_ENV_NAME_PATTERN.test(name)) continue;
      if (protectedEnvNames.has(name)) {
        skippedExistingEnvNames.add(name);
        continue;
      }
      env[name] = envValue;
      loadedEnvNames.add(name);
      fileLoadedEnvNames.push(name);
    }
    loadedFiles.push({
      schema: "iris_env_loaded_file_v1",
      env_file_name: basename(fileName),
      loaded_env_names: fileLoadedEnvNames.sort(),
      loaded_env_count: fileLoadedEnvNames.length,
    });
  }

  const result = {
    schema: "iris_env_file_load_result_v1",
    env_file_count: loadedFiles.length,
    loaded_env_names: [...loadedEnvNames].sort(),
    loaded_env_count: loadedEnvNames.size,
    skipped_existing_env_names: [...skippedExistingEnvNames].sort(),
    skipped_existing_env_count: skippedExistingEnvNames.size,
    loaded_files: loadedFiles,
    boundary_policy: {
      iris_env_names_only: true,
      file_names_only: true,
      no_env_values: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
  assertIrisEnvFileLoadResultSafe(result);
  return result;
}

export function parseIrisEnvFile(text) {
  const parsed = {};
  for (const rawLine of String(text ?? "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const normalizedLine = line.startsWith("export ") ? line.slice(7).trim() : line;
    const separatorIndex = normalizedLine.indexOf("=");
    if (separatorIndex <= 0) continue;
    const name = normalizedLine.slice(0, separatorIndex).trim();
    if (!SAFE_ENV_NAME_PATTERN.test(name)) continue;
    const rawValue = normalizedLine.slice(separatorIndex + 1).trim();
    parsed[name] = parseEnvValue(rawValue);
  }
  return parsed;
}

export function assertIrisEnvFileLoadResultSafe(
  result,
  context = "IRIS env file load result"
) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new ContractError(`${context}: result is required`);
  }
  if (result.schema !== "iris_env_file_load_result_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of [
    "env_file_count",
    "loaded_env_count",
    "skipped_existing_env_count",
  ]) {
    assertNonNegativeInteger(result[field], `${context}: invalid ${field}`);
  }
  assertEnvNameList(result.loaded_env_names, `${context}: loaded env names`);
  assertEnvNameList(
    result.skipped_existing_env_names,
    `${context}: skipped env names`
  );
  if (!Array.isArray(result.loaded_files)) {
    throw new ContractError(`${context}: loaded files are required`);
  }
  if (result.env_file_count !== result.loaded_files.length) {
    throw new ContractError(`${context}: invalid loaded file count`);
  }
  if (result.loaded_env_count !== result.loaded_env_names.length) {
    throw new ContractError(`${context}: invalid loaded env count`);
  }
  if (
    result.skipped_existing_env_count !== result.skipped_existing_env_names.length
  ) {
    throw new ContractError(`${context}: invalid skipped env count`);
  }
  result.loaded_files.forEach((file) => assertLoadedFileSafe(file, context));
  assertBoundaryPolicy(result.boundary_policy, [
    "iris_env_names_only",
    "file_names_only",
    "no_env_values",
    "no_secret_values",
    "no_endpoint_values",
    "no_payloads",
    "no_commands",
  ], context);
  if (result.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation required`);
  }
}

function parseEnvValue(rawValue) {
  if (
    (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
    (rawValue.startsWith("'") && rawValue.endsWith("'"))
  ) {
    const inner = rawValue.slice(1, -1);
    return rawValue.startsWith('"')
      ? inner
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r")
          .replace(/\\t/g, "\t")
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, "\\")
      : inner;
  }
  return rawValue.replace(/\s+#.*$/, "").trim();
}

function createEmptyLoadResult() {
  return {
    schema: "iris_env_file_load_result_v1",
    env_file_count: 0,
    loaded_env_names: [],
    loaded_env_count: 0,
    skipped_existing_env_names: [],
    skipped_existing_env_count: 0,
    loaded_files: [],
    boundary_policy: {
      iris_env_names_only: true,
      file_names_only: true,
      no_env_values: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_payloads: true,
      no_commands: true,
    },
    adapter_validation_required: true,
  };
}

function assertLoadedFileSafe(file, context) {
  if (!file || typeof file !== "object" || Array.isArray(file)) {
    throw new ContractError(`${context}: invalid loaded file`);
  }
  if (file.schema !== "iris_env_loaded_file_v1") {
    throw new ContractError(`${context}: invalid loaded file schema`);
  }
  if (
    typeof file.env_file_name !== "string" ||
    !/^\.[a-z0-9_.-]+$/i.test(file.env_file_name)
  ) {
    throw new ContractError(`${context}: invalid env file name`);
  }
  assertEnvNameList(file.loaded_env_names, `${context}: loaded file env names`);
  if (file.loaded_env_count !== file.loaded_env_names.length) {
    throw new ContractError(`${context}: invalid loaded file env count`);
  }
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowed = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertEnvNameList(names, context) {
  if (!Array.isArray(names)) {
    throw new ContractError(`${context}: env names must be an array`);
  }
  for (const name of names) {
    if (typeof name !== "string" || !SAFE_ENV_NAME_PATTERN.test(name)) {
      throw new ContractError(`${context}: invalid env name`);
    }
  }
}

function assertNonNegativeInteger(value, context) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ContractError(context);
  }
}
