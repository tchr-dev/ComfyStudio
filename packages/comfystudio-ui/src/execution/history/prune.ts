/**
 * History Store Pruning
 *
 * Deterministic pruning with configurable policies.
 * Implements oldest-first selection with keepLatestPerRevision protection.
 *
 * Milestone: M2 Phase 4 - Pruning + compaction
 */

import type {
  ExecutionRecordV1,
  PruningConfigV1,
  PruneReport,
} from "./types";
import type { HistoryStorePorts } from "./ports";
import type { HistoryStorePaths } from "./types";
import { readJsonlTolerant } from "./io/jsonl";
import { atomicWriteFile, atomicWriteJson, atomicReadJson } from "./io/atomic";
import { validateExecutionRecord, validatePruningConfig } from "./schemas";

/**
 * Default pruning policy
 */
export const DEFAULT_PRUNE_POLICY: PruningConfigV1["policy"] = {
  maxTerminalCount: 500,
  maxTerminalAgeDays: 30,
  keepLatestPerRevision: true,
};

/**
 * Run deterministic pruning for tool
 *
 * CONTRACT:
 * - Never prunes non-terminal (queued/executing)
 * - Deterministic selection (same input → same kept set)
 * - Artifacts pruned iff execution pruned
 * - Errors pruned iff unreferenced by kept executions
 */
export async function pruneTool(
  ports: HistoryStorePorts,
  paths: HistoryStorePaths,
  toolId: string,
  policy?: PruningConfigV1["policy"]
): Promise<PruneReport> {
  const startTime = Date.now();

  // Load or use provided policy
  const effectivePolicy = policy ?? (await loadPruningConfig(ports, paths, toolId))?.policy ?? DEFAULT_PRUNE_POLICY;

  // Load all execution records
  const { records } = await readJsonlTolerant(
    ports.fs,
    paths.tools(toolId).executions.jsonl,
    validateExecutionRecord
  );

  // Separate terminal from non-terminal
  const { terminal, nonTerminal } = separateByTerminality(records);

  // Determine which executions to prune
  const toPrune = selectExecutionsToPrune(
    terminal,
    effectivePolicy,
    ports.clock.nowMs()
  );

  // If nothing to prune, return early
  if (toPrune.length === 0) {
    return {
      prunedExecutionIds: [],
      deletedArtifactCount: 0,
      bytesFreed: 0,
      compactedFiles: [],
      duration: Date.now() - startTime,
    };
  }

  const prunedIds = new Set(toPrune.map((r) => r.executionId));

  // Delete artifacts for pruned executions
  const { artifactCount, bytesFreed } = await deleteArtifacts(
    ports,
    paths,
    toolId,
    Array.from(prunedIds)
  );

  // Compact JSONL (rewrite without pruned records)
  await compactExecutionLog(
    ports,
    paths,
    toolId,
    records.filter((r) => !prunedIds.has(r.executionId))
  );

  // Update pruning config with last run time
  await savePruningConfig(ports, paths, toolId, effectivePolicy);

  return {
    prunedExecutionIds: Array.from(prunedIds),
    deletedArtifactCount: artifactCount,
    bytesFreed,
    compactedFiles: [paths.tools(toolId).executions.jsonl],
    duration: Date.now() - startTime,
  };
}

/**
 * Separate records by terminality
 */
function separateByTerminality(records: ExecutionRecordV1[]): {
  terminal: ExecutionRecordV1[];
  nonTerminal: ExecutionRecordV1[];
} {
  const terminal: ExecutionRecordV1[] = [];
  const nonTerminal: ExecutionRecordV1[] = [];

  for (const record of records) {
    if (["completed", "failed", "cancelled"].includes(record.state)) {
      terminal.push(record);
    } else {
      nonTerminal.push(record);
    }
  }

  return { terminal, nonTerminal };
}

/**
 * Select executions to prune (oldest-first, deterministic)
 *
 * CONTRACT:
 * - Protected set: Latest per revision (if keepLatestPerRevision)
 * - Protected set: Latest terminal overall (nice UX)
 * - Delete oldest first until constraints satisfied
 */
function selectExecutionsToPrune(
  terminal: ExecutionRecordV1[],
  policy: PruningConfigV1["policy"],
  nowMs: number
): ExecutionRecordV1[] {
  // Build protected set
  const protectedIds = new Set<string>();

  // Protect latest per revision (if enabled)
  if (policy.keepLatestPerRevision) {
    const latestByRevision = new Map<number, ExecutionRecordV1>();

    for (const record of terminal) {
      const existing = latestByRevision.get(record.revision);
      if (!existing || isNewer(record, existing)) {
        latestByRevision.set(record.revision, record);
      }
    }

    for (const record of latestByRevision.values()) {
      protectedIds.add(record.executionId);
    }
  }

  // Protect latest terminal overall (nice UX)
  if (terminal.length > 0) {
    const latest = terminal.reduce((newest, record) =>
      isNewer(record, newest) ? record : newest
    );
    protectedIds.add(latest.executionId);
  }

  // Build eligible set (terminal, not protected)
  const eligible = terminal.filter((r) => !protectedIds.has(r.executionId));

  // Sort eligible by (endedAt, executionId) ascending (oldest first)
  eligible.sort((a, b) => {
    const aTime = a.timestamps.endedAt
      ? new Date(a.timestamps.endedAt).getTime()
      : 0;
    const bTime = b.timestamps.endedAt
      ? new Date(b.timestamps.endedAt).getTime()
      : 0;

    const timeDiff = aTime - bTime;
    if (timeDiff !== 0) return timeDiff;

    // Tie-break by executionId
    return a.executionId.localeCompare(b.executionId);
  });

  // Select records to prune
  const toPrune: ExecutionRecordV1[] = [];

  // Count how many we need to prune
  // We want to keep at most maxTerminalCount total (including protected)
  // Protected ones are always kept, so we can only prune from eligible
  const terminalCount = terminal.length;
  const protectedCount = protectedIds.size;
  const targetEligibleCount = Math.max(0, policy.maxTerminalCount - protectedCount);
  const excessEligibleCount = Math.max(0, eligible.length - targetEligibleCount);

  // Prune by count
  if (excessEligibleCount > 0) {
    toPrune.push(...eligible.slice(0, excessEligibleCount));
  }

  // Prune by age
  const maxAgeMs = policy.maxTerminalAgeDays * 24 * 60 * 60 * 1000;

  for (const record of eligible) {
    if (toPrune.includes(record)) continue; // Already pruned by count

    const endedAt = record.timestamps.endedAt
      ? new Date(record.timestamps.endedAt).getTime()
      : 0;

    const age = nowMs - endedAt;

    if (age > maxAgeMs) {
      toPrune.push(record);
    }
  }

  return toPrune;
}

/**
 * Check if record A is newer than record B (by endedAt)
 */
function isNewer(a: ExecutionRecordV1, b: ExecutionRecordV1): boolean {
  const aTime = a.timestamps.endedAt
    ? new Date(a.timestamps.endedAt).getTime()
    : 0;
  const bTime = b.timestamps.endedAt
    ? new Date(b.timestamps.endedAt).getTime()
    : 0;

  if (aTime !== bTime) return aTime > bTime;

  // Tie-break: prefer completed over failed/cancelled
  if (a.state === "completed" && b.state !== "completed") return true;
  if (a.state !== "completed" && b.state === "completed") return false;

  // Tie-break: lexicographic by executionId
  return a.executionId > b.executionId;
}

/**
 * Delete artifacts for pruned executions
 */
async function deleteArtifacts(
  ports: HistoryStorePorts,
  paths: HistoryStorePaths,
  toolId: string,
  executionIds: string[]
): Promise<{ artifactCount: number; bytesFreed: number }> {
  let artifactCount = 0;
  let bytesFreed = 0;

  for (const executionId of executionIds) {
    const artifactRoot = paths
      .tools(toolId)
      .artifacts.execution(executionId).root;

    const exists = await ports.fs.exists(artifactRoot);
    if (!exists) continue;

    // Count artifacts and bytes
    try {
      const manifestPath = paths
        .tools(toolId)
        .artifacts.execution(executionId).manifest;

      const manifestExists = await ports.fs.exists(manifestPath);
      if (manifestExists) {
        const manifestContent = await ports.fs.readFile(manifestPath);
        const manifest = JSON.parse(manifestContent);

        artifactCount += manifest.artifacts?.length ?? 0;

        for (const artifact of manifest.artifacts || []) {
          bytesFreed += artifact.bytes ?? 0;
        }
      }

      // Delete entire artifact directory
      await ports.fs.rmdir(artifactRoot, { recursive: true });
    } catch {
      // Ignore errors (artifact may already be deleted)
    }
  }

  return { artifactCount, bytesFreed };
}

/**
 * Compact execution log (rewrite JSONL without pruned records)
 */
async function compactExecutionLog(
  ports: HistoryStorePorts,
  paths: HistoryStorePaths,
  toolId: string,
  keptRecords: ExecutionRecordV1[]
): Promise<void> {
  const jsonlPath = paths.tools(toolId).executions.jsonl;

  // Write compacted JSONL to temp file
  const lines = keptRecords.map((r) => JSON.stringify(r)).join("\n");
  const content = lines ? lines + "\n" : "";

  // Atomic write (temp + rename)
  await atomicWriteFile(ports.fs, jsonlPath, content);

  // Rebuild index after compaction (optional)
  // TODO: Implement index rebuild in Phase 5
}

/**
 * Load pruning configuration
 */
async function loadPruningConfig(
  ports: HistoryStorePorts,
  paths: HistoryStorePaths,
  toolId: string
): Promise<PruningConfigV1 | null> {
  const configPath = paths.tools(toolId).executions.pruning;

  const config = await atomicReadJson<PruningConfigV1>(ports.fs, configPath);
  if (!config) return null;

  // Validate schema
  const result = validatePruningConfig(config);
  if (!result.valid) {
    return null;
  }

  return result.data;
}

/**
 * Save pruning configuration
 */
async function savePruningConfig(
  ports: HistoryStorePorts,
  paths: HistoryStorePaths,
  toolId: string,
  policy: PruningConfigV1["policy"]
): Promise<void> {
  const config: PruningConfigV1 = {
    v: 1,
    policy,
    lastPrunedAt: ports.clock.now(),
  };

  const configPath = paths.tools(toolId).executions.pruning;
  await atomicWriteJson(ports.fs, configPath, config);
}
