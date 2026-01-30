/**
 * Recovery & Hardening Tests
 *
 * Tests missing job confirmation, recovery policies, and edge cases.
 *
 * Milestone: M3.5 - Progress, Recovery & Hardening
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createWorkflowRunner } from "../runner";
import { createComfyUIAdapter } from "../../adapters/comfyui/adapter";
import { createHasher } from "../../adapters/comfyui/hasher";
import type {
  WorkflowRunner,
  RunnerDeps,
  ComfyUIClientPort,
  ComfyUIJobStatus,
  ClockPort,
  LoggerPort,
} from "../types";
import type { WorkflowExecution, ToolExecutionState } from "../../types";
import type { HistoryStore } from "../../history/api";
import type {
  AdapterContext,
  WorkflowTemplateRegistry,
  WorkflowTemplate,
} from "../../adapters/comfyui/types";

describe("Recovery & Hardening", () => {
  let runner: WorkflowRunner;
  let mockComfyUI: MockComfyUIClient;
  let mockHistory: MockHistoryStore;
  let mockClock: ClockPort;
  let mockLog: LoggerPort;
  let adapterContext: AdapterContext;
  let mockTemplates: Map<string, WorkflowTemplate>;

  beforeEach(() => {
    mockComfyUI = createMockComfyUIClient();
    mockHistory = createMockHistoryStore();
    mockClock = createMockClock();
    mockLog = createMockLogger();

    mockTemplates = new Map();
    adapterContext = {
      templates: createMockTemplateRegistry(mockTemplates),
      hasher: createHasher(),
      clientId: "test-client",
    };

    mockTemplates.set("txt2img", {
      id: "txt2img",
      version: "1.0",
      data: { prompt: { "1": { class_type: "CheckpointLoader" } } },
    });

    const deps: RunnerDeps = {
      adapter: createComfyUIAdapter(),
      comfyui: mockComfyUI,
      history: mockHistory,
      clock: mockClock,
      log: mockLog,
    };

    runner = createWorkflowRunner(deps);
  });

  describe("Missing Job Confirmation (ADR-0009)", () => {
    it("requires N consecutive missing observations before failing", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "idle",
        settings: {},
        workflow: "txt2img",
      };

      mockComfyUI.setResponse("submit", { jobId: "job-123" });
      // Job goes missing, then comes back, then missing again
      mockComfyUI.setStatusSequence("job-123", [
        { state: "running", progress: 25 },
        { state: "missing" }, // First missing (count = 1)
        { state: "running", progress: 50 }, // Comes back (count resets to 0)
        { state: "missing" }, // Missing again (count = 1)
        { state: "missing" }, // Second consecutive (count = 2, triggers failure)
      ]);

      const result = await runner.start(execution, adapterContext, {
        pollIntervalMs: 10,
        missingJobConfirmations: 2, // Require 2 consecutive
      });

      expect(result.ok).toBe(true);

      // Verify failed state
      const recorded = mockHistory.getRecorded("generate");
      const failed = recorded.find((e) => e.state === "failed");
      expect(failed).toBeDefined();

      // Verify error mentions consecutive checks
      const errors = mockHistory.getErrors("generate");
      expect(errors.length).toBe(1);
      expect(errors[0].message).toContain("2 consecutive checks");
    });

    it("does not fail on single transient missing status", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "idle",
        settings: {},
        workflow: "txt2img",
      };

      mockComfyUI.setResponse("submit", { jobId: "job-123" });
      // Single missing, then recovers
      mockComfyUI.setStatusSequence("job-123", [
        { state: "running", progress: 25 },
        { state: "missing" }, // Transient missing
        { state: "running", progress: 75 }, // Recovers
        { state: "completed" },
      ]);

      const result = await runner.start(execution, adapterContext, {
        pollIntervalMs: 10,
        missingJobConfirmations: 2,
      });

      expect(result.ok).toBe(true);

      // Verify completed (not failed)
      const recorded = mockHistory.getRecorded("generate");
      const completed = recorded.find((e) => e.state === "completed");
      expect(completed).toBeDefined();
    });

    it("fails immediately if backend repeatedly returns missing", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "idle",
        settings: {},
        workflow: "txt2img",
      };

      mockComfyUI.setResponse("submit", { jobId: "job-123" });
      // Backend consistently returns missing
      mockComfyUI.setStatusSequence("job-123", [
        { state: "missing" },
        { state: "missing" },
        { state: "missing" },
      ]);

      const result = await runner.start(execution, adapterContext, {
        pollIntervalMs: 10,
        missingJobConfirmations: 2,
      });

      expect(result.ok).toBe(true);

      // Verify failed state after 2 consecutive
      const recorded = mockHistory.getRecorded("generate");
      const failed = recorded.find((e) => e.state === "failed");
      expect(failed).toBeDefined();
    });

    it("allows custom confirmation threshold", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "idle",
        settings: {},
        workflow: "txt2img",
      };

      mockComfyUI.setResponse("submit", { jobId: "job-123" });
      // 3 consecutive missing
      mockComfyUI.setStatusSequence("job-123", [
        { state: "running" },
        { state: "missing" },
        { state: "missing" },
        { state: "missing" }, // Third triggers failure
      ]);

      const result = await runner.start(execution, adapterContext, {
        pollIntervalMs: 10,
        missingJobConfirmations: 3, // Require 3 consecutive
      });

      expect(result.ok).toBe(true);

      const recorded = mockHistory.getRecorded("generate");
      const failed = recorded.find((e) => e.state === "failed");
      expect(failed).toBeDefined();

      const errors = mockHistory.getErrors("generate");
      expect(errors[0].message).toContain("3 consecutive checks");
    });
  });

  describe("Progress Updates", () => {
    it("records progress updates when available", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "idle",
        settings: {},
        workflow: "txt2img",
      };

      mockComfyUI.setResponse("submit", { jobId: "job-123" });
      mockComfyUI.setStatusSequence("job-123", [
        { state: "running", progress: 0 },
        { state: "running", progress: 33 },
        { state: "running", progress: 66 },
        { state: "running", progress: 100 },
        { state: "completed" },
      ]);

      await runner.start(execution, adapterContext, { pollIntervalMs: 10 });

      const recorded = mockHistory.getRecorded("generate");
      const withProgress = recorded.filter((e) => e.progress !== undefined);

      // Should have multiple progress updates
      expect(withProgress.length).toBeGreaterThan(2);
      expect(withProgress.some((e) => e.progress === 33)).toBe(true);
      expect(withProgress.some((e) => e.progress === 66)).toBe(true);
    });

    it("does not fail when progress is absent", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "idle",
        settings: {},
        workflow: "txt2img",
      };

      mockComfyUI.setResponse("submit", { jobId: "job-123" });
      // No progress values
      mockComfyUI.setStatusSequence("job-123", [
        { state: "running" }, // No progress field
        { state: "running" },
        { state: "completed" },
      ]);

      const result = await runner.start(execution, adapterContext, {
        pollIntervalMs: 10,
      });

      expect(result.ok).toBe(true);

      const recorded = mockHistory.getRecorded("generate");
      const completed = recorded.find((e) => e.state === "completed");
      expect(completed).toBeDefined();
    });
  });

  describe("Logging & Observability", () => {
    it("logs all major lifecycle events", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "idle",
        settings: {},
        workflow: "txt2img",
      };

      mockComfyUI.setResponse("submit", { jobId: "job-123" });
      mockComfyUI.setStatusSequence("job-123", [
        { state: "running", progress: 50 },
        { state: "completed" },
      ]);

      await runner.start(execution, adapterContext, { pollIntervalMs: 10 });

      // Verify logging calls
      expect(mockLog.info).toHaveBeenCalledWith(
        "Starting execution",
        expect.any(Object)
      );
      expect(mockLog.info).toHaveBeenCalledWith(
        "Execution queued",
        expect.any(Object)
      );
      expect(mockLog.info).toHaveBeenCalledWith(
        "Prompt submitted to ComfyUI",
        expect.any(Object)
      );
      expect(mockLog.info).toHaveBeenCalledWith(
        "Execution started",
        expect.any(Object)
      );
      expect(mockLog.info).toHaveBeenCalledWith(
        "Job completed",
        expect.any(Object)
      );
    });

    it("logs errors with context", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "idle",
        settings: {},
        workflow: "txt2img",
      };

      mockComfyUI.setResponse("submit", new Error("Network error"));

      await runner.start(execution, adapterContext, { pollIntervalMs: 10 });

      // Verify error logging
      expect(mockLog.error).toHaveBeenCalledWith(
        "ComfyUI submit failed",
        expect.objectContaining({
          executionId: "exec-1",
        })
      );
    });
  });

  describe("Edge Cases", () => {
    it("handles rapid state transitions", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "idle",
        settings: {},
        workflow: "txt2img",
      };

      mockComfyUI.setResponse("submit", { jobId: "job-123" });
      // Very fast execution
      mockComfyUI.setStatusSequence("job-123", [
        { state: "completed" }, // Completes immediately
      ]);

      const result = await runner.start(execution, adapterContext, {
        pollIntervalMs: 10,
      });

      expect(result.ok).toBe(true);

      const recorded = mockHistory.getRecorded("generate");
      const completed = recorded.find((e) => e.state === "completed");
      expect(completed).toBeDefined();
    });

    it("handles backend status flapping", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "idle",
        settings: {},
        workflow: "txt2img",
      };

      mockComfyUI.setResponse("submit", { jobId: "job-123" });
      // Status flaps between states
      mockComfyUI.setStatusSequence("job-123", [
        { state: "queued" },
        { state: "running", progress: 10 },
        { state: "queued" }, // Flap back
        { state: "running", progress: 50 },
        { state: "completed" },
      ]);

      const result = await runner.start(execution, adapterContext, {
        pollIntervalMs: 10,
      });

      expect(result.ok).toBe(true);

      const recorded = mockHistory.getRecorded("generate");
      const completed = recorded.find((e) => e.state === "completed");
      expect(completed).toBeDefined();
    });
  });
});

// ============================================================================
// Mock Implementations
// ============================================================================

class MockComfyUIClient implements ComfyUIClientPort {
  private submitResponse: { jobId: string } | Error = { jobId: "default-job" };
  private statusSequences = new Map<string, ComfyUIJobStatus[]>();
  private statusIndices = new Map<string, number>();

  setResponse(method: "submit", response: { jobId: string } | Error): void {
    this.submitResponse = response;
  }

  setStatusSequence(jobId: string, sequence: ComfyUIJobStatus[]): void {
    this.statusSequences.set(jobId, sequence);
    this.statusIndices.set(jobId, 0);
  }

  async submitPrompt(): Promise<{ jobId: string }> {
    if (this.submitResponse instanceof Error) {
      throw this.submitResponse;
    }
    return this.submitResponse;
  }

  async getStatus(jobId: string): Promise<ComfyUIJobStatus> {
    const sequence = this.statusSequences.get(jobId);
    if (!sequence) {
      return { state: "missing" };
    }

    const index = this.statusIndices.get(jobId) ?? 0;
    const status = sequence[Math.min(index, sequence.length - 1)];

    if (index < sequence.length - 1) {
      this.statusIndices.set(jobId, index + 1);
    }

    return status;
  }

  async cancel(): Promise<{ cancelled: boolean }> {
    return { cancelled: true };
  }
}

function createMockComfyUIClient(): MockComfyUIClient {
  return new MockComfyUIClient();
}

class MockHistoryStore implements HistoryStore {
  private recorded = new Map<string, WorkflowExecution[]>();
  private errors = new Map<
    string,
    Array<{ category: string; message: string; executionId: string }>
  >();

  async recordExecution(
    toolId: string,
    execution: WorkflowExecution
  ): Promise<void> {
    const records = this.recorded.get(toolId) ?? [];
    records.push({ ...execution });
    this.recorded.set(toolId, records);
  }

  async recordError(
    toolId: string,
    executionId: string,
    error: { category: string; message: string }
  ): Promise<string> {
    const errors = this.errors.get(toolId) ?? [];
    const errorId = `error-${errors.length + 1}`;
    errors.push({ ...error, executionId });
    this.errors.set(toolId, errors);
    return errorId;
  }

  async storeArtifacts(): Promise<void> {}

  async replay(toolId: string): Promise<{
    toolState: ToolExecutionState;
    errors: Map<string, any>;
    artifacts: Map<string, any>;
    diagnostics: any[];
  }> {
    const records = this.recorded.get(toolId) ?? [];
    const executions = new Map<string, WorkflowExecution>();
    for (const record of records) {
      executions.set(record.id, record);
    }

    const toolState: ToolExecutionState = {
      toolId,
      executions,
      queuedIds: [],
      executingIds: [],
    };

    return {
      toolState,
      errors: new Map(),
      artifacts: new Map(),
      diagnostics: [],
    };
  }

  async replayAll(): Promise<Map<string, ToolExecutionState>> {
    return new Map();
  }

  async prune(): Promise<any> {
    return {};
  }

  async getPruningConfig(): Promise<any> {
    return null;
  }

  async setPruningConfig(): Promise<void> {}

  async listTools(): Promise<string[]> {
    return Array.from(this.recorded.keys());
  }

  async getStats(): Promise<any> {
    return {};
  }

  getRecorded(toolId: string): WorkflowExecution[] {
    return this.recorded.get(toolId) ?? [];
  }

  getErrors(toolId: string): Array<any> {
    return this.errors.get(toolId) ?? [];
  }
}

function createMockHistoryStore(): MockHistoryStore {
  return new MockHistoryStore();
}

function createMockClock(): ClockPort {
  let time = 1000000;
  return {
    now: () => new Date(time),
    nowMs: () => {
      time += 100;
      return time;
    },
  };
}

function createMockLogger(): LoggerPort {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function createMockTemplateRegistry(
  templates: Map<string, WorkflowTemplate>
): WorkflowTemplateRegistry {
  return {
    getTemplate(workflowId: string): WorkflowTemplate | undefined {
      return templates.get(workflowId);
    },
  };
}
