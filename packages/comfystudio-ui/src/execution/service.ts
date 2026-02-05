/**
 * Execution Service
 *
 * Orchestrates runner + history + state observation.
 * Provides clean UI integration boundary.
 *
 * CONTRACT:
 * - UI dispatches commands (intent)
 * - Runner owns truth (state transitions)
 * - UI observes outcome (via subscriptions)
 *
 * Milestone: M4.1 - Runner ↔ UI Wiring
 */

import type { WorkflowExecution, ExecutionEvent as CanonicalExecutionEvent, ExecutionEventListener as CanonicalExecutionEventListener } from "./types";
import type { HistoryStore } from "./history/api";
import type { WorkflowRunner, RunnerDeps, RunnerOptions } from "./runner/types";
import type { AdapterContext } from "./adapters/comfyui/types";

// ============================================================================
// Service Types
// ============================================================================

/**
 * Execution service configuration
 */
export type ExecutionServiceConfig = {
  /**
   * Workspace root for history storage
   */
  workspaceRoot: string;

  /**
   * Runner options (poll interval, timeouts, etc.)
   */
  runnerOptions: RunnerOptions;

  /**
   * Adapter context (templates, hasher, client ID)
   */
  adapterContext: AdapterContext;
};

/**
 * Execution state snapshot (read-only view for UI)
 */
export type ExecutionStateSnapshot = {
  /**
   * All executions by tool
   */
  executionsByTool: Map<string, Map<string, WorkflowExecution>>;

  /**
   * Currently executing job IDs (for cancellation)
   */
  activeJobs: Map<string, { toolId: string; jobId: string }>;

  /**
   * Service status
   */
  status: "idle" | "running" | "error";

  /**
   * Last error (if any)
   */
  lastError?: {
    executionId: string;
    error: string;
  };
};

/**
 * Service-level execution events (simplified for UI layer)
 * Note: Full execution events are defined in types/index.ts
 */
type ServiceExecutionEvent =
  | { type: "execution_started"; executionId: string; toolId: string; jobId: string }
  | { type: "execution_progress"; executionId: string; toolId: string; progress: number }
  | { type: "execution_completed"; executionId: string; toolId: string }
  | { type: "execution_failed"; executionId: string; toolId: string; error: string }
  | { type: "execution_cancelled"; executionId: string; toolId: string }
  | { type: "service_error"; error: string };

/**
 * Service event listener
 */
type ServiceExecutionEventListener = (event: ServiceExecutionEvent) => void;

// ============================================================================
// Execution Service
// ============================================================================

/**
 * Execution Service - orchestrates runner + history + state
 *
 * Provides:
 * - Command dispatch (start, cancel)
 * - State observation (subscribe to events)
 * - History replay (rehydration)
 */
export interface ExecutionService {
  /**
   * Start execution
   *
   * Dispatches intent to runner, which owns state transitions.
   */
  startExecution(
    execution: WorkflowExecution
  ): Promise<{ ok: true; executionId: string; jobId: string } | { ok: false; error: string }>;

  /**
   * Cancel execution
   *
   * Dispatches cancellation intent to runner.
   */
  cancelExecution(
    toolId: string,
    executionId: string
  ): Promise<{ ok: true; cancelled: boolean } | { ok: false; error: string }>;

  /**
   * Get current state snapshot (read-only)
   */
  getSnapshot(): Promise<ExecutionStateSnapshot>;

  /**
   * Subscribe to execution events
   */
  subscribe(listener: CanonicalExecutionEventListener): () => void;

  /**
   * Rehydrate state from history (on app restart)
   */
  rehydrate(): Promise<void>;

  /**
   * Shutdown service (cleanup)
   */
  shutdown(): Promise<void>;
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Create execution service
 */
export function createExecutionService(
  runner: WorkflowRunner,
  history: HistoryStore,
  config: ExecutionServiceConfig
): ExecutionService {
  // Event listeners
  const listeners = new Set<CanonicalExecutionEventListener>();

  // Active jobs tracking (for UI)
  const activeJobs = new Map<string, { toolId: string; jobId: string }>();

  // Service state
  let status: ExecutionStateSnapshot["status"] = "idle";
  let lastError: ExecutionStateSnapshot["lastError"] | undefined;

  /**
   * Emit event to all listeners
   */
  function emit(event: ServiceExecutionEvent): void {
    listeners.forEach((listener) => {
      try {
        // Note: ServiceExecutionEvent is a simplified subset of CanonicalExecutionEvent
        // We cast here as the service layer emits simplified events for now
        listener(event as any);
      } catch (error) {
        console.error("Event listener error:", error);
      }
    });
  }

  /**
   * Start execution (command dispatch)
   */
  async function startExecution(
    execution: WorkflowExecution
  ): Promise<
    { ok: true; executionId: string; jobId: string } | { ok: false; error: string }
  > {
    try {
      status = "running";

      // Start execution in background (don't await completion)
      const runnerPromise = runner.start(
        execution,
        config.adapterContext,
        config.runnerOptions
      );

      // Monitor execution to terminal state in background
      runnerPromise.then(
        async (result) => {
          if (!result.ok) {
            // Adapter/validation error before submission
            status = "error";
            lastError = {
              executionId: execution.id,
              error: result.error.message,
            };

            emit({
              type: "execution_failed",
              executionId: execution.id,
              toolId: execution.toolId,
              error: result.error.message,
            });

            activeJobs.delete(execution.id);
            return;
          }

          // Execution completed to terminal state
          // Check history for final state
          const finalState = await history.replay(execution.toolId);
          const finalExecution = finalState.executions.get(execution.id);

          if (finalExecution) {
            switch (finalExecution.state) {
              case "completed":
                emit({
                  type: "execution_completed",
                  executionId: execution.id,
                  toolId: execution.toolId,
                });
                break;
              case "failed":
                emit({
                  type: "execution_failed",
                  executionId: execution.id,
                  toolId: execution.toolId,
                  error: finalExecution.errorRef.executionErrorId ?? "Unknown error",
                });
                break;
              case "cancelled":
                emit({
                  type: "execution_cancelled",
                  executionId: execution.id,
                  toolId: execution.toolId,
                });
                break;
            }
          }

          // Clean up tracking
          activeJobs.delete(execution.id);

          // Update service status if no more active jobs
          if (activeJobs.size === 0) {
            status = "idle";
          }
        },
        (error) => {
          // Unexpected error during execution
          status = "error";
          const errorMessage = error instanceof Error ? error.message : String(error);

          lastError = {
            executionId: execution.id,
            error: errorMessage,
          };

          emit({
            type: "service_error",
            error: errorMessage,
          });

          activeJobs.delete(execution.id);
        }
      );

      // Wait for runner to submit to ComfyUI and write executing state to history
      // (runner blocks, but writes state incrementally)
      // Poll history until we see "executing" state with jobId
      let jobId: string | undefined;
      const startTime = Date.now();
      const timeoutMs = 5000;

      while (!jobId && Date.now() - startTime < timeoutMs) {
        await new Promise((resolve) => setTimeout(resolve, 10));

        const currentState = await history.replay(execution.toolId);
        const currentExecution = currentState.executions.get(execution.id);

        if (currentExecution) {
          // Check if we have a jobId yet (runner records this in "executing" state)
          if (
            currentExecution.state === "executing" ||
            currentExecution.state === "completed" ||
            currentExecution.state === "failed" ||
            currentExecution.state === "cancelled"
          ) {
            // jobId should be in the execution metadata/context
            // For now, we'll use execution.id as placeholder since runner doesn't expose jobId early
            // In real implementation, runner would write jobId to history in executing state
            jobId = execution.id; // Placeholder: would read from history in production
          }

          // If execution already failed during validation, return early
          if (currentExecution.state === "failed") {
            status = "error";
            const errorMessage = currentExecution.errorRef.executionErrorId ?? "Execution failed";
            lastError = {
              executionId: execution.id,
              error: errorMessage,
            };

            emit({
              type: "execution_failed",
              executionId: execution.id,
              toolId: execution.toolId,
              error: errorMessage,
            });

            return {
              ok: false,
              error: errorMessage,
            };
          }
        }
      }

      if (!jobId) {
        // Timeout waiting for jobId
        return {
          ok: false,
          error: "Timeout waiting for execution to start",
        };
      }

      // Track active job
      activeJobs.set(execution.id, {
        toolId: execution.toolId,
        jobId,
      });

      // Emit started event
      emit({
        type: "execution_started",
        executionId: execution.id,
        toolId: execution.toolId,
        jobId,
      });

      return {
        ok: true,
        executionId: execution.id,
        jobId,
      };
    } catch (error) {
      status = "error";
      const errorMessage = error instanceof Error ? error.message : String(error);

      lastError = {
        executionId: execution.id,
        error: errorMessage,
      };

      emit({
        type: "service_error",
        error: errorMessage,
      });

      return { ok: false, error: errorMessage };
    }
  }

  /**
   * Cancel execution (command dispatch)
   */
  async function cancelExecution(
    toolId: string,
    executionId: string
  ): Promise<{ ok: true; cancelled: boolean } | { ok: false; error: string }> {
    if (!runner.cancel) {
      return { ok: false, error: "Cancel not supported" };
    }

    try {
      // Get job ID from active tracking
      const activeJob = activeJobs.get(executionId);
      const jobId = activeJob?.jobId;

      // Dispatch to runner
      const result = await runner.cancel(toolId, executionId, jobId);

      if (!result.ok) {
        return { ok: false, error: result.error.message };
      }

      // Emit cancelled event
      if (result.cancelled) {
        emit({
          type: "execution_cancelled",
          executionId,
          toolId,
        });

        // Clean up tracking
        activeJobs.delete(executionId);
      }

      return {
        ok: true,
        cancelled: result.cancelled,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { ok: false, error: errorMessage };
    }
  }

  /**
   * Get current state snapshot (read-only)
   */
  async function getSnapshot(): Promise<ExecutionStateSnapshot> {
    try {
      // Replay all tools from history
      const toolStates = await history.replayAll();

      // Transform ToolExecutionState map to execution map
      const executionsByTool = new Map<string, Map<string, WorkflowExecution>>();
      for (const [toolId, toolState] of toolStates) {
        executionsByTool.set(toolId, toolState.executions);
      }

      return {
        executionsByTool,
        activeJobs: new Map(activeJobs),
        status,
        lastError,
      };
    } catch (error) {
      console.error("Failed to get snapshot:", error);

      return {
        executionsByTool: new Map(),
        activeJobs: new Map(activeJobs),
        status: "error",
        lastError: {
          executionId: "unknown",
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Subscribe to execution events
   */
  function subscribe(listener: CanonicalExecutionEventListener): () => void {
    listeners.add(listener);

    // Return unsubscribe function
    return () => {
      listeners.delete(listener);
    };
  }

  /**
   * Rehydrate state from history
   */
  async function rehydrate(): Promise<void> {
    try {
      // Replay all tools to restore state
      const executionsByTool = await history.replayAll();

      // Check for orphaned executions (executing but no active job)
      for (const [toolId, toolState] of executionsByTool) {
        for (const executionId of toolState.executingIds) {
          const execution = toolState.executions.get(executionId);
          if (execution && !activeJobs.has(executionId)) {
            // Orphaned execution detected
            console.warn("Orphaned execution detected:", {
              toolId,
              executionId,
              state: execution.state,
            });

            // Emit event for UI to handle
            emit({
              type: "service_error",
              error: `Orphaned execution detected: ${executionId}`,
            });
          }
        }
      }

      status = "idle";
    } catch (error) {
      status = "error";
      lastError = {
        executionId: "rehydrate",
        error: error instanceof Error ? error.message : String(error),
      };

      emit({
        type: "service_error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Shutdown service
   */
  async function shutdown(): Promise<void> {
    listeners.clear();
    activeJobs.clear();
    status = "idle";
  }

  return {
    startExecution,
    cancelExecution,
    getSnapshot,
    subscribe,
    rehydrate,
    shutdown,
  };
}
