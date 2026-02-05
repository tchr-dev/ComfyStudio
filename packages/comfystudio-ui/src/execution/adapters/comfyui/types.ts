/**
 * ComfyUI Adapter Types (M3 - Pure Mapping)
 *
 * Defines the contract for deterministic WorkflowExecution → ComfyUI prompt mapping.
 * Adapter is a pure function: no I/O, no time, no random, no globals.
 *
 * Related:
 * - ADR-0009: ComfyUI Failure Semantics
 * - M3 Phase 2: Adapter Implementation
 */

// ============================================================================
// Error modeling
// ============================================================================

export type ExecutionErrorCode =
  | "ADAPTER_VALIDATION_ERROR"
  | "COMFYUI_SUBMIT_FAILED"
  | "COMFYUI_STATUS_FAILED"
  | "COMFYUI_JOB_MISSING"
  | "COMFYUI_CANCEL_FAILED"
  | "RUNNER_INVARIANT_VIOLATION"
  | "UNKNOWN";

export type ExecutionError = {
  code: ExecutionErrorCode;
  message: string;
  details?: Record<string, unknown>;
  cause?: unknown; // never serialize directly; history store should stringify safely
};

// ============================================================================
// Adapter output (ComfyUI prompt)
// ============================================================================

/**
 * ComfyUI prompt payload shape varies by deployment.
 * Keep it typed but flexible; enforce determinism via canonical serialization in tests.
 */
export type ComfyUIPromptPayload = {
  // typical ComfyUI "prompt" is a node graph object; keep unknown for now:
  prompt: Record<string, unknown>;
  // optional extras some servers accept
  client_id?: string;
  extra_data?: Record<string, unknown>;
};

/**
 * The adapter returns enough metadata for traceability and test assertions.
 */
export type ComfyUIBuildResult = {
  payload: ComfyUIPromptPayload;

  /**
   * Deterministic fingerprint of the payload (e.g., stable JSON hash),
   * used for reproducibility and debugging.
   */
  fingerprint: string;

  /**
   * Optional normalized view of bindings used to generate payload.
   * Useful for debugging mapping issues without re-parsing graphs.
   */
  bindings?: Record<string, unknown>;
};

// ============================================================================
// Workflow template registry
// ============================================================================

export interface WorkflowTemplateRegistry {
  /**
   * Resolve a workflow template by id/name.
   * Must be deterministic and side-effect free from adapter perspective.
   */
  getTemplate(workflowId: string): WorkflowTemplate | undefined;
}

/**
 * WorkflowTemplate here is intentionally abstract.
 * In your system this likely corresponds to "workflow template file v0.1".
 */
export type WorkflowTemplate = {
  id: string;
  version: string;
  // raw template (graph, bindings, metadata, etc.)
  data: Record<string, unknown>;
};

// ============================================================================
// Hasher port (for determinism)
// ============================================================================

export interface HasherPort {
  /**
   * Produce a deterministic hex/base64 digest.
   * Must be stable across platforms for reproducibility.
   */
  hashUtf8(input: string): string;

  /**
   * Canonical JSON serialization (stable key order).
   * If you already have this utility, reuse it.
   */
  stableStringify(value: unknown): string;
}

// ============================================================================
// Adapter context and interface
// ============================================================================

export type AdapterContext = {
  /**
   * Workflow templates registry / loader; should be read-only.
   * Can be in-memory in tests.
   */
  templates: WorkflowTemplateRegistry;

  /**
   * Deterministic hashing / canonical JSON stringify utilities.
   */
  hasher: HasherPort;

  /**
   * Optional hook for injecting a deterministic client_id.
   * If not used, adapter should avoid non-deterministic values.
   */
  clientId?: string;
};

export type BuildPromptResult =
  | { ok: true; value: ComfyUIBuildResult }
  | { ok: false; error: ExecutionError };

/**
 * PURE FUNCTION CONTRACT:
 * - No I/O
 * - No time
 * - No random
 * - No hidden globals
 */
export interface ComfyUIPromptAdapter {
  buildPrompt(
    execution: {
      id: string;
      toolId: string;
      workflow: string;
      settings: Record<string, any>;
      spatialInput?: {
        data: any;
        capturedAt: Date;
        revision: number;
      };
    },
    ctx: AdapterContext
  ): BuildPromptResult;
}
