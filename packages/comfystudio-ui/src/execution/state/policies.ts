/**
 * Workflow Execution Run Policies
 *
 * Documentation and helpers for the 4 run policies:
 * - single: Only one execution at a time
 * - replace: Cancel previous, start new
 * - parallel: Unlimited concurrent executions
 * - queue: Sequential FIFO with backlog
 *
 * Milestone: M1.2 - Queue-First + Run Policies
 */

import type { RunPolicy } from "../types";

/**
 * Run policy behavior documentation.
 * Used for UI hints and validation.
 */
export const RUN_POLICY_DOCS: Record<
  RunPolicy,
  {
    description: string;
    behavior: string;
    useCase: string;
  }
> = {
  single: {
    description: "Only one execution allowed at a time",
    behavior:
      "Rejects new executions if any execution is queued, executing, or completed (until dismissed)",
    useCase: "Preview-like tools where only the latest result matters",
  },

  replace: {
    description: "Cancel previous execution and start new",
    behavior:
      "Cancels all queued and executing executions, clears queue, then starts new execution",
    useCase: "Real-time feedback tools where only the latest result matters",
  },

  parallel: {
    description: "Multiple executions run simultaneously (default)",
    behavior:
      "Allows unlimited concurrent executions - each runs independently",
    useCase: "Independent generations where all results are valuable",
  },

  queue: {
    description: "Sequential FIFO queue - one at a time with backlog",
    behavior:
      "Executes one at a time in order queued; new executions wait in queue",
    useCase: "Batch processing workflows where order matters",
  },
};

/**
 * Get default run policy (used when tool doesn't specify)
 */
export const DEFAULT_RUN_POLICY: RunPolicy = "parallel";

/**
 * Check if policy allows multiple concurrent executions
 */
export function allowsConcurrent(policy: RunPolicy): boolean {
  return policy === "parallel";
}

/**
 * Check if policy requires queue advancement
 */
export function requiresQueueAdvancement(policy: RunPolicy): boolean {
  return policy === "queue" || policy === "single";
}

/**
 * Check if policy uses active execution tracking (single execution ID)
 */
export function usesActiveTracking(policy: RunPolicy): boolean {
  return policy === "single" || policy === "replace";
}

/**
 * Get maximum concurrent executions for policy
 */
export function maxConcurrent(policy: RunPolicy): number {
  switch (policy) {
    case "single":
      return 1;
    case "replace":
      return 1;
    case "queue":
      return 1;
    case "parallel":
      return Infinity;
    default:
      return 1; // Safe default
  }
}
