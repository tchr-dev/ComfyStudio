/**
 * Workflow Execution Core Operations
 *
 * Pure state mutations implementing the contract operations.
 * All mutations are guarded by FSM invariants and pre-conditions.
 *
 * Milestone: M1.1 - FSM Core
 */

import type {
  WorkflowExecution,
  WorkflowTool,
  ToolExecutionState,
  SpatialInputSnapshot,
} from "../types";
import { assertTransition } from "./fsm";
import * as guards from "./guards";

/**
 * Arm execution with spatial input (spatial tools only).
 * Transitions: idle → armed
 */
export function armExecution(
  execution: WorkflowExecution,
  spatialInput: SpatialInputSnapshot
): void {
  assertTransition(execution.state, "armed", "armExecution");

  execution.state = "armed";
  execution.spatialInput = spatialInput;
}

/**
 * Enqueue execution (transition to queued state).
 * Captures settings and spatial input immutably.
 *
 * Transitions:
 * - idle → queued (non-spatial tools)
 * - armed → queued (spatial tools)
 */
export function enqueueExecution(
  execution: WorkflowExecution,
  settings: Record<string, any>,
  spatialInput?: SpatialInputSnapshot
): void {
  const from = execution.state;
  assertTransition(from, "queued", "enqueueExecution");

  execution.state = "queued";
  execution.settings = settings;
  execution.queuedAt = new Date();

  if (spatialInput) {
    execution.spatialInput = spatialInput;
  }
}

/**
 * Start execution (transition to executing state).
 * Typically called by runner when ComfyUI accepts the job.
 *
 * Transitions: queued → executing
 */
export function startExecution(
  execution: WorkflowExecution,
  comfyuiPromptId?: string
): void {
  assertTransition(execution.state, "executing", "startExecution");

  execution.state = "executing";
  execution.startedAt = new Date();
  execution.comfyuiPromptId = comfyuiPromptId;
  execution.progress = 0;
}

/**
 * Update execution progress (0-100).
 * Only valid in executing state.
 */
export function markProgress(
  execution: WorkflowExecution,
  progress: number
): void {
  if (!guards.canUpdateProgress(execution)) {
    throw new Error(
      `Cannot update progress in ${execution.state} state (must be executing)`
    );
  }

  if (progress < 0 || progress > 100) {
    throw new Error(`Invalid progress value: ${progress} (must be 0-100)`);
  }

  execution.progress = progress;
}

/**
 * Complete execution successfully.
 * Transitions: executing → completed
 */
export function completeExecution(
  execution: WorkflowExecution,
  result: any
): void {
  if (!guards.canComplete(execution)) {
    throw new Error(
      `Cannot complete in ${execution.state} state (must be executing)`
    );
  }

  assertTransition(execution.state, "completed", "completeExecution");

  execution.state = "completed";
  execution.completedAt = new Date();
  execution.result = result;
  execution.progress = 100;
}

/**
 * Fail execution with error message.
 * Transitions: queued → failed OR executing → failed
 */
export function failExecution(
  execution: WorkflowExecution,
  error: string
): void {
  if (!guards.canFail(execution)) {
    throw new Error(
      `Cannot fail in ${execution.state} state (must be queued or executing)`
    );
  }

  assertTransition(execution.state, "failed", "failExecution");

  execution.state = "failed";
  execution.completedAt = new Date();
  execution.error = error;
}

/**
 * Cancel execution (user-initiated or policy-driven).
 * Transitions: queued → cancelled OR executing → cancelled
 */
export function cancelExecution(
  execution: WorkflowExecution,
  reason?: string
): void {
  if (!guards.canCancel(execution)) {
    throw new Error(
      `Cannot cancel in ${execution.state} state (must be queued or executing)`
    );
  }

  assertTransition(execution.state, "cancelled", "cancelExecution");

  execution.state = "cancelled";
  execution.completedAt = new Date();
  execution.error = reason ?? "Cancelled by user";
}

/**
 * Reset execution to idle (dismiss terminal state).
 * Transitions: (completed | failed | cancelled) → idle
 */
export function resetExecution(execution: WorkflowExecution): void {
  assertTransition(execution.state, "idle", "resetExecution");

  execution.state = "idle";
  // Keep historical data (timestamps, results) but execution can be reused
}

/**
 * Advance queue - move next queued execution to executing.
 * Returns the execution that was started, or null if nothing to start.
 */
export function advanceQueue(
  tool: WorkflowTool,
  toolState: ToolExecutionState
): WorkflowExecution | null {
  if (!guards.canAdvanceQueue(tool, toolState)) {
    return null;
  }

  // Get next queued execution
  const nextId = toolState.queuedIds[0];
  if (!nextId) {
    return null;
  }

  const execution = toolState.executions.get(nextId);
  if (!execution) {
    // Queue corrupted - remove the bad ID
    toolState.queuedIds.shift();
    return null;
  }

  // Move from queued to executing
  toolState.queuedIds.shift();
  toolState.executingIds.push(nextId);

  // Transition state
  startExecution(execution);

  return execution;
}

/**
 * Remove execution from executing list (called after terminal transition).
 * This is needed to unblock the queue for queue/single policies.
 */
export function removeFromExecuting(
  toolState: ToolExecutionState,
  executionId: string
): void {
  const index = toolState.executingIds.indexOf(executionId);
  if (index !== -1) {
    toolState.executingIds.splice(index, 1);
  }
}
