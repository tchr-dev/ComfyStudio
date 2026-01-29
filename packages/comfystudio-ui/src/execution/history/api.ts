/**
 * History Store Public API
 *
 * High-level interface for crash-resilient execution history.
 * Implements files-as-truth storage with deterministic replay.
 *
 * Milestone: M2 - History Store (Files-as-Truth)
 */

import type {
  ExecutionRecordV1,
  ArtifactManifestV1,
  ExecutionErrorRecordV1,
  PruneReport,
  PruningConfigV1,
} from "./types";
import type { HistoryStorePorts } from "./ports";
import type { WorkflowExecution, ToolExecutionState } from "../types";
import { createPaths, joinPath } from "./paths";
import { recordExecution as writeExecution, recordError as writeError, storeArtifacts as writeArtifacts } from "./writer";
import { replayTool } from "./replay";
import { pruneTool } from "./prune";
import { atomicReadJson, atomicWriteJson } from "./io/atomic";
import { validatePruningConfig } from "./schemas";

/**
 * History Store - Public API
 *
 * CONTRACT: All operations are crash-safe.
 * - Writes are atomic (temp file + rename)
 * - Replay tolerates partial last lines
 * - Terminal state immutability enforced
 */
export interface HistoryStore {
  /**
   * Record execution state change (append-only)
   *
   * Monotonic truth: Multiple records for same executionId allowed.
   * Latest valid record wins during replay.
   */
  recordExecution(
    toolId: string,
    execution: WorkflowExecution
  ): Promise<void>;

  /**
   * Record execution error (append-only)
   *
   * Returns executionErrorId for referencing in execution record.
   */
  recordError(
    toolId: string,
    executionId: string,
    error: {
      category: "comfyui" | "validation" | "io" | "unknown";
      message: string;
      details?: any;
      stack?: string;
    }
  ): Promise<string>;

  /**
   * Store artifact bundle for execution
   *
   * Writes manifest + copies artifact files atomically.
   */
  storeArtifacts(
    toolId: string,
    executionId: string,
    artifacts: Array<{
      kind: "image" | "mask" | "json" | "zip" | "other";
      sourcePath: string; // Temp file to copy from
      filename: string;
      mime: string;
      role: "primary" | "preview" | "debug";
    }>
  ): Promise<void>;

  /**
   * Replay history for tool and reconstruct state
   *
   * Crash-tolerant: Handles truncated JSONL, missing artifacts, corrupt indexes.
   * Returns reconstructed ToolExecutionState.
   */
  replay(toolId: string): Promise<ReplayResult>;

  /**
   * Replay all tools and reconstruct full execution map
   */
  replayAll(): Promise<Map<string, ToolExecutionState>>;

  /**
   * Run deterministic pruning for tool
   *
   * Deletes old terminal executions + artifacts according to policy.
   * Returns report of what was pruned.
   */
  prune(toolId: string, policy?: PruningConfigV1["policy"]): Promise<PruneReport>;

  /**
   * Get pruning configuration for tool
   */
  getPruningConfig(toolId: string): Promise<PruningConfigV1 | null>;

  /**
   * Update pruning configuration for tool
   */
  setPruningConfig(toolId: string, policy: PruningConfigV1["policy"]): Promise<void>;

  /**
   * Get list of all tools with history
   */
  listTools(): Promise<string[]>;

  /**
   * Get storage statistics
   */
  getStats(): Promise<HistoryStats>;
}

/**
 * Replay result with reconstructed state + diagnostics
 */
export type ReplayResult = {
  /**
   * Reconstructed tool state (ready to use)
   */
  toolState: ToolExecutionState;

  /**
   * Execution records loaded (latest per executionId)
   */
  executions: Map<string, ExecutionRecordV1>;

  /**
   * Artifact manifests loaded
   */
  artifacts: Map<string, ArtifactManifestV1>;

  /**
   * Errors loaded (keyed by executionErrorId)
   */
  errors: Map<string, ExecutionErrorRecordV1>;

  /**
   * Diagnostics (warnings, not fatal)
   */
  diagnostics: ReplayDiagnostic[];
};

export type ReplayDiagnostic = {
  severity: "warning" | "error";
  code:
    | "truncated_line"
    | "invalid_json"
    | "schema_error"
    | "missing_artifact"
    | "orphaned_artifact"
    | "terminal_regression"
    | "corrupt_index";
  message: string;
  details?: any;
};

/**
 * Storage statistics
 */
export type HistoryStats = {
  totalExecutions: number;
  terminalExecutions: number;
  activeExecutions: number;
  totalArtifacts: number;
  totalBytes: number;
  oldestExecution: string | null; // ISO-8601
  newestExecution: string | null; // ISO-8601
};

/**
 * History Store factory
 *
 * Creates new store instance with given root path and ports.
 */
export function createHistoryStore(
  workspaceRoot: string,
  ports: HistoryStorePorts
): HistoryStore {
  const paths = createPaths(workspaceRoot);

  return {
    async recordExecution(toolId: string, execution: WorkflowExecution): Promise<void> {
      await writeExecution(ports, paths, toolId, execution);
    },

    async recordError(
      toolId: string,
      executionId: string,
      error: {
        category: "comfyui" | "validation" | "io" | "unknown";
        message: string;
        details?: any;
        stack?: string;
      }
    ): Promise<string> {
      return await writeError(ports, paths, toolId, executionId, error);
    },

    async storeArtifacts(
      toolId: string,
      executionId: string,
      artifacts: Array<{
        kind: "image" | "mask" | "json" | "zip" | "other";
        sourcePath: string;
        filename: string;
        mime: string;
        role: "primary" | "preview" | "debug";
      }>
    ): Promise<void> {
      await writeArtifacts(ports, paths, toolId, executionId, artifacts);
    },

    async replay(toolId: string): Promise<ReplayResult> {
      return await replayTool(ports, paths, toolId);
    },

    async replayAll(): Promise<Map<string, ToolExecutionState>> {
      const toolsRoot = joinPath(workspaceRoot, "history", "v1", "tools");
      const exists = await ports.fs.exists(toolsRoot);

      if (!exists) {
        return new Map();
      }

      const toolIds = await ports.fs.readdir(toolsRoot);
      const stateMap = new Map<string, ToolExecutionState>();

      for (const toolId of toolIds) {
        const result = await replayTool(ports, paths, toolId);
        stateMap.set(toolId, result.toolState);
      }

      return stateMap;
    },

    async prune(toolId: string, policy?: PruningConfigV1["policy"]): Promise<PruneReport> {
      return await pruneTool(ports, paths, toolId, policy);
    },

    async getPruningConfig(toolId: string): Promise<PruningConfigV1 | null> {
      const configPath = paths.tools(toolId).executions.pruning;
      const config = await atomicReadJson<PruningConfigV1>(ports.fs, configPath);

      if (!config) return null;

      const result = validatePruningConfig(config);
      if (!result.valid) {
        return null;
      }

      return result.data;
    },

    async setPruningConfig(toolId: string, policy: PruningConfigV1["policy"]): Promise<void> {
      const config: PruningConfigV1 = {
        v: 1,
        policy,
        lastPrunedAt: ports.clock.now(),
      };

      const configPath = paths.tools(toolId).executions.pruning;
      await atomicWriteJson(ports.fs, configPath, config);
    },

    async listTools(): Promise<string[]> {
      const toolsRoot = joinPath(workspaceRoot, "history", "v1", "tools");
      const exists = await ports.fs.exists(toolsRoot);

      if (!exists) {
        return [];
      }

      return await ports.fs.readdir(toolsRoot);
    },

    async getStats(): Promise<HistoryStats> {
      const toolIds = await this.listTools();
      let totalExecutions = 0;
      let terminalExecutions = 0;
      let activeExecutions = 0;
      let totalArtifacts = 0;
      let totalBytes = 0;
      let oldestExecution: string | null = null;
      let newestExecution: string | null = null;

      for (const toolId of toolIds) {
        const result = await replayTool(ports, paths, toolId);

        totalExecutions += result.toolState.executions.size;
        activeExecutions +=
          result.toolState.queuedIds.length + result.toolState.executingIds.length;

        for (const [_id, record] of result.executions) {
          if (["completed", "failed", "cancelled"].includes(record.state)) {
            terminalExecutions++;
          }

          if (record.timestamps.queuedAt) {
            if (!oldestExecution || record.timestamps.queuedAt < oldestExecution) {
              oldestExecution = record.timestamps.queuedAt;
            }
            if (!newestExecution || record.timestamps.queuedAt > newestExecution) {
              newestExecution = record.timestamps.queuedAt;
            }
          }
        }

        for (const [_id, manifest] of result.artifacts) {
          totalArtifacts += manifest.artifacts.length;
          for (const artifact of manifest.artifacts) {
            totalBytes += artifact.bytes;
          }
        }
      }

      return {
        totalExecutions,
        terminalExecutions,
        activeExecutions,
        totalArtifacts,
        totalBytes,
        oldestExecution,
        newestExecution,
      };
    },
  };
}

/**
 * Create history store with default ports (real filesystem)
 */
export function createDefaultHistoryStore(workspaceRoot: string): HistoryStore {
  const { createDefaultPorts } = require("./ports");
  return createHistoryStore(workspaceRoot, createDefaultPorts());
}
