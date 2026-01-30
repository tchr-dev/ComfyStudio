/**
 * Execution Progress Utilities
 *
 * Derives deterministic progress state from execution data.
 * No animations or estimations - pure state-driven progress.
 *
 * Milestone: M4.4 - Progress Indicators
 */

import type { WorkflowExecution } from "../types";
import type { ExecutionStateSnapshot } from "../service";

// ============================================================================
// Progress Types
// ============================================================================

/**
 * Progress state for an execution
 */
export type ExecutionProgress = {
  /**
   * Execution ID
   */
  executionId: string;

  /**
   * Tool ID
   */
  toolId: string;

  /**
   * Current state
   */
  state: WorkflowExecution["state"];

  /**
   * Progress percentage (0-100)
   * - undefined: No progress available
   * - 0: Just started
   * - 1-99: In progress
   * - 100: Completed
   */
  progress?: number;

  /**
   * Progress phase (human-readable)
   */
  phase: ProgressPhase;

  /**
   * Elapsed time in milliseconds (since queuedAt)
   */
  elapsedMs?: number;

  /**
   * Is complete (terminal state reached)
   */
  isComplete: boolean;

  /**
   * Error message (if failed)
   */
  error?: string;
};

/**
 * Progress phase (derived from state)
 */
export type ProgressPhase =
  | "idle"
  | "queued"
  | "executing"
  | "completed"
  | "failed"
  | "cancelled";

// ============================================================================
// Progress Queries
// ============================================================================

/**
 * Get progress for all active executions
 *
 * Returns progress for queued and executing jobs.
 * Terminal states are excluded.
 *
 * @param snapshot - Execution state snapshot
 * @returns Array of execution progress
 */
export function getActiveProgress(
  snapshot: ExecutionStateSnapshot | null
): ExecutionProgress[] {
  if (!snapshot) {
    return [];
  }

  const progress: ExecutionProgress[] = [];

  for (const [toolId, executions] of snapshot.executionsByTool) {
    for (const [executionId, execution] of executions) {
      // Only include queued and executing
      if (execution.state === "queued" || execution.state === "executing") {
        const prog = executionToProgress(toolId, executionId, execution);
        progress.push(prog);
      }
    }
  }

  return progress;
}

/**
 * Get progress for a specific execution
 *
 * @param snapshot - Execution state snapshot
 * @param toolId - Tool ID
 * @param executionId - Execution ID
 * @returns Execution progress or null if not found
 */
export function getProgress(
  snapshot: ExecutionStateSnapshot | null,
  toolId: string,
  executionId: string
): ExecutionProgress | null {
  if (!snapshot) {
    return null;
  }

  const executions = snapshot.executionsByTool.get(toolId);
  if (!executions) {
    return null;
  }

  const execution = executions.get(executionId);
  if (!execution) {
    return null;
  }

  return executionToProgress(toolId, executionId, execution);
}

/**
 * Get progress for a specific tool (all executions)
 *
 * @param snapshot - Execution state snapshot
 * @param toolId - Tool ID
 * @returns Array of execution progress for this tool
 */
export function getToolProgress(
  snapshot: ExecutionStateSnapshot | null,
  toolId: string
): ExecutionProgress[] {
  if (!snapshot) {
    return [];
  }

  const executions = snapshot.executionsByTool.get(toolId);
  if (!executions) {
    return [];
  }

  const progress: ExecutionProgress[] = [];

  for (const [executionId, execution] of executions) {
    if (execution.state !== "idle") {
      const prog = executionToProgress(toolId, executionId, execution);
      progress.push(prog);
    }
  }

  return progress;
}

// ============================================================================
// Progress Aggregation
// ============================================================================

/**
 * Aggregate progress for multiple executions
 *
 * Returns overall progress across all executions.
 * Useful for "N of M jobs complete" indicators.
 *
 * @param progress - Array of execution progress
 * @returns Aggregated progress summary
 */
export function aggregateProgress(progress: ExecutionProgress[]): {
  total: number;
  queued: number;
  executing: number;
  completed: number;
  failed: number;
  cancelled: number;
  averageProgress?: number; // Average of executions with progress data
} {
  const summary = {
    total: progress.length,
    queued: 0,
    executing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    averageProgress: undefined as number | undefined,
  };

  let progressSum = 0;
  let progressCount = 0;

  for (const prog of progress) {
    switch (prog.state) {
      case "queued":
        summary.queued++;
        break;
      case "executing":
        summary.executing++;
        break;
      case "completed":
        summary.completed++;
        break;
      case "failed":
        summary.failed++;
        break;
      case "cancelled":
        summary.cancelled++;
        break;
    }

    if (prog.progress !== undefined) {
      progressSum += prog.progress;
      progressCount++;
    }
  }

  if (progressCount > 0) {
    summary.averageProgress = progressSum / progressCount;
  }

  return summary;
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Convert execution to progress state
 */
function executionToProgress(
  toolId: string,
  executionId: string,
  execution: WorkflowExecution
): ExecutionProgress {
  const progress: ExecutionProgress = {
    executionId,
    toolId,
    state: execution.state,
    progress: execution.progress,
    phase: stateToPhase(execution.state),
    isComplete: isTerminalState(execution.state),
    error: execution.error,
  };

  // Calculate elapsed time
  if (execution.queuedAt) {
    const now = new Date();
    const completedAt = execution.completedAt || now;
    progress.elapsedMs = completedAt.getTime() - execution.queuedAt.getTime();
  }

  return progress;
}

/**
 * Map execution state to progress phase
 */
function stateToPhase(state: WorkflowExecution["state"]): ProgressPhase {
  // Direct mapping (same values)
  return state as ProgressPhase;
}

/**
 * Check if state is terminal
 */
function isTerminalState(state: WorkflowExecution["state"]): boolean {
  return state === "completed" || state === "failed" || state === "cancelled";
}

// ============================================================================
// Progress Formatting
// ============================================================================

/**
 * Format progress percentage as string
 *
 * @param progress - Progress percentage (0-100)
 * @returns Formatted string (e.g., "45%")
 */
export function formatProgress(progress: number | undefined): string {
  if (progress === undefined) {
    return "—";
  }

  return `${Math.round(progress)}%`;
}

/**
 * Format elapsed time as human-readable string
 *
 * @param elapsedMs - Elapsed time in milliseconds
 * @returns Formatted string (e.g., "1m 23s", "45s", "2.3s")
 */
export function formatElapsedTime(elapsedMs: number | undefined): string {
  if (elapsedMs === undefined) {
    return "—";
  }

  const totalSeconds = elapsedMs / 1000;
  const seconds = Math.floor(totalSeconds);
  const minutes = Math.floor(seconds / 60);

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else if (totalSeconds >= 2) {
    // 2+ seconds: show integer seconds
    return `${seconds}s`;
  } else {
    // < 2 seconds: show decimal
    return `${totalSeconds.toFixed(1)}s`;
  }
}

/**
 * Format phase as human-readable label
 */
export function formatPhase(phase: ProgressPhase): string {
  switch (phase) {
    case "idle":
      return "Idle";
    case "queued":
      return "Queued";
    case "executing":
      return "Executing";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      // Exhaustive check
      const _: never = phase;
      return "Unknown";
  }
}

/**
 * Get progress bar color class (Tailwind)
 *
 * @param state - Execution state
 * @returns Tailwind color class
 */
export function getProgressColor(state: WorkflowExecution["state"]): string {
  switch (state) {
    case "idle":
      return "bg-slate-400";
    case "queued":
      return "bg-amber-400";
    case "executing":
      return "bg-blue-500";
    case "completed":
      return "bg-green-500";
    case "failed":
      return "bg-red-500";
    case "cancelled":
      return "bg-gray-400";
    default:
      // Exhaustive check
      const _: never = state;
      return "bg-gray-300";
  }
}
