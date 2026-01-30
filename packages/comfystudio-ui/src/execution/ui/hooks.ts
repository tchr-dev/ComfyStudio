/**
 * Execution UI Hooks
 *
 * React hooks for observing execution state and dispatching commands.
 * UI never mutates runner state directly - only observes and dispatches.
 *
 * Milestone: M4.1 - Runner ↔ UI Wiring
 */

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type {
  ExecutionService,
  ExecutionStateSnapshot,
  ExecutionEvent,
  ExecutionEventListener,
} from "../service";
import type { WorkflowExecution } from "../types";

// ============================================================================
// Service Context (injected via provider)
// ============================================================================

let globalExecutionService: ExecutionService | null = null;

/**
 * Set global execution service (called once on app init)
 */
export function setExecutionService(service: ExecutionService): void {
  globalExecutionService = service;
}

/**
 * Get global execution service
 */
function getExecutionService(): ExecutionService {
  if (!globalExecutionService) {
    throw new Error(
      "Execution service not initialized. Call setExecutionService() first."
    );
  }
  return globalExecutionService;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Use execution state (read-only observation)
 *
 * Returns current execution state snapshot.
 * Updates automatically when state changes.
 */
export function useExecutionState(): ExecutionStateSnapshot | null {
  const service = getExecutionService();
  const [snapshot, setSnapshot] = useState<ExecutionStateSnapshot | null>(null);

  useEffect(() => {
    // Initial load
    service.getSnapshot().then(setSnapshot);

    // Subscribe to updates
    const unsubscribe = service.subscribe((event) => {
      // Reload snapshot on any state change
      service.getSnapshot().then(setSnapshot);
    });

    return unsubscribe;
  }, [service]);

  return snapshot;
}

/**
 * Use execution commands (command dispatch)
 *
 * Returns functions to dispatch execution commands.
 * UI dispatches intent; runner owns state transitions.
 */
export function useExecutionCommands() {
  const service = getExecutionService();

  const startExecution = useCallback(
    async (execution: WorkflowExecution) => {
      return await service.startExecution(execution);
    },
    [service]
  );

  const cancelExecution = useCallback(
    async (toolId: string, executionId: string) => {
      return await service.cancelExecution(toolId, executionId);
    },
    [service]
  );

  return useMemo(
    () => ({
      startExecution,
      cancelExecution,
    }),
    [startExecution, cancelExecution]
  );
}

/**
 * Use execution events (event subscription)
 *
 * Subscribe to execution events for specific handling.
 * Useful for toasts, notifications, analytics.
 */
export function useExecutionEvents(listener: ExecutionEventListener): void {
  const service = getExecutionService();
  const listenerRef = useRef(listener);

  // Update ref on change
  useEffect(() => {
    listenerRef.current = listener;
  }, [listener]);

  useEffect(() => {
    // Wrap listener to use ref (avoids resubscribe on every render)
    const wrappedListener: ExecutionEventListener = (event) => {
      listenerRef.current(event);
    };

    const unsubscribe = service.subscribe(wrappedListener);
    return unsubscribe;
  }, [service]);
}

/**
 * Use execution for tool (filtered view)
 *
 * Returns executions for specific tool.
 * More efficient than filtering full state in components.
 */
export function useExecutionsForTool(
  toolId: string
): Map<string, WorkflowExecution> | null {
  const state = useExecutionState();

  return useMemo(() => {
    if (!state) return null;
    return state.executionsByTool.get(toolId) ?? new Map();
  }, [state, toolId]);
}

/**
 * Use single execution (by ID)
 *
 * Returns single execution by ID.
 */
export function useExecution(
  toolId: string,
  executionId: string
): WorkflowExecution | null {
  const executions = useExecutionsForTool(toolId);

  return useMemo(() => {
    if (!executions) return null;
    return executions.get(executionId) ?? null;
  }, [executions, executionId]);
}

/**
 * Use active executions (currently running)
 *
 * Returns list of currently executing jobs.
 * Useful for progress indicators.
 */
export function useActiveExecutions(): Array<{
  executionId: string;
  toolId: string;
  execution: WorkflowExecution;
}> {
  const state = useExecutionState();

  return useMemo(() => {
    if (!state) return [];

    const active: Array<{
      executionId: string;
      toolId: string;
      execution: WorkflowExecution;
    }> = [];

    for (const [toolId, executions] of state.executionsByTool) {
      for (const [executionId, execution] of executions) {
        if (execution.state === "executing") {
          active.push({ executionId, toolId, execution });
        }
      }
    }

    return active;
  }, [state]);
}

/**
 * Use execution status (for specific execution)
 *
 * Returns simplified status for UI display.
 */
export function useExecutionStatus(
  toolId: string,
  executionId: string
): {
  status: "idle" | "running" | "completed" | "failed" | "cancelled" | null;
  progress?: number;
  error?: string;
} {
  const execution = useExecution(toolId, executionId);

  return useMemo(() => {
    if (!execution) {
      return { status: null };
    }

    const status =
      execution.state === "queued" || execution.state === "executing"
        ? "running"
        : execution.state === "idle"
        ? "idle"
        : execution.state;

    return {
      status,
      progress: execution.progress,
      error: execution.error,
    };
  }, [execution]);
}

/**
 * Use rehydrate (on app startup)
 *
 * Call once on app mount to restore state from history.
 */
export function useRehydrateOnMount(): void {
  const service = getExecutionService();
  const [rehydrated, setRehydrated] = useState(false);

  useEffect(() => {
    if (!rehydrated) {
      service.rehydrate().then(() => {
        setRehydrated(true);
      });
    }
  }, [service, rehydrated]);
}
