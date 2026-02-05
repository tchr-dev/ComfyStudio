/**
 * Execution Progress Hooks
 *
 * React hooks for observing execution progress.
 * Deterministic - no animations, pure state-driven display.
 *
 * Milestone: M4.4 - Progress Indicators
 */

import { useMemo } from "react";
import { useExecutionState } from "./hooks";
import {
  getActiveProgress,
  getProgress,
  getToolProgress,
  aggregateProgress,
  type ExecutionProgress,
} from "./progress";

// ============================================================================
// Hooks
// ============================================================================

/**
 * Use progress for all active executions
 *
 * Returns progress for queued and executing jobs only.
 * Terminal states are excluded.
 *
 * @returns Array of execution progress
 */
export function useActiveProgress(): ExecutionProgress[] {
  const state = useExecutionState();

  return useMemo(() => {
    return getActiveProgress(state);
  }, [state]);
}

/**
 * Use progress for a specific execution
 *
 * @param toolId - Tool ID
 * @param executionId - Execution ID
 * @returns Execution progress or null if not found
 */
export function useExecutionProgress(
  toolId: string,
  executionId: string
): ExecutionProgress | null {
  const state = useExecutionState();

  return useMemo(() => {
    return getProgress(state, toolId, executionId);
  }, [state, toolId, executionId]);
}

/**
 * Use progress for all executions of a specific tool
 *
 * @param toolId - Tool ID
 * @returns Array of execution progress for this tool
 */
export function useToolProgress(toolId: string): ExecutionProgress[] {
  const state = useExecutionState();

  return useMemo(() => {
    return getToolProgress(state, toolId);
  }, [state, toolId]);
}

/**
 * Use aggregated progress summary
 *
 * Returns overall progress across all active executions.
 * Useful for "N of M jobs complete" indicators.
 *
 * @returns Aggregated progress summary
 */
export function useAggregatedProgress(): {
  total: number;
  queued: number;
  executing: number;
  completed: number;
  failed: number;
  cancelled: number;
  averageProgress?: number;
} {
  const progress = useActiveProgress();

  return useMemo(() => {
    return aggregateProgress(progress);
  }, [progress]);
}

/**
 * Use overall progress percentage
 *
 * Returns average progress across all active executions.
 * Undefined if no executions have progress data.
 *
 * @returns Average progress (0-100) or undefined
 */
export function useOverallProgress(): number | undefined {
  const summary = useAggregatedProgress();
  return summary.averageProgress;
}

/**
 * Use whether any jobs are running
 *
 * @returns True if any executions are queued or executing
 */
export function useIsExecuting(): boolean {
  const summary = useAggregatedProgress();
  return summary.queued > 0 || summary.executing > 0;
}

/**
 * Use active job count
 *
 * @returns Number of queued + executing jobs
 */
export function useActiveJobCount(): number {
  const summary = useAggregatedProgress();
  return summary.queued + summary.executing;
}
