/**
 * ComfyUI Adapter (Pure Mapping Layer)
 *
 * Maps WorkflowExecution → ComfyUIPromptPayload deterministically.
 * No I/O, no Date.now, no random, no env access.
 *
 * Milestone: M3.2 - Adapter Implementation
 */

import type {
  AdapterContext,
  BuildPromptResult,
  ComfyUIBuildResult,
  ComfyUIPromptAdapter,
  ComfyUIPromptPayload,
  ExecutionError,
} from "./types";

/**
 * Pure ComfyUI adapter implementation
 *
 * CONTRACT:
 * - Same input → byte-identical output (via stableStringify)
 * - All errors surfaced as ExecutionError (no throws)
 * - No side effects
 */
export class PureComfyUIAdapter implements ComfyUIPromptAdapter {
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
  ): BuildPromptResult {
    // Validate required fields
    if (!execution.id) {
      return this.validationError("Missing execution.id");
    }
    if (!execution.toolId) {
      return this.validationError("Missing execution.toolId");
    }
    if (!execution.workflow) {
      return this.validationError("Missing execution.workflow");
    }

    // Resolve workflow template
    const template = ctx.templates.getTemplate(execution.workflow);
    if (!template) {
      return this.validationError(
        `Workflow template not found: ${execution.workflow}`,
        { workflow: execution.workflow }
      );
    }

    // Validate template has data
    if (!template.data || typeof template.data !== "object") {
      return this.validationError(
        `Invalid template data for workflow: ${execution.workflow}`,
        { workflow: execution.workflow, template }
      );
    }

    // Build prompt payload (minimal v0 mapping)
    const payload = this.buildPayload(execution, template, ctx);

    // Build bindings for debugging
    const bindings = this.buildBindings(execution);

    // Compute deterministic fingerprint
    const fingerprint = this.computeFingerprint(payload, ctx);

    const result: ComfyUIBuildResult = {
      payload,
      fingerprint,
      bindings,
    };

    return { ok: true, value: result };
  }

  /**
   * Build ComfyUI prompt payload
   *
   * V0 minimal mapping:
   * - prompt = template.data.prompt ?? template.data
   * - extra_data includes execution metadata
   */
  private buildPayload(
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
    template: { data: Record<string, unknown> },
    ctx: AdapterContext
  ): ComfyUIPromptPayload {
    // Extract prompt graph from template
    const promptGraph =
      (template.data.prompt as Record<string, unknown>) ?? template.data;

    // Build extra_data for traceability
    const extra_data: Record<string, unknown> = {
      toolId: execution.toolId,
      executionId: execution.id,
      workflow: execution.workflow,
    };

    // Include revision if spatial input exists
    if (execution.spatialInput) {
      extra_data.revision = execution.spatialInput.revision;
      extra_data.spatialInput = {
        type: execution.spatialInput.data.type,
        // Don't include full data payload to keep payloads lean
        // Runner can access full spatial data from execution record
      };
    }

    const payload: ComfyUIPromptPayload = {
      prompt: promptGraph,
      extra_data,
    };

    // Include client_id if provided (for deterministic testing)
    if (ctx.clientId) {
      payload.client_id = ctx.clientId;
    }

    return payload;
  }

  /**
   * Build bindings for debugging (not sent to ComfyUI)
   */
  private buildBindings(execution: {
    settings: Record<string, any>;
    spatialInput?: {
      data: any;
      capturedAt: Date;
      revision: number;
    };
  }): Record<string, unknown> {
    const bindings: Record<string, unknown> = {
      settings: execution.settings,
    };

    if (execution.spatialInput) {
      bindings.spatialInput = {
        type: execution.spatialInput.data.type,
        revision: execution.spatialInput.revision,
        capturedAt: execution.spatialInput.capturedAt.toISOString(),
      };
    }

    return bindings;
  }

  /**
   * Compute deterministic fingerprint
   *
   * Uses stable JSON serialization + hash to ensure:
   * - Same input → same fingerprint
   * - Platform-independent
   */
  private computeFingerprint(
    payload: ComfyUIPromptPayload,
    ctx: AdapterContext
  ): string {
    const canonical = ctx.hasher.stableStringify(payload);
    return ctx.hasher.hashUtf8(canonical);
  }

  /**
   * Create validation error result
   */
  private validationError(
    message: string,
    details?: Record<string, unknown>
  ): BuildPromptResult {
    const error: ExecutionError = {
      code: "ADAPTER_VALIDATION_ERROR",
      message,
      details,
    };
    return { ok: false, error };
  }
}

/**
 * Factory function for creating adapter instances
 */
export function createComfyUIAdapter(): ComfyUIPromptAdapter {
  return new PureComfyUIAdapter();
}
