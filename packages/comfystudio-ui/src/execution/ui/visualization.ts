/**
 * Execution Visualization Utilities
 *
 * Derives visual state from execution state for read-only canvas overlays.
 * All state is computed from execution snapshots - no local mutations.
 *
 * Milestone: M4.3 - Execution Visualization
 */

import type { WorkflowExecution } from "../types";
import type { ExecutionStateSnapshot } from "../service";

// ============================================================================
// Visual State Types
// ============================================================================

/**
 * Visual indicator for execution state
 */
export type ExecutionVisualState =
  | "idle"
  | "queued"
  | "executing"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Color scheme for execution states
 */
export const EXECUTION_COLORS: Record<ExecutionVisualState, string> = {
  idle: "#94a3b8", // slate-400
  queued: "#fbbf24", // amber-400
  executing: "#3b82f6", // blue-500
  completed: "#22c55e", // green-500
  failed: "#ef4444", // red-500
  cancelled: "#9ca3af", // gray-400
};

/**
 * Execution overlay for canvas visualization
 */
export type ExecutionOverlay = {
  /**
   * Execution ID
   */
  executionId: string;

  /**
   * Tool ID
   */
  toolId: string;

  /**
   * Visual state (for color coding)
   */
  state: ExecutionVisualState;

  /**
   * Progress percentage (0-100, undefined if not available)
   */
  progress?: number;

  /**
   * Spatial bounds (if execution has spatial input)
   * Normalized coordinates (0-1 range)
   */
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  /**
   * Error message (if failed)
   */
  error?: string;

  /**
   * Timestamps
   */
  queuedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
};

// ============================================================================
// Visualization Queries
// ============================================================================

/**
 * Get all active execution overlays for canvas visualization
 *
 * Returns overlays for:
 * - Queued executions (waiting to start)
 * - Executing jobs (currently running)
 * - Recently completed (for brief feedback)
 *
 * Completed/failed executions are excluded after a timeout to prevent clutter.
 *
 * @param snapshot - Execution state snapshot
 * @param completedTimeoutMs - Hide completed after N milliseconds (default: 3000)
 * @returns Array of execution overlays for rendering
 */
export function getActiveOverlays(
  snapshot: ExecutionStateSnapshot | null,
  completedTimeoutMs: number = 3000
): ExecutionOverlay[] {
  if (!snapshot) {
    return [];
  }

  const overlays: ExecutionOverlay[] = [];
  const now = new Date();

  for (const [toolId, executions] of snapshot.executionsByTool) {
    for (const [executionId, execution] of executions) {
      // Skip idle executions (no visual feedback needed)
      if (execution.state === "idle") {
        continue;
      }

      // Skip old completed/failed/cancelled executions
      if (
        execution.completedAt &&
        now.getTime() - execution.completedAt.getTime() > completedTimeoutMs
      ) {
        continue;
      }

      const overlay = executionToOverlay(toolId, executionId, execution);
      overlays.push(overlay);
    }
  }

  return overlays;
}

/**
 * Get overlays for a specific tool
 *
 * @param snapshot - Execution state snapshot
 * @param toolId - Tool ID to filter by
 * @returns Array of execution overlays for this tool
 */
export function getOverlaysForTool(
  snapshot: ExecutionStateSnapshot | null,
  toolId: string
): ExecutionOverlay[] {
  if (!snapshot) {
    return [];
  }

  const executions = snapshot.executionsByTool.get(toolId);
  if (!executions) {
    return [];
  }

  const overlays: ExecutionOverlay[] = [];

  for (const [executionId, execution] of executions) {
    if (execution.state !== "idle") {
      const overlay = executionToOverlay(toolId, executionId, execution);
      overlays.push(overlay);
    }
  }

  return overlays;
}

/**
 * Get overlay for a specific execution
 *
 * @param snapshot - Execution state snapshot
 * @param toolId - Tool ID
 * @param executionId - Execution ID
 * @returns Execution overlay or null if not found
 */
export function getOverlay(
  snapshot: ExecutionStateSnapshot | null,
  toolId: string,
  executionId: string
): ExecutionOverlay | null {
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

  return executionToOverlay(toolId, executionId, execution);
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Convert execution to overlay for visualization
 */
function executionToOverlay(
  toolId: string,
  executionId: string,
  execution: WorkflowExecution
): ExecutionOverlay {
  // Map "armed" state to "queued" for visualization (they're visually similar)
  const visualState: ExecutionVisualState =
    execution.state === "armed" ? "queued" : execution.state;

  const overlay: ExecutionOverlay = {
    executionId,
    toolId,
    state: visualState,
    progress: execution.progress,
    error: execution.error,
    queuedAt: execution.queuedAt,
    startedAt: execution.startedAt,
    completedAt: execution.completedAt,
  };

  // Extract spatial bounds if available
  if (execution.spatialInput) {
    const spatial = execution.spatialInput.data;

    // Only selection and mask have bounds for visualization
    if (spatial.type === "selection") {
      overlay.bounds = {
        x: spatial.data.x,
        y: spatial.data.y,
        width: spatial.data.width,
        height: spatial.data.height,
      };
    } else if (spatial.type === "mask") {
      overlay.bounds = {
        x: spatial.data.bounds.x,
        y: spatial.data.bounds.y,
        width: spatial.data.bounds.width,
        height: spatial.data.bounds.height,
      };
    }
    // Point and image don't have bounds for overlay
  }

  return overlay;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get color for execution state
 */
export function getStateColor(state: ExecutionVisualState): string {
  return EXECUTION_COLORS[state];
}

/**
 * Check if execution is in progress (queued or executing)
 */
export function isExecutionInProgress(state: ExecutionVisualState): boolean {
  return state === "queued" || state === "executing";
}

/**
 * Check if execution is terminal (completed, failed, cancelled)
 */
export function isExecutionTerminal(state: ExecutionVisualState): boolean {
  return state === "completed" || state === "failed" || state === "cancelled";
}

/**
 * Get human-readable state label
 */
export function getStateLabel(state: ExecutionVisualState): string {
  switch (state) {
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
      const _: never = state;
      return "Unknown";
  }
}
