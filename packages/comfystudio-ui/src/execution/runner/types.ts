/**
 * Runner Types
 *
 * Defines contracts for the workflow execution runner.
 * Runner orchestrates: Adapter → ComfyUI → History Store
 *
 * Milestone: M3.3 - Runner Core (Happy Path)
 */

import type { WorkflowExecution } from "../types";
import type { HistoryStore } from "../history/api";
import type {
  ComfyUIPromptAdapter,
  AdapterContext,
  ComfyUIPromptPayload,
} from "../adapters/comfyui/types";

// ============================================================================
// ComfyUI Client Port (I/O Boundary)
// ============================================================================

export type ComfyUIJobId = string;

/**
 * ComfyUI job status discriminated union
 */
export type ComfyUIJobStatus =
  | { state: "queued" }
  | { state: "running"; progress?: number }
  | { state: "completed"; outputs?: Record<string, unknown> }
  | { state: "failed"; error?: string }
  | { state: "missing" }; // Job not found / expired / server reset

/**
 * ComfyUI client port - abstracts network I/O for testing
 */
export interface ComfyUIClientPort {
  /**
   * Submit prompt to ComfyUI backend
   * Returns job ID for tracking/cancellation
   */
  submitPrompt(payload: ComfyUIPromptPayload): Promise<{ jobId: ComfyUIJobId }>;

  /**
   * Get current status of a job
   */
  getStatus(jobId: ComfyUIJobId): Promise<ComfyUIJobStatus>;

  /**
   * Cancel a running or queued job
   */
  cancel(jobId: ComfyUIJobId): Promise<{ cancelled: boolean }>;
}

// ============================================================================
// Runner Dependencies (Ports)
// ============================================================================

export interface ClockPort {
  now(): Date;
  nowMs(): number;
}

export interface LoggerPort {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

/**
 * Runner dependencies (injected for testability)
 */
export type RunnerDeps = {
  adapter: ComfyUIPromptAdapter;
  comfyui: ComfyUIClientPort;
  history: HistoryStore;
  clock: ClockPort;
  log: LoggerPort;
};

// ============================================================================
// Runner Options
// ============================================================================

export type RunnerOptions = {
  /**
   * Poll interval for ComfyUI status checks (ms)
   * Use deterministic values in tests
   */
  pollIntervalMs: number;

  /**
   * Optional max runtime safety timeout (ms)
   */
  maxRuntimeMs?: number;

  /**
   * Emit progress heartbeat even if unchanged
   * Default: false (only emit on change)
   */
  emitProgressHeartbeat?: boolean;

  /**
   * Number of consecutive "missing" observations required to mark job as failed
   * Default: 2 (per ADR-0009)
   */
  missingJobConfirmations?: number;
};

// ============================================================================
// Runner Results
// ============================================================================

export type RunnerStartResult =
  | { ok: true; executionId: string; jobId: ComfyUIJobId }
  | { ok: false; error: { code: string; message: string; details?: any } };

export type RunnerCancelResult =
  | { ok: true; executionId: string; cancelled: boolean }
  | { ok: false; error: { code: string; message: string; details?: any } };

// ============================================================================
// Runner Interface
// ============================================================================

/**
 * Workflow Runner - orchestrates execution lifecycle
 *
 * CONTRACT:
 * - Records all state transitions via History Store
 * - Never blocks queue advancement after terminal state
 * - Treats cancellation as separate terminal state
 * - Tolerates ComfyUI restarts/failures
 */
export interface WorkflowRunner {
  /**
   * Start execution:
   * 1. Build prompt via adapter
   * 2. Record queued state
   * 3. Submit to ComfyUI
   * 4. Record executing state
   * 5. Poll until terminal
   * 6. Record terminal state
   *
   * MUST always reach terminal state (completed/failed)
   */
  start(
    execution: WorkflowExecution,
    adapterContext: AdapterContext,
    options: RunnerOptions
  ): Promise<RunnerStartResult>;

  /**
   * Cancel execution (M3.4 - not implemented in M3.3)
   */
  cancel?(
    toolId: string,
    executionId: string,
    jobId?: ComfyUIJobId
  ): Promise<RunnerCancelResult>;
}
