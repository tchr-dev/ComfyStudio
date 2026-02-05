/**
 * ComfyUI Adapter Unit Tests
 *
 * Tests the pure adapter mapping layer:
 * - Happy path: execution → prompt payload
 * - Validation errors
 * - Determinism guarantees
 * - Spatial input handling
 *
 * Milestone: M3.2 - Adapter Implementation
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createComfyUIAdapter } from "../adapter";
import { createHasher } from "../hasher";
import type {
  AdapterContext,
  WorkflowTemplateRegistry,
  WorkflowTemplate,
} from "../types";

describe("ComfyUI Adapter", () => {
  let adapter: ReturnType<typeof createComfyUIAdapter>;
  let ctx: AdapterContext;
  let mockTemplates: Map<string, WorkflowTemplate>;

  beforeEach(() => {
    adapter = createComfyUIAdapter();
    mockTemplates = new Map();

    // Create adapter context with mock template registry
    ctx = {
      templates: createMockTemplateRegistry(mockTemplates),
      hasher: createHasher(),
      clientId: "test-client-id", // Deterministic for testing
    };
  });

  describe("Happy Path", () => {
    it("builds prompt payload from execution and template", () => {
      // Setup template
      const template: WorkflowTemplate = {
        id: "txt2img",
        version: "1.0",
        data: {
          prompt: {
            "1": { class_type: "CheckpointLoader", inputs: {} },
            "2": { class_type: "CLIPTextEncode", inputs: { text: "test" } },
          },
        },
      };
      mockTemplates.set("txt2img", template);

      // Execute
      const result = adapter.buildPrompt(
        {
          id: "exec-1",
          toolId: "generate",
          workflow: "txt2img",
          settings: { prompt: "a beautiful sunset" },
        },
        ctx
      );

      // Assert
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.payload.prompt).toEqual(template.data.prompt);
      expect(result.value.payload.client_id).toBe("test-client-id");
      expect(result.value.payload.extra_data).toEqual({
        toolId: "generate",
        executionId: "exec-1",
        workflow: "txt2img",
      });

      expect(result.value.bindings).toEqual({
        settings: { prompt: "a beautiful sunset" },
      });

      expect(result.value.fingerprint).toBeTruthy();
      expect(result.value.fingerprint).toMatch(/^[0-9a-f]{8}$/);
    });

    it("uses template.data directly if template.data.prompt is missing", () => {
      // Template with data at root (no .prompt key)
      const template: WorkflowTemplate = {
        id: "simple",
        version: "1.0",
        data: {
          "1": { class_type: "Node", inputs: {} },
        },
      };
      mockTemplates.set("simple", template);

      const result = adapter.buildPrompt(
        {
          id: "exec-1",
          toolId: "test",
          workflow: "simple",
          settings: {},
        },
        ctx
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // Should use template.data directly as prompt
      expect(result.value.payload.prompt).toEqual(template.data);
    });
  });

  describe("Validation Errors", () => {
    it("returns error when execution.id is missing", () => {
      const result = adapter.buildPrompt(
        {
          id: "",
          toolId: "generate",
          workflow: "txt2img",
          settings: {},
        },
        ctx
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error.code).toBe("ADAPTER_VALIDATION_ERROR");
      expect(result.error.message).toContain("Missing execution.id");
    });

    it("returns error when execution.toolId is missing", () => {
      const result = adapter.buildPrompt(
        {
          id: "exec-1",
          toolId: "",
          workflow: "txt2img",
          settings: {},
        },
        ctx
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error.code).toBe("ADAPTER_VALIDATION_ERROR");
      expect(result.error.message).toContain("Missing execution.toolId");
    });

    it("returns error when execution.workflow is missing", () => {
      const result = adapter.buildPrompt(
        {
          id: "exec-1",
          toolId: "generate",
          workflow: "",
          settings: {},
        },
        ctx
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error.code).toBe("ADAPTER_VALIDATION_ERROR");
      expect(result.error.message).toContain("Missing execution.workflow");
    });

    it("returns error when workflow template not found", () => {
      const result = adapter.buildPrompt(
        {
          id: "exec-1",
          toolId: "generate",
          workflow: "nonexistent",
          settings: {},
        },
        ctx
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error.code).toBe("ADAPTER_VALIDATION_ERROR");
      expect(result.error.message).toContain("Workflow template not found");
      expect(result.error.details?.workflow).toBe("nonexistent");
    });

    it("returns error when template.data is invalid", () => {
      // Template with null data
      const template: WorkflowTemplate = {
        id: "invalid",
        version: "1.0",
        data: null as any,
      };
      mockTemplates.set("invalid", template);

      const result = adapter.buildPrompt(
        {
          id: "exec-1",
          toolId: "test",
          workflow: "invalid",
          settings: {},
        },
        ctx
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error.code).toBe("ADAPTER_VALIDATION_ERROR");
      expect(result.error.message).toContain("Invalid template data");
    });
  });

  describe("Determinism", () => {
    beforeEach(() => {
      const template: WorkflowTemplate = {
        id: "txt2img",
        version: "1.0",
        data: {
          prompt: {
            "1": { class_type: "CheckpointLoader" },
            "2": { class_type: "CLIPTextEncode" },
          },
        },
      };
      mockTemplates.set("txt2img", template);
    });

    it("produces identical fingerprint for same input", () => {
      const execution = {
        id: "exec-1",
        toolId: "generate",
        workflow: "txt2img",
        settings: { prompt: "test", steps: 20 },
      };

      const result1 = adapter.buildPrompt(execution, ctx);
      const result2 = adapter.buildPrompt(execution, ctx);

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      if (!result1.ok || !result2.ok) return;

      expect(result1.value.fingerprint).toBe(result2.value.fingerprint);
    });

    it("produces identical payload serialization for same input", () => {
      const execution = {
        id: "exec-1",
        toolId: "generate",
        workflow: "txt2img",
        settings: { prompt: "test", steps: 20 },
      };

      const result1 = adapter.buildPrompt(execution, ctx);
      const result2 = adapter.buildPrompt(execution, ctx);

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      if (!result1.ok || !result2.ok) return;

      const canonical1 = ctx.hasher.stableStringify(result1.value.payload);
      const canonical2 = ctx.hasher.stableStringify(result2.value.payload);

      expect(canonical1).toBe(canonical2);
    });

    it("produces different fingerprints for different inputs", () => {
      const execution1 = {
        id: "exec-1",
        toolId: "generate",
        workflow: "txt2img",
        settings: { prompt: "test1" },
      };

      const execution2 = {
        id: "exec-2",
        toolId: "generate",
        workflow: "txt2img",
        settings: { prompt: "test2" },
      };

      const result1 = adapter.buildPrompt(execution1, ctx);
      const result2 = adapter.buildPrompt(execution2, ctx);

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      if (!result1.ok || !result2.ok) return;

      expect(result1.value.fingerprint).not.toBe(result2.value.fingerprint);
    });

    it("handles object key ordering deterministically", () => {
      const template: WorkflowTemplate = {
        id: "test",
        version: "1.0",
        data: { prompt: {} },
      };
      mockTemplates.set("test", template);

      // Same settings, different key order
      const execution1 = {
        id: "exec-1",
        toolId: "test",
        workflow: "test",
        settings: { z: 3, a: 1, m: 2 },
      };

      const execution2 = {
        id: "exec-1",
        toolId: "test",
        workflow: "test",
        settings: { a: 1, m: 2, z: 3 },
      };

      const result1 = adapter.buildPrompt(execution1, ctx);
      const result2 = adapter.buildPrompt(execution2, ctx);

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      if (!result1.ok || !result2.ok) return;

      // Fingerprints should be identical (stable key ordering)
      expect(result1.value.fingerprint).toBe(result2.value.fingerprint);
    });
  });

  describe("Spatial Input", () => {
    beforeEach(() => {
      const template: WorkflowTemplate = {
        id: "inpaint",
        version: "1.0",
        data: { prompt: { "1": { class_type: "LoadImage" } } },
      };
      mockTemplates.set("inpaint", template);
    });

    it("includes spatial input metadata in extra_data", () => {
      const result = adapter.buildPrompt(
        {
          id: "exec-1",
          toolId: "inpaint",
          workflow: "inpaint",
          settings: {},
          spatialInput: {
            data: {
              type: "mask",
              maskId: "mask-123",
              bounds: { x: 0, y: 0, width: 512, height: 512 },
            },
            capturedAt: new Date("2024-01-01T00:00:00Z"),
            revision: 5,
          },
        },
        ctx
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.payload.extra_data?.revision).toBe(5);
      expect(result.value.payload.extra_data?.spatialInput).toEqual({
        type: "mask",
      });
    });

    it("includes spatial input in bindings for debugging", () => {
      const result = adapter.buildPrompt(
        {
          id: "exec-1",
          toolId: "inpaint",
          workflow: "inpaint",
          settings: { strength: 0.8 },
          spatialInput: {
            data: {
              type: "selection",
              x: 10,
              y: 20,
              width: 100,
              height: 200,
            },
            capturedAt: new Date("2024-01-01T00:00:00Z"),
            revision: 3,
          },
        },
        ctx
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.bindings?.spatialInput).toEqual({
        type: "selection",
        revision: 3,
        capturedAt: "2024-01-01T00:00:00.000Z",
      });
    });

    it("omits spatial input when not provided", () => {
      const result = adapter.buildPrompt(
        {
          id: "exec-1",
          toolId: "inpaint",
          workflow: "inpaint",
          settings: {},
        },
        ctx
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.payload.extra_data?.revision).toBeUndefined();
      expect(result.value.payload.extra_data?.spatialInput).toBeUndefined();
      expect(result.value.bindings?.spatialInput).toBeUndefined();
    });
  });

  describe("Settings Binding", () => {
    it("includes settings in bindings", () => {
      const template: WorkflowTemplate = {
        id: "txt2img",
        version: "1.0",
        data: { prompt: {} },
      };
      mockTemplates.set("txt2img", template);

      const settings = {
        prompt: "a beautiful landscape",
        steps: 30,
        cfg: 7.5,
        seed: 42,
      };

      const result = adapter.buildPrompt(
        {
          id: "exec-1",
          toolId: "generate",
          workflow: "txt2img",
          settings,
        },
        ctx
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.bindings?.settings).toEqual(settings);
    });
  });

  describe("Client ID", () => {
    it("includes client_id when provided in context", () => {
      const template: WorkflowTemplate = {
        id: "test",
        version: "1.0",
        data: { prompt: {} },
      };
      mockTemplates.set("test", template);

      const result = adapter.buildPrompt(
        {
          id: "exec-1",
          toolId: "test",
          workflow: "test",
          settings: {},
        },
        ctx
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.payload.client_id).toBe("test-client-id");
    });

    it("omits client_id when not provided in context", () => {
      const template: WorkflowTemplate = {
        id: "test",
        version: "1.0",
        data: { prompt: {} },
      };
      mockTemplates.set("test", template);

      const ctxNoClientId: AdapterContext = {
        templates: ctx.templates,
        hasher: ctx.hasher,
        // No clientId
      };

      const result = adapter.buildPrompt(
        {
          id: "exec-1",
          toolId: "test",
          workflow: "test",
          settings: {},
        },
        ctxNoClientId
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.payload.client_id).toBeUndefined();
    });
  });
});

/**
 * Create mock template registry for testing
 */
function createMockTemplateRegistry(
  templates: Map<string, WorkflowTemplate>
): WorkflowTemplateRegistry {
  return {
    getTemplate(workflowId: string): WorkflowTemplate | undefined {
      return templates.get(workflowId);
    },
  };
}
