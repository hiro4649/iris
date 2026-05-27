import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

const DEFAULT_LOCK_WAIT_MS = 2_000;
const DEFAULT_LOCK_POLL_MS = 5;
const DEFAULT_STALE_LOCK_MS = 30_000;

export function withJsonStoreWriteLock(
  filePath,
  writeOperation,
  {
    waitMs = DEFAULT_LOCK_WAIT_MS,
    pollMs = DEFAULT_LOCK_POLL_MS,
    staleLockMs = DEFAULT_STALE_LOCK_MS,
    now = Date.now,
  } = {}
) {
  mkdirSync(dirname(filePath), { recursive: true });
  const lockPath = `${filePath}.lock`;
  const startedAtMs = now();
  let lockFd = null;
  while (lockFd === null) {
    try {
      lockFd = openSync(lockPath, "wx");
      writeFileSync(
        lockFd,
        `${JSON.stringify({
          schema: "iris_json_store_write_lock_v1",
          created_at_ms: now(),
        })}\n`,
        "utf8"
      );
    } catch (error) {
      if (error?.code !== "EEXIST") {
        throw createJsonStoreWriteLockError(error);
      }
      removeStaleLockSafely(lockPath, { staleLockMs, now });
      if (now() - startedAtMs >= waitMs) {
        throw createJsonStoreWriteLockError(error);
      }
      sleepSync(pollMs);
    }
  }

  try {
    return writeOperation();
  } finally {
    releaseLockSafely(lockFd, lockPath);
  }
}

export function writeJsonFileAtomic(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}-${randomUUID()}`;
  try {
    writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    renameSync(tempPath, filePath);
  } catch (error) {
    removeFileSafely(tempPath);
    throw error;
  }
}

function createJsonStoreWriteLockError(cause) {
  const error = new Error("json_store_write_lock_unavailable");
  error.code = "ELOCKED";
  error.cause = cause;
  return error;
}

function releaseLockSafely(lockFd, lockPath) {
  try {
    closeSync(lockFd);
  } catch {
    // Lock release failures are surfaced by later write attempts as safe store errors.
  }
  removeFileSafely(lockPath);
}

function removeStaleLockSafely(lockPath, { staleLockMs, now }) {
  try {
    if (!existsSync(lockPath)) return;
    const ageMs = now() - statSync(lockPath).mtimeMs;
    if (ageMs >= staleLockMs) removeFileSafely(lockPath);
  } catch {
    // Keep waiting; lock diagnostics must remain path-free and payload-free.
  }
}

function removeFileSafely(filePath) {
  try {
    unlinkSync(filePath);
  } catch {
    // Best-effort cleanup only.
  }
}

function sleepSync(ms) {
  if (ms <= 0) return;
  const shared = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(shared, 0, 0, ms);
}
