/**
 * Workflow Execution Queue Management
 *
 * Queue operations for per-tool execution tracking.
 * Handles adding, removing, and reordering executions based on run policies.
 *
 * Milestone: M1.2 - Queue-First + Run Policies
 */

import type {
  WorkflowExecution,
  WorkflowTool,
  ToolExecutionState,
  SpatialInputSnapshot,
  WorkflowExecutionState,
} from "../types";
import * as ops from "./ops";
import * as guards from "./guards";

/**
 * Create a new execution record with given settings.
 * Does not enqueue - just creates the record.
 */
export function createExecution(
  toolId: string,
  workflow: string,
  settings: Record<string, any>,
  spatialInput?: SpatialInputSnapshot
): WorkflowExecution {
  const id = crypto.randomUUID();

  return {
    id,
    toolId,
    state: "idle",
    workflow,
    settings,
    spatialInput,
  };
}

/**
 * Add execution to tool state and enqueue it according to run policy.
 * Returns the execution ID, or null if enqueue was rejected.
 */
export function enqueueRun(
  tool: WorkflowTool,
  toolState: ToolExecutionState,
  settings: Record<string, any>,
  spatialInput?: SpatialInputSnapshot
): WorkflowExecution | null {
  // Check if enqueue is allowed by run policy
  const canEnq = guards.canEnqueue(tool, toolState);
  if (!canEnq.allowed) {
    console.warn(`[queue] Enqueue rejected: ${canEnq.reason}`);
    return null;
  }

  // Check spatial input requirements
  if (tool.requiresSpatialInput) {
    if (!spatialInput) {
      console.warn(`[queue] Spatial input required but not provided`);
      return null;
    }

    if (spatialInput.data.type !== tool.spatialInputType) {
      console.warn(
        `[queue] Spatial input type mismatch: expected ${tool.spatialInputType}, got ${spatialInput.data.type}`
      );
      return null;
    }

    // Check for stale input (interaction tools only)
    if (guards.isStaleInput(tool, toolState)) {
      console.warn(`[queue] Stale input detected - skipping enqueue`);
      return null;
    }
  }

  // Apply run policy behavior
  const policy = tool.runPolicy ?? "parallel";

  switch (policy) {
    case "replace":
      // Cancel all queued and executing, then enqueue new
      cancelAll(toolState, "replaced by new execution");
      break;

    case "single":
      // Already checked by canEnqueue - should not reach here if blocked
      break;

    case "parallel":
    case "queue":
      // Just add to queue (queue policy limits concurrency via advanceQueue)
      break;
  }

  // Create and enqueue execution
  const execution = createExecution(tool.id, tool.workflow, settings, spatialInput);

  // Enqueue the execution
  ops.enqueueExecution(execution, settings, spatialInput);

  // Add to tool state
  toolState.executions.set(execution.id, execution);
  toolState.queuedIds.push(execution.id);

  // For single/replace policies, track as active execution
  if (policy === "single" || policy === "replace") {
    toolState.activeExecutionId = execution.id;
  }

  // Update last queued revision (for stale prevention)
  if (spatialInput) {
    toolState.lastQueuedRevision = spatialInput.revision;
  }

  return execution;
}

/**
 * Cancel all executions in tool state (queued and executing).
 */
export function cancelAll(
  toolState: ToolExecutionState,
  reason: string
): string[] {
  const cancelledIds: string[] = [];

  // Cancel all queued
  for (const id of toolState.queuedIds) {
    const exec = toolState.executions.get(id);
    if (exec && guards.canCancel(exec)) {
      ops.cancelExecution(exec, reason);
      cancelledIds.push(id);
    }
  }

  // Cancel all executing
  for (const id of toolState.executingIds) {
    const exec = toolState.executions.get(id);
    if (exec && guards.canCancel(exec)) {
      ops.cancelExecution(exec, reason);
      cancelledIds.push(id);
    }
  }

  // Clear queues
  toolState.queuedIds = [];
  toolState.executingIds = [];

  return cancelledIds;
}

/**
 * Remove execution from queues (after terminal state).
 * Does not mutate the execution itself - just removes from tracking.
 */
export function removeFromQueues(
  toolState: ToolExecutionState,
  executionId: string
): void {
  // Remove from queued
  const qIndex = toolState.queuedIds.indexOf(executionId);
  if (qIndex !== -1) {
    toolState.queuedIds.splice(qIndex, 1);
  }

  // Remove from executing
  const eIndex = toolState.executingIds.indexOf(executionId);
  if (eIndex !== -1) {
    toolState.executingIds.splice(eIndex, 1);
  }
}

/**
 * Get execution by ID from tool state.
 */
export function getExecution(
  toolState: ToolExecutionState,
  executionId: string
): WorkflowExecution | undefined {
  return toolState.executions.get(executionId);
}

/**
 * Get all executions in a given state.
 */
export function getExecutionsByState(
  toolState: ToolExecutionState,
  state: WorkflowExecutionState
): WorkflowExecution[] {
  const results: WorkflowExecution[] = [];

  for (const exec of Array.from(toolState.executions.values())) {
    if (exec.state === state) {
      results.push(exec);
    }
  }

  return results;
}

/**
 * Get queued executions in order.
 */
export function getQueuedExecutions(
  toolState: ToolExecutionState
): WorkflowExecution[] {
  return toolState.queuedIds
    .map((id) => toolState.executions.get(id))
    .filter((exec): exec is WorkflowExecution => exec !== undefined);
}

/**
 * Get executing executions.
 */
export function getExecutingExecutions(
  toolState: ToolExecutionState
): WorkflowExecution[] {
  return toolState.executingIds
    .map((id) => toolState.executions.get(id))
    .filter((exec): exec is WorkflowExecution => exec !== undefined);
}
