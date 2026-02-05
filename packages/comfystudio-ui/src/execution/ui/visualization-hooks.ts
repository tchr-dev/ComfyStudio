/**
 * Execution Visualization Hooks
 *
 * React hooks for observing execution visual state on canvas.
 * Read-only - derives visual state from execution snapshots.
 *
 * Milestone: M4.3 - Execution Visualization
 */

import { useMemo } from "react";
import { useExecutionState } from "./hooks";
import {
  getActiveOverlays,
  getOverlaysForTool,
  getOverlay,
  type ExecutionOverlay,
} from "./visualization";

// ============================================================================
// Hooks
// ============================================================================

/**
 * Use all active execution overlays for canvas visualization
 *
 * Returns overlays for queued, executing, and recently completed executions.
 * Automatically updates when execution state changes.
 *
 * @param completedTimeoutMs - Hide completed after N milliseconds (default: 3000)
 * @returns Array of execution overlays
 */
export function useExecutionOverlays(
  completedTimeoutMs: number = 3000
): ExecutionOverlay[] {
  const state = useExecutionState();

  return useMemo(() => {
    return getActiveOverlays(state, completedTimeoutMs);
  }, [state, completedTimeoutMs]);
}

/**
 * Use execution overlays for a specific tool
 *
 * @param toolId - Tool ID to filter by
 * @returns Array of execution overlays for this tool
 */
export function useToolOverlays(toolId: string): ExecutionOverlay[] {
  const state = useExecutionState();

  return useMemo(() => {
    return getOverlaysForTool(state, toolId);
  }, [state, toolId]);
}

/**
 * Use overlay for a specific execution
 *
 * @param toolId - Tool ID
 * @param executionId - Execution ID
 * @returns Execution overlay or null if not found
 */
export function useExecutionOverlay(
  toolId: string,
  executionId: string
): ExecutionOverlay | null {
  const state = useExecutionState();

  return useMemo(() => {
    return getOverlay(state, toolId, executionId);
  }, [state, toolId, executionId]);
}

/**
 * Use count of active executions (queued + executing)
 *
 * Useful for showing "N jobs running" indicators.
 *
 * @returns Count of active executions
 */
export function useActiveExecutionCount(): number {
  const overlays = useExecutionOverlays(0); // Don't include completed

  return useMemo(() => {
    return overlays.filter(
      (overlay) => overlay.state === "queued" || overlay.state === "executing"
    ).length;
  }, [overlays]);
}

/**
 * Use whether any executions are active
 *
 * @returns True if any executions are queued or executing
 */
export function useHasActiveExecutions(): boolean {
  const count = useActiveExecutionCount();
  return count > 0;
}

/**
 * Use overlays with spatial bounds (for canvas rendering)
 *
 * Filters to only executions that have spatial bounds to display.
 *
 * @returns Array of overlays with bounds
 */
export function useSpatialOverlays(): ExecutionOverlay[] {
  const overlays = useExecutionOverlays();

  return useMemo(() => {
    return overlays.filter((overlay) => overlay.bounds !== undefined);
  }, [overlays]);
}
