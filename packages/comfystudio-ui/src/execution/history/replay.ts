/**
 * History Store Replay
 *
 * Crash-tolerant reconstruction of execution state from JSONL.
 * Implements 6-step replay algorithm from ADR-0008.
 *
 * Milestone: M2 Phase 3 - Replay / scan
 */

import type {
  WorkflowExecution,
  ToolExecutionState,
  WorkflowExecutionState,
} from "../types";
import type {
  ExecutionRecordV1,
  ExecutionErrorRecordV1,
  ArtifactManifestV1,
} from "./types";
import type { HistoryStorePorts } from "./ports";
import type { HistoryStorePaths } from "./types";
import type { ReplayResult, ReplayDiagnostic } from "./api";
import { readJsonlTolerant } from "./io/jsonl";
import { atomicReadJson } from "./io/atomic";
import {
  validateExecutionRecord,
  validateErrorRecord,
  validateArtifactManifest,
} from "./schemas";

/**
 * Replay history for tool and reconstruct state
 *
 * Implements 6-step algorithm from ADR-0008:
 * 1. Load execution snapshots (scan JSONL)
 * 2. Enforce monotonic / terminal immutability
 * 3. Convert records → WorkflowExecution objects
 * 4. Reconstruct queue + active sets (derived)
 * 5. Run policy enforcement
 * 6. Integrity checks (warnings only)
 */
export async function replayTool(
  ports: HistoryStorePorts,
  paths: HistoryStorePaths,
  toolId: string
): Promise<ReplayResult> {
  const diagnostics: ReplayDiagnostic[] = [];

  // Step 1: Load execution snapshots
  const { executions, executionDiagnostics } = await loadExecutionSnapshots(
    ports,
    paths,
    toolId
  );
  diagnostics.push(...executionDiagnostics);

  // Load errors
  const { errors, errorDiagnostics } = await loadErrors(ports, paths, toolId);
  diagnostics.push(...errorDiagnostics);

  // Load artifacts
  const { artifacts, artifactDiagnostics } = await loadArtifacts(
    ports,
    paths,
    toolId
  );
  diagnostics.push(...artifactDiagnostics);

  // Step 2: Enforce monotonic / terminal immutability
  const validatedExecutions = enforceTerminalImmutability(
    executions,
    diagnostics
  );

  // Step 3: Convert records → WorkflowExecution objects
  const workflowExecutions = convertToWorkflowExecutions(
    validatedExecutions,
    errors
  );

  // Step 4: Reconstruct queue + active sets (derived)
  const toolState = reconstructToolState(toolId, workflowExecutions);

  // Step 5: Run policy enforcement (if needed - depends on run policy)
  // Note: Policies are enforced at enqueue time, not replay time

  // Step 6: Integrity checks (warnings only)
  performIntegrityChecks(
    toolState,
    validatedExecutions,
    errors,
    artifacts,
    diagnostics
  );

  return {
    toolState,
    executions: validatedExecutions,
    errors,
    artifacts,
    diagnostics,
  };
}

/**
 * Step 1: Load execution snapshots from JSONL
 *
 * Builds map of executionId → latest valid record.
 * Crash-tolerant: Handles truncated lines, schema errors.
 */
async function loadExecutionSnapshots(
  ports: HistoryStorePorts,
  paths: HistoryStorePaths,
  toolId: string
): Promise<{
  executions: Map<string, ExecutionRecordV1>;
  executionDiagnostics: ReplayDiagnostic[];
}> {
  const jsonlPath = paths.tools(toolId).executions.jsonl;
  const diagnostics: ReplayDiagnostic[] = [];

  // Check if file exists
  const exists = await ports.fs.exists(jsonlPath);
  if (!exists) {
    return { executions: new Map(), executionDiagnostics: [] };
  }

  // Read JSONL with crash tolerance
  const { records, diagnostics: jsonlDiags } = await readJsonlTolerant(
    ports.fs,
    jsonlPath,
    validateExecutionRecord
  );

  // Convert JSONL diagnostics to replay diagnostics
  for (const diag of jsonlDiags) {
    diagnostics.push({
      severity: diag.severity,
      code: diag.code as any,
      message: diag.message,
      details: { line: diag.line },
    });
  }

  // Build map: executionId → latest record
  const executions = new Map<string, ExecutionRecordV1>();

  for (const record of records) {
    // Last-line wins for same executionId
    executions.set(record.executionId, record);
  }

  return { executions, executionDiagnostics: diagnostics };
}

/**
 * Load errors from JSONL
 */
async function loadErrors(
  ports: HistoryStorePorts,
  paths: HistoryStorePaths,
  toolId: string
): Promise<{
  errors: Map<string, ExecutionErrorRecordV1>;
  errorDiagnostics: ReplayDiagnostic[];
}> {
  const jsonlPath = paths.tools(toolId).errors.jsonl;
  const diagnostics: ReplayDiagnostic[] = [];

  const exists = await ports.fs.exists(jsonlPath);
  if (!exists) {
    return { errors: new Map(), errorDiagnostics: [] };
  }

  const { records, diagnostics: jsonlDiags } = await readJsonlTolerant(
    ports.fs,
    jsonlPath,
    validateErrorRecord
  );

  for (const diag of jsonlDiags) {
    diagnostics.push({
      severity: diag.severity,
      code: diag.code as any,
      message: diag.message,
      details: { line: diag.line },
    });
  }

  const errors = new Map<string, ExecutionErrorRecordV1>();
  for (const record of records) {
    errors.set(record.executionErrorId, record);
  }

  return { errors, errorDiagnostics: diagnostics };
}

/**
 * Load artifacts by scanning artifact directories
 */
async function loadArtifacts(
  ports: HistoryStorePorts,
  paths: HistoryStorePaths,
  toolId: string
): Promise<{
  artifacts: Map<string, ArtifactManifestV1>;
  artifactDiagnostics: ReplayDiagnostic[];
}> {
  const artifactsRoot = paths.tools(toolId).artifacts.root;
  const diagnostics: ReplayDiagnostic[] = [];
  const artifacts = new Map<string, ArtifactManifestV1>();

  const exists = await ports.fs.exists(artifactsRoot);
  if (!exists) {
    return { artifacts, artifactDiagnostics: diagnostics };
  }

  // List execution IDs
  const executionIds = await ports.fs.readdir(artifactsRoot);

  for (const executionId of executionIds) {
    const manifestPath = paths
      .tools(toolId)
      .artifacts.execution(executionId).manifest;

    try {
      const manifest = await atomicReadJson<ArtifactManifestV1>(
        ports.fs,
        manifestPath
      );

      if (manifest) {
        // Validate schema
        const result = validateArtifactManifest(manifest);
        if (result.valid) {
          artifacts.set(executionId, result.data);
        } else {
          diagnostics.push({
            severity: "warning",
            code: "schema_error",
            message: `Invalid artifact manifest for ${executionId}: ${result.error}`,
          });
        }
      }
    } catch (error: any) {
      diagnostics.push({
        severity: "warning",
        code: "schema_error",
        message: `Failed to load artifact manifest for ${executionId}: ${error.message}`,
      });
    }
  }

  return { artifacts, artifactDiagnostics: diagnostics };
}

/**
 * Step 2: Enforce terminal immutability
 *
 * CONTRACT:
 * - If latest.state is terminal but earlier non-terminal records exist: terminal wins
 * - If latest.state is non-terminal but has endedAt: coerce to failed
 */
function enforceTerminalImmutability(
  executions: Map<string, ExecutionRecordV1>,
  diagnostics: ReplayDiagnostic[]
): Map<string, ExecutionRecordV1> {
  const validated = new Map<string, ExecutionRecordV1>();

  for (const [executionId, record] of executions) {
    const isTerminal = ["completed", "failed", "cancelled"].includes(
      record.state
    );

    // Check for inconsistency: non-terminal but has endedAt
    if (!isTerminal && record.timestamps.endedAt) {
      diagnostics.push({
        severity: "warning",
        code: "terminal_regression",
        message: `Execution ${executionId} is ${record.state} but has endedAt - coercing to failed`,
      });

      // Coerce to failed
      validated.set(executionId, {
        ...record,
        state: "failed",
      });
    } else {
      validated.set(executionId, record);
    }
  }

  return validated;
}

/**
 * Step 3: Convert ExecutionRecordV1 → WorkflowExecution
 */
function convertToWorkflowExecutions(
  records: Map<string, ExecutionRecordV1>,
  errors: Map<string, ExecutionErrorRecordV1>
): Map<string, WorkflowExecution> {
  const executions = new Map<string, WorkflowExecution>();

  for (const [executionId, record] of records) {
    // Map storage state to FSM state
    const state = mapStorageStateToFSM(record.state);

    const execution: WorkflowExecution = {
      id: executionId,
      toolId: record.toolId,
      workflow: "unknown", // Historical records don't have workflow field
      state,
      settings: record.captured.settings,
      spatialInput: record.captured.spatialInput
        ? {
            data: record.captured.spatialInput,
            capturedAt: new Date(record.timestamps.queuedAt),
            revision: record.revision,
          }
        : undefined,
      queuedAt: record.timestamps.queuedAt
        ? new Date(record.timestamps.queuedAt)
        : undefined,
      startedAt: record.timestamps.startedAt
        ? new Date(record.timestamps.startedAt)
        : undefined,
      completedAt:
        ["completed", "failed", "cancelled"].includes(record.state) && record.timestamps.endedAt
          ? new Date(record.timestamps.endedAt)
          : undefined,
      progress: record.progress,
      result: record.result,
      error: record.errorRef.executionErrorId ?? undefined,
      comfyuiPromptId: record.comfyui.promptId ?? undefined,
    };

    executions.set(executionId, execution);
  }

  return executions;
}

/**
 * Map storage state to FSM state
 *
 * Storage uses 5 states, FSM uses 7 (includes idle, armed).
 * Replay always starts from persistent states (queued+).
 */
function mapStorageStateToFSM(
  state: ExecutionRecordV1["state"]
): WorkflowExecutionState {
  // Direct mapping for persistent states
  switch (state) {
    case "queued":
      return "queued";
    case "executing":
      return "executing";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    default:
      // Shouldn't happen if schema validation passed
      return "failed";
  }
}

/**
 * Step 4: Reconstruct ToolExecutionState from executions
 *
 * Derives queuedIds and executingIds from execution states.
 */
function reconstructToolState(
  toolId: string,
  executions: Map<string, WorkflowExecution>
): ToolExecutionState {
  const queuedIds: string[] = [];
  const executingIds: string[] = [];

  for (const [executionId, execution] of executions) {
    if (execution.state === "queued") {
      queuedIds.push(executionId);
    } else if (execution.state === "executing") {
      executingIds.push(executionId);
    }
  }

  // Sort queued by (queuedAt, executionId) for determinism
  queuedIds.sort((a, b) => {
    const execA = executions.get(a)!;
    const execB = executions.get(b)!;

    // Primary: queuedAt ascending
    const tDiff =
      (execA.queuedAt?.getTime() ?? 0) - (execB.queuedAt?.getTime() ?? 0);
    if (tDiff !== 0) return tDiff;

    // Tie-break: executionId lex ascending
    return a.localeCompare(b);
  });

  return {
    toolId,
    executions,
    queuedIds,
    executingIds,
  };
}

/**
 * Step 6: Integrity checks (warnings only)
 */
function performIntegrityChecks(
  toolState: ToolExecutionState,
  executions: Map<string, ExecutionRecordV1>,
  errors: Map<string, ExecutionErrorRecordV1>,
  artifacts: Map<string, ArtifactManifestV1>,
  diagnostics: ReplayDiagnostic[]
): void {
  // Check for missing error references
  for (const [executionId, record] of executions) {
    if (record.errorRef.executionErrorId) {
      if (!errors.has(record.errorRef.executionErrorId)) {
        diagnostics.push({
          severity: "warning",
          code: "missing_artifact",
          message: `Execution ${executionId} references missing error ${record.errorRef.executionErrorId}`,
        });
      }
    }
  }

  // Check for orphaned artifacts
  for (const [artifactExecutionId, _manifest] of artifacts) {
    if (!executions.has(artifactExecutionId)) {
      diagnostics.push({
        severity: "warning",
        code: "orphaned_artifact",
        message: `Artifact for ${artifactExecutionId} has no execution record`,
      });
    }
  }
}
