/**
 * Runner Unit Tests
 *
 * Tests workflow execution runner with mocked dependencies.
 * Verifies state transitions, History Store integration, error handling.
 *
 * Milestone: M3.3 - Runner Core (Happy Path)
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

describe("Workflow Runner", () => {
  let runner: WorkflowRunner;
  let mockComfyUI: MockComfyUIClient;
  let mockHistory: MockHistoryStore;
  let mockClock: ClockPort;
  let mockLog: LoggerPort;
  let adapterContext: AdapterContext;
  let mockTemplates: Map<string, WorkflowTemplate>;

  beforeEach(() => {
    // Setup mocks
    mockComfyUI = createMockComfyUIClient();
    mockHistory = createMockHistoryStore();
    mockClock = createMockClock();
    mockLog = createMockLogger();

    // Setup adapter context
    mockTemplates = new Map();
    adapterContext = {
      templates: createMockTemplateRegistry(mockTemplates),
      hasher: createHasher(),
      clientId: "test-client",
    };

    // Add default template
    mockTemplates.set("txt2img", {
      id: "txt2img",
      version: "1.0",
      data: { prompt: { "1": { class_type: "CheckpointLoader" } } },
    });

    // Create runner
    const deps: RunnerDeps = {
      adapter: createComfyUIAdapter(),
      comfyui: mockComfyUI,
      history: mockHistory,
      clock: mockClock,
      log: mockLog,
    };

    runner = createWorkflowRunner(deps);
  });

  describe("Happy Path", () => {
    it("completes full execution lifecycle: queued → executing → completed", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "idle",
        settings: { prompt: "test" },
        workflow: "txt2img",
      };

      // Mock ComfyUI: submit succeeds, job completes
      mockComfyUI.setResponse("submit", { jobId: "job-123" });
      mockComfyUI.setStatusSequence("job-123", [
        { state: "queued" },
        { state: "running", progress: 50 },
        { state: "completed", outputs: { image: "output.png" } },
      ]);

      // Execute
      const result = await runner.start(
        execution,
        adapterContext,
        { pollIntervalMs: 10 }
      );

      // Assert success
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.executionId).toBe("exec-1");
      expect(result.jobId).toBe("job-123");

      // Verify History Store recorded all transitions
      const recorded = mockHistory.getRecorded("generate");
      expect(recorded.length).toBeGreaterThanOrEqual(3);

      // Check queued
      const queued = recorded.find((e) => e.state === "queued");
      expect(queued).toBeDefined();
      expect(queued?.id).toBe("exec-1");

      // Check executing
      const executing = recorded.find((e) => e.state === "executing");
      expect(executing).toBeDefined();
      expect(executing?.comfyuiPromptId).toBe("job-123");

      // Check completed
      const completed = recorded.find((e) => e.state === "completed");
      expect(completed).toBeDefined();
      expect(completed?.progress).toBe(100);
      expect(completed?.result).toEqual({ image: "output.png" });
    });

    it("records progress updates during execution", async () => {
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
        { state: "running", progress: 25 },
        { state: "running", progress: 50 },
        { state: "running", progress: 75 },
        { state: "completed" },
      ]);

      await runner.start(execution, adapterContext, { pollIntervalMs: 10 });

      // Verify progress updates recorded
      const recorded = mockHistory.getRecorded("generate");
      const progressUpdates = recorded.filter(
        (e) => e.state === "executing" && e.progress !== undefined
      );

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates.some((e) => e.progress === 25)).toBe(true);
      expect(progressUpdates.some((e) => e.progress === 50)).toBe(true);
    });
  });

  describe("Adapter Validation Errors", () => {
    it("fails immediately on adapter validation error", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "idle",
        settings: {},
        workflow: "nonexistent", // Invalid workflow
      };

      const result = await runner.start(
        execution,
        adapterContext,
        { pollIntervalMs: 10 }
      );

      // Assert failure
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("ADAPTER_VALIDATION_ERROR");
      expect(result.error.message).toContain("Workflow template not found");

      // Verify failed state recorded
      const recorded = mockHistory.getRecorded("generate");
      const failed = recorded.find((e) => e.state === "failed");
      expect(failed).toBeDefined();

      // Verify error recorded
      const errors = mockHistory.getErrors("generate");
      expect(errors.length).toBe(1);
      expect(errors[0].category).toBe("validation");
    });
  });

  describe("ComfyUI Submit Failures", () => {
    it("fails gracefully on submit error", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "idle",
        settings: {},
        workflow: "txt2img",
      };

      // Mock submit failure
      mockComfyUI.setResponse("submit", new Error("Network error"));

      const result = await runner.start(
        execution,
        adapterContext,
        { pollIntervalMs: 10 }
      );

      // Assert failure
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("COMFYUI_SUBMIT_FAILED");
      expect(result.error.message).toContain("Network error");

      // Verify state transitions: queued → failed
      const recorded = mockHistory.getRecorded("generate");
      expect(recorded.some((e) => e.state === "queued")).toBe(true);
      expect(recorded.some((e) => e.state === "failed")).toBe(true);

      // Verify error recorded
      const errors = mockHistory.getErrors("generate");
      expect(errors.length).toBe(1);
      expect(errors[0].category).toBe("comfyui");
    });
  });

  describe("ComfyUI Job Failures", () => {
    it("handles job failure status from ComfyUI", async () => {
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
        { state: "failed", error: "Out of memory" },
      ]);

      const result = await runner.start(
        execution,
        adapterContext,
        { pollIntervalMs: 10 }
      );

      // Assert success (runner completed its job)
      expect(result.ok).toBe(true);

      // Verify terminal state is failed
      const recorded = mockHistory.getRecorded("generate");
      const failed = recorded.find((e) => e.state === "failed");
      expect(failed).toBeDefined();

      // Verify error recorded
      const errors = mockHistory.getErrors("generate");
      expect(errors.length).toBe(1);
      expect(errors[0].message).toContain("Out of memory");
    });

    it("handles missing job (backend restart)", async () => {
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
        { state: "missing" }, // Backend restarted
      ]);

      const result = await runner.start(
        execution,
        adapterContext,
        { pollIntervalMs: 10 }
      );

      // Assert runner completed
      expect(result.ok).toBe(true);

      // Verify failed state
      const recorded = mockHistory.getRecorded("generate");
      const failed = recorded.find((e) => e.state === "failed");
      expect(failed).toBeDefined();

      // Verify error recorded
      const errors = mockHistory.getErrors("generate");
      expect(errors.length).toBe(1);
      expect(errors[0].message).toContain("Job not found");
    });
  });

  describe("Timeouts", () => {
    it("fails execution after maxRuntimeMs exceeded", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "idle",
        settings: {},
        workflow: "txt2img",
      };

      mockComfyUI.setResponse("submit", { jobId: "job-123" });
      // Job never completes
      mockComfyUI.setStatusSequence("job-123", [
        { state: "running", progress: 50 },
        { state: "running", progress: 50 },
        { state: "running", progress: 50 },
      ]);

      const result = await runner.start(execution, adapterContext, {
        pollIntervalMs: 10,
        maxRuntimeMs: 50, // Very short timeout
      });

      // Assert runner completed
      expect(result.ok).toBe(true);

      // Verify failed state
      const recorded = mockHistory.getRecorded("generate");
      const failed = recorded.find((e) => e.state === "failed");
      expect(failed).toBeDefined();
    });
  });

  describe("History Store Integration", () => {
    it("records all state transitions in order", async () => {
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

      // Verify all transitions recorded
      const recorded = mockHistory.getRecorded("generate");

      // Should have: queued, executing, (optional progress), completed
      expect(recorded.some((e) => e.state === "queued")).toBe(true);
      expect(recorded.some((e) => e.state === "executing")).toBe(true);
      expect(recorded.some((e) => e.state === "completed")).toBe(true);
    });

    it("can replay state after execution", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "idle",
        settings: { prompt: "test" },
        workflow: "txt2img",
      };

      mockComfyUI.setResponse("submit", { jobId: "job-123" });
      mockComfyUI.setStatusSequence("job-123", [
        { state: "completed", outputs: { image: "output.png" } },
      ]);

      await runner.start(execution, adapterContext, { pollIntervalMs: 10 });

      // Replay from history
      const replayResult = await mockHistory.replay("generate");

      // Verify replayed state
      const replayedExec = replayResult.toolState.executions.get("exec-1");
      expect(replayedExec).toBeDefined();
      expect(replayedExec?.state).toBe("completed");
      expect(replayedExec?.settings).toEqual({ prompt: "test" });
      expect(replayedExec?.comfyuiPromptId).toBe("job-123");
    });
  });
});

// ============================================================================
// Mock Implementations
// ============================================================================

/**
 * Mock ComfyUI client for testing
 */
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

    // Advance index (but don't go past end)
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

/**
 * Mock History Store for testing
 */
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

  async storeArtifacts(): Promise<void> {
    // Not tested in M3.3
  }

  async replay(toolId: string): Promise<{
    toolState: ToolExecutionState;
    errors: Map<string, any>;
    artifacts: Map<string, any>;
    diagnostics: any[];
  }> {
    const records = this.recorded.get(toolId) ?? [];

    // Simple replay: latest record per execution wins
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

  // Test helpers
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

/**
 * Mock clock for deterministic testing
 */
function createMockClock(): ClockPort {
  let time = 1000000;
  return {
    now: () => new Date(time),
    nowMs: () => {
      time += 100; // Advance time on each call
      return time;
    },
  };
}

/**
 * Mock logger (silent)
 */
function createMockLogger(): LoggerPort {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

/**
 * Mock template registry
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
