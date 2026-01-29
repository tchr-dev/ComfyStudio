/**
 * Workflow Execution Contract Types
 *
 * Production types implementing the frozen workflow execution contract.
 * All types are immutable once created; state transitions are monotonic.
 *
 * Related:
 * - Contract: docs/plans/2026-01-29-workflow-execution-contract.md
 * - ADR: docs/adr/ADR-0007-workflow-execution-semantics.md
 */

// ============================================================================
// 1. EXECUTION STATE MACHINE
// ============================================================================

/**
 * Workflow execution state - monotonic state machine with 7 states.
 *
 * Flow: idle → armed → queued → executing → (completed | failed | cancelled)
 *
 * Terminal states: completed, failed, cancelled
 */
export type WorkflowExecutionState =
  | "idle"           // Tool active, no execution initiated
  | "armed"          // Canvas input captured, ready to execute
  | "queued"         // Submitted to ComfyUI, waiting for execution slot
  | "executing"      // Currently running on ComfyUI
  | "completed"      // Finished successfully
  | "failed"         // Execution failed
  | "cancelled";     // User cancelled before/during execution

/**
 * Check if state is terminal (requires user action to reset)
 */
export function isTerminalState(state: WorkflowExecutionState): boolean {
  return state === "completed" || state === "failed" || state === "cancelled";
}

// ============================================================================
// 2. SPATIAL INPUT
// ============================================================================

/**
 * Typed spatial input - discriminated union eliminates invalid states.
 * Each spatial input type has strongly-typed data payload.
 */
export type SpatialInput =
  | { type: "point"; data: { x: number; y: number } }
  | { type: "selection"; data: { x: number; y: number; width: number; height: number } }
  | { type: "mask"; data: { maskId: string; bounds: { x: number; y: number; width: number; height: number } } }
  | { type: "image"; data: { entityId: string } };

/**
 * Spatial input with revision tracking and capture timestamp.
 * Revisions increment based on trigger mode:
 * - Interaction tools: Every interaction increments
 * - Explicit tools: Only data changes increment
 */
export type SpatialInputSnapshot = {
  data: SpatialInput;
  capturedAt: Date;
  revision: number;  // Monotonically increasing capture epoch
};

/**
 * Reason for capturing spatial input (drives revision policy)
 */
export type CaptureReason = "interaction" | "explicit";

// ============================================================================
// 3. WORKFLOW TOOL DEFINITION
// ============================================================================

/**
 * Run policy - controls concurrent execution behavior
 */
export type RunPolicy =
  | "single"      // Only one execution total (queue, executing, or completed)
  | "replace"     // Cancel/remove previous, start new
  | "parallel"    // Multiple executions run simultaneously (DEFAULT)
  | "queue";      // Sequential - one at a time, with backlog

/**
 * Workflow tool definition - discriminated union ensures valid configurations only.
 *
 * Invalid states are unrepresentable:
 * - requiresSpatialInput: true without spatialInputType
 * - spatialInputType set but requiresSpatialInput: false
 */
export type WorkflowTool = {
  id: string;
  name: string;
  description: string;
  icon: string;
  shortcut?: string;
  category: "workflow";
  workflow: string;
  inputMapping?: Record<string, string>;
  runPolicy?: RunPolicy;  // Default: "parallel"
  settings?: any[];       // Settings definition (from tool system)
} & (
  // Explicit trigger, no spatial input
  | {
      triggerMode: "explicit";
      requiresSpatialInput: false;
    }
  // Explicit trigger, requires spatial input
  | {
      triggerMode: "explicit";
      requiresSpatialInput: true;
      spatialInputType: SpatialInput["type"];
    }
  // Interaction trigger, no spatial input (rare)
  | {
      triggerMode: "interaction";
      requiresSpatialInput: false;
    }
  // Interaction trigger with spatial input
  | {
      triggerMode: "interaction";
      requiresSpatialInput: true;
      spatialInputType: SpatialInput["type"];
    }
);

// ============================================================================
// 4. EXECUTION RECORD
// ============================================================================

/**
 * Workflow execution record - immutable once queued.
 *
 * Lifecycle:
 * 1. Created in idle state
 * 2. Settings/spatial captured (immutable after)
 * 3. Queued → executing → terminal
 * 4. Persisted to history
 * 5. Pruned from memory (hot set)
 */
export type WorkflowExecution = {
  // Identity
  id: string;                          // Unique execution ID (uuid)
  toolId: string;

  // State
  state: WorkflowExecutionState;

  // Captured inputs (immutable once queued)
  settings: Record<string, any>;
  spatialInput?: SpatialInputSnapshot;

  // Lifecycle timestamps
  queuedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  persistedAt?: Date;                  // When saved to history store

  // Progress & results
  progress?: number;                   // 0-100
  error?: string;
  result?: any;

  // ComfyUI integration
  comfyuiPromptId?: string;            // ComfyUI job ID for cancellation
};

// ============================================================================
// 5. PER-TOOL EXECUTION STATE
// ============================================================================

/**
 * Per-tool execution manager state.
 *
 * Tracks:
 * - All executions (Map for O(1) lookup)
 * - Queue order (array of IDs)
 * - Active execution (for single/replace policies)
 * - Current spatial input (shared across all executions)
 */
export type ToolExecutionState = {
  toolId: string;

  // All executions for this tool (past and present)
  executions: Map<string, WorkflowExecution>;

  // Queue management (for runPolicy: "queue" | "parallel")
  queuedIds: string[];                 // Execution IDs in queue order
  executingIds: string[];              // Currently running

  // Single-execution tracking (for runPolicy: "single" | "replace")
  activeExecutionId?: string;          // The one execution that matters

  // Spatial input tracking (shared across all executions)
  currentSpatialInput?: SpatialInputSnapshot;

  // Last queued revision (for stale-input guard)
  lastQueuedRevision?: number;
};

// ============================================================================
// 6. HISTORY PERSISTENCE
// ============================================================================

/**
 * Execution history record - persisted to storage.
 *
 * Differences from WorkflowExecution:
 * - Timestamps are ISO 8601 strings (serializable)
 * - Result stored as ref (file path, blob URL, or external URL)
 * - Spatial input simplified (no full data payload)
 */
export type ExecutionHistoryRecord = {
  id: string;
  toolId: string;
  state: WorkflowExecutionState;

  queuedAt?: string;                   // ISO 8601
  startedAt?: string;
  completedAt?: string;

  progress?: number;
  error?: string;
  settings?: Record<string, any>;

  spatialInput?: {
    revision: number;
    capturedAt: string;
    type: SpatialInput["type"];
  };

  resultRef?: {
    kind: "file" | "blob" | "url";
    ref: string;
  };
};

/**
 * History store interface - pluggable storage backend.
 *
 * Default implementation: JSONL files at history/<toolId>/YYYY-MM-DD.jsonl
 * Artifacts at: artifacts/<execId>/<filename>
 */
export interface ExecutionHistoryStore {
  append(record: ExecutionHistoryRecord): Promise<void>;
  batchAppend(records: ExecutionHistoryRecord[]): Promise<void>;

  query(params: {
    toolId?: string;
    states?: WorkflowExecutionState[];
    limit?: number;
    before?: string;                   // ISO time cursor
  }): Promise<ExecutionHistoryRecord[]>;

  deleteMany(params: { toolId: string; ids: string[] }): Promise<void>;
}

/**
 * Pruning policy - controls memory management
 */
export type PrunePolicy = {
  maxHotExecutionsPerTool: number;     // e.g. 200
  maxTerminalHotPerTool: number;       // e.g. 100
  terminalMaxAgeMs?: number;           // e.g. 7 days in ms
};

// ============================================================================
// 7. COMFYUI INTEGRATION
// ============================================================================

/**
 * ComfyUI adapter interface - handles workflow submission and lifecycle.
 */
export interface ComfyUIAdapter {
  /**
   * Queue workflow for execution.
   * Returns ComfyUI prompt ID for tracking/cancellation.
   */
  queuePrompt(workflow: any): Promise<string>;

  /**
   * Cancel running or queued prompt.
   */
  cancelPrompt(promptId: string): Promise<void>;

  /**
   * Subscribe to progress updates for a prompt.
   */
  onProgress(callback: (data: {
    promptId: string;
    progress: number; // 0-100
  }) => void): void;

  /**
   * Subscribe to completion events.
   */
  onComplete(callback: (data: {
    promptId: string;
    result: any;
  }) => void): void;

  /**
   * Subscribe to error events.
   */
  onError(callback: (data: {
    promptId: string;
    error: string;
  }) => void): void;
}

// ============================================================================
// 8. STATE TRANSITION EVENTS
// ============================================================================

/**
 * State transition event - emitted on every state change.
 *
 * Used for:
 * - UI updates (progress, state indicators)
 * - History persistence
 * - Queue advancement
 * - Analytics
 */
export type ExecutionEvent =
  | { type: "execution_created"; execution: WorkflowExecution }
  | { type: "execution_armed"; execution: WorkflowExecution; spatialInput: SpatialInputSnapshot }
  | { type: "execution_queued"; execution: WorkflowExecution }
  | { type: "execution_started"; execution: WorkflowExecution }
  | { type: "execution_progress"; executionId: string; progress: number }
  | { type: "execution_completed"; execution: WorkflowExecution; result: any }
  | { type: "execution_failed"; execution: WorkflowExecution; error: string }
  | { type: "execution_cancelled"; execution: WorkflowExecution }
  | { type: "execution_persisted"; executionId: string }
  | { type: "execution_pruned"; executionId: string };

/**
 * Event listener for execution lifecycle events
 */
export type ExecutionEventListener = (event: ExecutionEvent) => void;
