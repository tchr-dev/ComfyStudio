/**
 * Workflow Execution State Machine
 *
 * Pure FSM implementation - monotonic state transitions with invariants.
 * No I/O, no side effects - just deterministic state changes.
 *
 * State flow: idle → armed → queued → executing → (completed | failed | cancelled)
 *
 * Milestone: M1.1 - FSM Core
 */

import type { WorkflowExecutionState } from "../types";

/**
 * Valid state transitions (directed graph).
 * Terminal states can only transition to idle (reset).
 */
export const VALID_TRANSITIONS: Record<
  WorkflowExecutionState,
  WorkflowExecutionState[]
> = {
  idle: ["armed", "queued"],                    // Can arm or queue directly
  armed: ["queued", "idle"],                    // Can queue or reset
  queued: ["executing", "cancelled", "idle"],   // Can start, cancel, or reset
  executing: ["completed", "failed", "cancelled"], // Must reach terminal
  completed: ["idle"],                          // Terminal: reset only
  failed: ["idle"],                             // Terminal: reset only
  cancelled: ["idle"],                          // Terminal: reset only
};

/**
 * Check if a state is terminal (requires user action to reset)
 */
export function isTerminal(state: WorkflowExecutionState): boolean {
  return (
    state === "completed" || state === "failed" || state === "cancelled"
  );
}

/**
 * Check if a state is active (executing or waiting to execute)
 */
export function isActive(state: WorkflowExecutionState): boolean {
  return state === "queued" || state === "executing";
}

/**
 * Check if transition from `from` to `to` is valid
 */
export function canTransition(
  from: WorkflowExecutionState,
  to: WorkflowExecutionState
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Validate state transition and throw if invalid.
 * Used by core operations to enforce FSM invariants.
 */
export function assertTransition(
  from: WorkflowExecutionState,
  to: WorkflowExecutionState,
  context?: string
): void {
  if (!canTransition(from, to)) {
    const msg = context
      ? `Invalid transition ${from} → ${to} (${context})`
      : `Invalid transition ${from} → ${to}`;
    throw new Error(msg);
  }
}

/**
 * Get next allowed states from current state
 */
export function nextStates(
  state: WorkflowExecutionState
): WorkflowExecutionState[] {
  return VALID_TRANSITIONS[state] ?? [];
}
