/**
 * Workflow Runner Core
 *
 * Orchestrates execution lifecycle: queued → executing → completed/failed/cancelled
 * Records all state transitions via History Store (source of truth)
 *
 * Milestone: M3.4 - Cancellation + Failure Semantics
 */

import type { WorkflowExecution } from "../types";
import type { AdapterContext } from "../adapters/comfyui/types";
import type {
  WorkflowRunner,
  RunnerDeps,
  RunnerOptions,
  RunnerStartResult,
  RunnerCancelResult,
  ComfyUIJobStatus,
} from "./types";

/**
 * Pure runner implementation with cancellation support
 *
 * CONTRACT:
 * - All state transitions recorded via History Store
 * - Always reaches terminal state (no hangs)
 * - Tolerates transient ComfyUI failures
 * - First terminal state wins (immutable once terminal)
 * - Cancellation is separate terminal state (not failure)
 */
export class PureWorkflowRunner implements WorkflowRunner {
  // Track cancellation requests (in-memory only, not source of truth)
  private cancellationRequests = new Map<string, boolean>();

  // Track active jobs for cancellation
  private activeJobs = new Map<string, { jobId: string; toolId: string }>();

  constructor(private deps: RunnerDeps) {}

  async start(
    execution: WorkflowExecution,
    adapterContext: AdapterContext,
    options: RunnerOptions
  ): Promise<RunnerStartResult> {
    const { adapter, comfyui, history, clock, log } = this.deps;

    log.info("Starting execution", {
      executionId: execution.id,
      toolId: execution.toolId,
    });

    try {
      // Step 1: Build ComfyUI prompt via adapter
      const buildResult = adapter.buildPrompt(execution, adapterContext);

      if (!buildResult.ok) {
        // Adapter validation failed - record as failed immediately
        log.error("Adapter validation failed", {
          executionId: execution.id,
          error: buildResult.error,
        });

        await history.recordError(execution.toolId, execution.id, {
          category: "validation",
          message: buildResult.error.message,
          details: buildResult.error.details,
        });

        // Record failed state
        const failedExecution: WorkflowExecution = {
          ...execution,
          state: "failed",
          queuedAt: clock.now(),
          completedAt: clock.now(),
        };

        await history.recordExecution(execution.toolId, failedExecution);

        return {
          ok: false,
          error: {
            code: buildResult.error.code,
            message: buildResult.error.message,
            details: buildResult.error.details,
          },
        };
      }

      const { payload, fingerprint } = buildResult.value;

      log.debug("Prompt built", {
        executionId: execution.id,
        fingerprint,
      });

      // Step 2: Record queued state
      const queuedExecution: WorkflowExecution = {
        ...execution,
        state: "queued",
        queuedAt: clock.now(),
      };

      await history.recordExecution(execution.toolId, queuedExecution);

      log.info("Execution queued", { executionId: execution.id });

      // Step 3: Submit to ComfyUI
      let jobId: string;
      try {
        const submitResult = await comfyui.submitPrompt(payload);
        jobId = submitResult.jobId;

        log.info("Prompt submitted to ComfyUI", {
          executionId: execution.id,
          jobId,
        });
      } catch (submitError) {
        // Submit failed - record as failed
        log.error("ComfyUI submit failed", {
          executionId: execution.id,
          error: submitError,
        });

        await history.recordError(execution.toolId, execution.id, {
          category: "comfyui",
          message:
            submitError instanceof Error
              ? submitError.message
              : "Submit failed",
          details: { error: String(submitError) },
        });

        const failedExecution: WorkflowExecution = {
          ...queuedExecution,
          state: "failed",
          completedAt: clock.now(),
        };

        await history.recordExecution(execution.toolId, failedExecution);

        return {
          ok: false,
          error: {
            code: "COMFYUI_SUBMIT_FAILED",
            message:
              submitError instanceof Error
                ? submitError.message
                : "Submit failed",
            details: { error: String(submitError) },
          },
        };
      }

      // Step 4: Record executing state
      const executingExecution: WorkflowExecution = {
        ...queuedExecution,
        state: "executing",
        startedAt: clock.now(),
        comfyuiPromptId: jobId,
      };

      await history.recordExecution(execution.toolId, executingExecution);

      log.info("Execution started", { executionId: execution.id, jobId });

      // Track active job for cancellation
      this.activeJobs.set(execution.id, {
        jobId,
        toolId: execution.toolId,
      });

      // Step 5: Poll until terminal
      const terminalResult = await this.pollUntilTerminal(
        execution,
        jobId,
        options
      );

      // Clean up tracking
      this.activeJobs.delete(execution.id);
      this.cancellationRequests.delete(execution.id);

      // Step 6: Record terminal state
      const terminalExecution: WorkflowExecution = {
        ...executingExecution,
        state: terminalResult.state,
        progress: terminalResult.progress ?? executingExecution.progress,
        completedAt: clock.now(),
        result: terminalResult.result,
      };

      await history.recordExecution(execution.toolId, terminalExecution);

      // Record error for failed executions (not for cancelled)
      if (terminalResult.state === "failed" && terminalResult.error) {
        await history.recordError(execution.toolId, execution.id, {
          category: "comfyui",
          message: terminalResult.error,
        });
      }

      log.info("Execution terminal", {
        executionId: execution.id,
        state: terminalResult.state,
      });

      return {
        ok: true,
        executionId: execution.id,
        jobId,
      };
    } catch (error) {
      // Unexpected error - record as failed
      log.error("Unexpected runner error", {
        executionId: execution.id,
        error,
      });

      await history.recordError(execution.toolId, execution.id, {
        category: "unknown",
        message: error instanceof Error ? error.message : "Unknown error",
        details: { error: String(error) },
        stack: error instanceof Error ? error.stack : undefined,
      });

      const failedExecution: WorkflowExecution = {
        ...execution,
        state: "failed",
        queuedAt: execution.queuedAt ?? clock.now(),
        completedAt: clock.now(),
      };

      await history.recordExecution(execution.toolId, failedExecution);

      return {
        ok: false,
        error: {
          code: "RUNNER_INVARIANT_VIOLATION",
          message: error instanceof Error ? error.message : "Unknown error",
          details: { error: String(error) },
        },
      };
    }
  }

  /**
   * Cancel execution
   *
   * CONTRACT:
   * - Cancellation is a terminal state (not failure)
   * - First terminal state wins (cannot cancel if already terminal)
   * - Always unblocks queue (deterministic terminal outcome)
   */
  async cancel(
    toolId: string,
    executionId: string,
    jobId?: string
  ): Promise<RunnerCancelResult> {
    const { history, clock, log, comfyui } = this.deps;

    log.info("Cancellation requested", { toolId, executionId, jobId });

    try {
      // Check if execution already terminal via History Store (source of truth)
      const replayResult = await history.replay(toolId);
      const execution = replayResult.toolState.executions.get(executionId);

      if (!execution) {
        log.warn("Execution not found for cancellation", {
          toolId,
          executionId,
        });
        return {
          ok: false,
          error: {
            code: "EXECUTION_NOT_FOUND",
            message: `Execution ${executionId} not found`,
          },
        };
      }

      // Terminal immutability: cannot change terminal state
      if (
        execution.state === "completed" ||
        execution.state === "failed" ||
        execution.state === "cancelled"
      ) {
        log.info("Execution already terminal, ignoring cancel", {
          executionId,
          state: execution.state,
        });

        return {
          ok: true,
          executionId,
          cancelled: false, // Already terminal
        };
      }

      // Mark cancellation requested (for polling loop)
      this.cancellationRequests.set(executionId, true);

      // Try to cancel at ComfyUI (best effort)
      const activeJob = this.activeJobs.get(executionId);
      const effectiveJobId = jobId ?? activeJob?.jobId;

      if (effectiveJobId) {
        try {
          await comfyui.cancel(effectiveJobId);
          log.info("ComfyUI job cancelled", { executionId, jobId: effectiveJobId });
        } catch (cancelError) {
          log.warn("ComfyUI cancel failed (non-fatal)", {
            executionId,
            error: cancelError,
          });
        }
      }

      // Record cancelled state (if not actively polling, record immediately)
      if (!activeJob) {
        const cancelledExecution: WorkflowExecution = {
          ...execution,
          state: "cancelled",
          completedAt: clock.now(),
        };

        await history.recordExecution(toolId, cancelledExecution);

        log.info("Execution cancelled", { executionId });
      } else {
        // Polling loop will detect cancellation flag and record state
        log.info("Cancellation flag set, polling loop will record", {
          executionId,
        });
      }

      return {
        ok: true,
        executionId,
        cancelled: true,
      };
    } catch (error) {
      log.error("Cancellation error", { executionId, error });

      return {
        ok: false,
        error: {
          code: "CANCEL_FAILED",
          message: error instanceof Error ? error.message : "Cancel failed",
          details: { error: String(error) },
        },
      };
    }
  }

  /**
   * Poll ComfyUI status until terminal state reached
   *
   * Returns terminal state info (completed, failed, or cancelled)
   */
  private async pollUntilTerminal(
    execution: WorkflowExecution,
    jobId: string,
    options: RunnerOptions
  ): Promise<{
    state: "completed" | "failed" | "cancelled";
    progress?: number;
    result?: any;
    error?: string;
  }> {
    const { comfyui, history, clock, log } = this.deps;
    const startTime = clock.nowMs();
    let lastProgress: number | undefined;

    // Missing job confirmation tracking (per ADR-0009)
    const requiredMissingConfirmations = options.missingJobConfirmations ?? 2;
    let consecutiveMissingCount = 0;

    while (true) {
      // Check for cancellation request (first terminal wins)
      if (this.cancellationRequests.get(execution.id)) {
        log.info("Cancellation detected during poll", {
          executionId: execution.id,
        });

        // Try to cancel job at ComfyUI (best effort)
        try {
          await comfyui.cancel(jobId);
          log.info("ComfyUI job cancelled", { executionId: execution.id, jobId });
        } catch (cancelError) {
          log.warn("ComfyUI cancel failed (non-fatal)", {
            executionId: execution.id,
            error: cancelError,
          });
        }

        return {
          state: "cancelled",
        };
      }

      // Check max runtime timeout
      if (options.maxRuntimeMs) {
        const elapsed = clock.nowMs() - startTime;
        if (elapsed > options.maxRuntimeMs) {
          log.warn("Max runtime exceeded", {
            executionId: execution.id,
            elapsed,
            maxRuntimeMs: options.maxRuntimeMs,
          });

          return {
            state: "failed",
            error: `Execution exceeded max runtime (${options.maxRuntimeMs}ms)`,
          };
        }
      }

      // Poll ComfyUI status
      let status: ComfyUIJobStatus;
      try {
        status = await comfyui.getStatus(jobId);
      } catch (pollError) {
        log.warn("Status poll failed (transient)", {
          executionId: execution.id,
          error: pollError,
        });

        // Transient failure - wait and retry
        await this.sleep(options.pollIntervalMs);
        continue;
      }

      // Handle status
      switch (status.state) {
        case "queued":
        case "running": {
          // Reset missing counter (job is active)
          consecutiveMissingCount = 0;

          // Still processing - record progress if changed
          if (status.state === "running" && status.progress !== undefined) {
            const progressChanged = status.progress !== lastProgress;
            const shouldEmit =
              progressChanged || options.emitProgressHeartbeat;

            if (shouldEmit) {
              lastProgress = status.progress;

              // Record progress update
              const progressExecution: WorkflowExecution = {
                ...execution,
                state: "executing",
                progress: status.progress,
                comfyuiPromptId: jobId,
                queuedAt: execution.queuedAt ?? clock.now(),
                startedAt: execution.startedAt ?? clock.now(),
              };

              await history.recordExecution(
                execution.toolId,
                progressExecution
              );

              log.debug("Progress update", {
                executionId: execution.id,
                progress: status.progress,
              });
            }
          }

          // Wait before next poll
          await this.sleep(options.pollIntervalMs);
          break;
        }

        case "completed": {
          log.info("Job completed", {
            executionId: execution.id,
            jobId,
          });

          return {
            state: "completed",
            progress: 100,
            result: status.outputs,
          };
        }

        case "failed": {
          log.warn("Job failed", {
            executionId: execution.id,
            jobId,
            error: status.error,
          });

          return {
            state: "failed",
            error: status.error ?? "ComfyUI job failed",
          };
        }

        case "missing": {
          // Increment consecutive missing count
          consecutiveMissingCount++;

          log.warn("Job missing observation", {
            executionId: execution.id,
            jobId,
            consecutiveMissingCount,
            requiredConfirmations: requiredMissingConfirmations,
          });

          // Check if we have enough confirmations (per ADR-0009)
          if (consecutiveMissingCount >= requiredMissingConfirmations) {
            log.error("Job confirmed missing after N consecutive checks", {
              executionId: execution.id,
              jobId,
              consecutiveMissingCount,
            });

            return {
              state: "failed",
              error: `Job not found after ${consecutiveMissingCount} consecutive checks (backend may have restarted)`,
            };
          }

          // Not enough confirmations yet - wait and retry
          log.debug("Waiting for more missing confirmations", {
            executionId: execution.id,
            consecutiveMissingCount,
            remaining: requiredMissingConfirmations - consecutiveMissingCount,
          });

          await this.sleep(options.pollIntervalMs);
          break;
        }
      }
    }
  }

  /**
   * Sleep helper for polling
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function for creating runner instances
 */
export function createWorkflowRunner(deps: RunnerDeps): WorkflowRunner {
  return new PureWorkflowRunner(deps);
}
