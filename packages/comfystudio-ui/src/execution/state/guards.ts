/**
 * Workflow Execution Guards
 *
 * Pre-condition checks for state operations.
 * Guards enforce invariants before mutations occur.
 *
 * Milestone: M1.1 - FSM Core
 */

import type { WorkflowExecution, WorkflowTool, ToolExecutionState } from "../types";
import { isTerminal, isActive } from "./fsm";

/**
 * Check if execution is in a state that allows cancellation
 */
export function canCancel(execution: WorkflowExecution): boolean {
  return execution.state === "queued" || execution.state === "executing";
}

/**
 * Check if execution can accept progress updates
 */
export function canUpdateProgress(execution: WorkflowExecution): boolean {
  return execution.state === "executing";
}

/**
 * Check if execution can be completed
 */
export function canComplete(execution: WorkflowExecution): boolean {
  return execution.state === "executing";
}

/**
 * Check if execution can fail
 */
export function canFail(execution: WorkflowExecution): boolean {
  return execution.state === "queued" || execution.state === "executing";
}

/**
 * Check if tool can queue a new execution based on run policy
 */
export function canEnqueue(
  tool: WorkflowTool,
  toolState: ToolExecutionState
): { allowed: boolean; reason?: string } {
  const policy = tool.runPolicy ?? "parallel";

  switch (policy) {
    case "single": {
      // Only one execution total (queued, executing, or completed)
      const hasActive = toolState.queuedIds.length > 0 || toolState.executingIds.length > 0;

      if (hasActive) {
        return { allowed: false, reason: "single policy: execution already active" };
      }

      // Also check if there's a completed execution that hasn't been dismissed
      if (toolState.activeExecutionId) {
        const exec = toolState.executions.get(toolState.activeExecutionId);
        if (exec && isTerminal(exec.state)) {
          return { allowed: false, reason: "single policy: terminal execution not dismissed" };
        }
      }

      return { allowed: true };
    }

    case "replace":
      // Always allowed - will cancel previous and clear queue
      return { allowed: true };

    case "parallel":
      // Always allowed - unlimited concurrent executions
      return { allowed: true };

    case "queue": {
      // Always allowed - will add to FIFO queue
      return { allowed: true };
    }

    default:
      return { allowed: false, reason: `unknown run policy: ${policy}` };
  }
}

/**
 * Check if spatial input is stale (already queued)
 */
export function isStaleInput(
  tool: WorkflowTool,
  toolState: ToolExecutionState
): boolean {
  if (tool.triggerMode !== "interaction" || !tool.requiresSpatialInput) {
    return false; // Stale check only applies to interaction tools
  }

  const currentRevision = toolState.currentSpatialInput?.revision;
  const lastQueued = toolState.lastQueuedRevision;

  if (currentRevision === undefined) {
    return false; // No spatial input captured yet
  }

  if (lastQueued === undefined) {
    return false; // No execution queued yet
  }

  // Stale if current revision is not newer than last queued
  return currentRevision <= lastQueued;
}

/**
 * Check if tool requires spatial input and it's present
 */
export function hasSpatialInput(
  tool: WorkflowTool,
  toolState: ToolExecutionState
): { satisfied: boolean; reason?: string } {
  if (!tool.requiresSpatialInput) {
    return { satisfied: true };
  }

  if (!toolState.currentSpatialInput) {
    return { satisfied: false, reason: "spatial input required but not captured" };
  }

  if (toolState.currentSpatialInput.data.type !== tool.spatialInputType) {
    return {
      satisfied: false,
      reason: `spatial input type mismatch: expected ${tool.spatialInputType}, got ${toolState.currentSpatialInput.data.type}`,
    };
  }

  return { satisfied: true };
}

/**
 * Check if queue can advance (has queued execution and capacity)
 */
export function canAdvanceQueue(
  tool: WorkflowTool,
  toolState: ToolExecutionState
): boolean {
  const policy = tool.runPolicy ?? "parallel";

  if (toolState.queuedIds.length === 0) {
    return false; // No queued executions
  }

  switch (policy) {
    case "single":
      // Can advance if no executing
      return toolState.executingIds.length === 0;

    case "queue":
      // Can advance if no executing (FIFO - one at a time)
      return toolState.executingIds.length === 0;

    case "parallel":
    case "replace":
      // Can always advance
      return true;

    default:
      return false;
  }
}
