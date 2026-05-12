import { readdirSync } from "node:fs";

import { ContractError } from "../../core/contracts.js";

const SPEC_MANIFEST_FIELDS = new Set([
  "schema",
  "version_prefix",
  "expected_count",
  "found_count",
  "complete",
  "expected_files",
  "found_files",
  "addendum_files",
  "missing_files",
  "unexpected_files",
]);

export function createSpecManifest({ specsDir, versionPrefix = "IRIS_20240425", phases = 28 } = {}) {
  if (!specsDir) throw new ContractError("spec manifest requires specsDir");
  const expected_files = Array.from({ length: phases }, (_, index) =>
    `${versionPrefix}_${String(index).padStart(2, "0")}.txt`
  );
  const all_files = readdirSync(specsDir).filter((name) => name.endsWith(".txt")).sort();
  const phaseFilePattern = new RegExp(`^${escapeRegExp(versionPrefix)}_\\d{2}\\.txt$`);
  const found_files = all_files.filter((name) => phaseFilePattern.test(name));
  const addendum_files = all_files.filter(
    (name) => name.startsWith(`${versionPrefix}_`) && !phaseFilePattern.test(name)
  );
  const missing_files = expected_files.filter((name) => !found_files.includes(name));
  const unexpected_files = found_files.filter((name) => !expected_files.includes(name));
  const manifest = {
    schema: "iris_spec_manifest_v1",
    version_prefix: versionPrefix,
    expected_count: expected_files.length,
    found_count: found_files.length,
    complete: missing_files.length === 0 && unexpected_files.length === 0,
    expected_files,
    found_files,
    addendum_files,
    missing_files,
    unexpected_files,
  };
  assertSpecManifestSafe(manifest);
  return manifest;
}

export function assertSpecManifestSafe(manifest, context = "spec manifest") {
  if (!manifest || typeof manifest !== "object") {
    throw new ContractError(`${context}: missing manifest`);
  }
  if (manifest.schema !== "iris_spec_manifest_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: manifest.schema });
  }
  for (const field of Object.keys(manifest)) {
    if (!SPEC_MANIFEST_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected manifest field`, { field });
    }
  }
  if (!Array.isArray(manifest.expected_files) || !Array.isArray(manifest.found_files)) {
    throw new ContractError(`${context}: file lists must be arrays`);
  }
  if (!Array.isArray(manifest.addendum_files)) {
    throw new ContractError(`${context}: addendum files must be an array`);
  }
  if (manifest.expected_count !== manifest.expected_files.length) {
    throw new ContractError(`${context}: expected count mismatch`);
  }
  if (manifest.found_count !== manifest.found_files.length) {
    throw new ContractError(`${context}: found count mismatch`);
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
