/**
 * Cancellation Tests
 *
 * Tests cancellation semantics, race conditions, terminal immutability.
 *
 * Milestone: M3.4 - Cancellation + Failure Semantics
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

describe("Cancellation", () => {
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

  describe("Cancel During Execution", () => {
    it("cancels running execution", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "idle",
        settings: {},
        workflow: "txt2img",
      };

      mockComfyUI.setResponse("submit", { jobId: "job-123" });
      // Job runs for a while, then cancel kicks in
      mockComfyUI.setStatusSequence("job-123", [
        { state: "running", progress: 25 },
        { state: "running", progress: 50 },
        { state: "running", progress: 75 }, // Will be cancelled here
        { state: "running", progress: 100 },
        { state: "completed" },
      ]);

      // Start execution (non-blocking)
      const startPromise = runner.start(execution, adapterContext, {
        pollIntervalMs: 10,
      });

      // Wait a bit for execution to start
      await new Promise((resolve) => setTimeout(resolve, 30));

      // Cancel
      const cancelResult = await runner.cancel!(
        "generate",
        "exec-1",
        "job-123"
      );

      expect(cancelResult.ok).toBe(true);
      if (cancelResult.ok) {
        expect(cancelResult.cancelled).toBe(true);
      }

      // Wait for start to complete
      const startResult = await startPromise;
      expect(startResult.ok).toBe(true);

      // Verify cancelled state recorded
      const recorded = mockHistory.getRecorded("generate");
      const cancelled = recorded.find((e) => e.state === "cancelled");
      expect(cancelled).toBeDefined();

      // Verify ComfyUI cancel was called
      expect(mockComfyUI.cancelCalled).toBe(true);
    });
  });

  describe("Terminal Immutability", () => {
    it("cannot cancel completed execution", async () => {
      // Record completed execution
      const completedExecution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "completed",
        settings: {},
        workflow: "txt2img",
        queuedAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
        comfyuiPromptId: "job-123",
      };

      await mockHistory.recordExecution("generate", completedExecution);

      // Try to cancel
      const result = await runner.cancel!("generate", "exec-1", "job-123");

      // Should succeed but not change state
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.cancelled).toBe(false); // Already terminal
      }

      // Verify no cancelled state recorded
      const recorded = mockHistory.getRecorded("generate");
      expect(recorded.every((e) => e.state !== "cancelled")).toBe(true);
    });

    it("cannot cancel failed execution", async () => {
      // Record failed execution
      const failedExecution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "failed",
        settings: {},
        workflow: "txt2img",
        queuedAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
        comfyuiPromptId: "job-123",
      };

      await mockHistory.recordExecution("generate", failedExecution);

      // Try to cancel
      const result = await runner.cancel!("generate", "exec-1", "job-123");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.cancelled).toBe(false);
      }
    });

    it("cannot cancel already cancelled execution", async () => {
      // Record cancelled execution
      const cancelledExecution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "cancelled",
        settings: {},
        workflow: "txt2img",
        queuedAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
        comfyuiPromptId: "job-123",
      };

      await mockHistory.recordExecution("generate", cancelledExecution);

      // Try to cancel again
      const result = await runner.cancel!("generate", "exec-1", "job-123");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.cancelled).toBe(false);
      }
    });
  });

  describe("Cancel Before Execution Starts", () => {
    it("cancels queued execution immediately", async () => {
      // Record queued execution
      const queuedExecution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "queued",
        settings: {},
        workflow: "txt2img",
        queuedAt: new Date(),
      };

      await mockHistory.recordExecution("generate", queuedExecution);

      // Cancel before starting
      const result = await runner.cancel!("generate", "exec-1");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.cancelled).toBe(true);
      }

      // Verify cancelled state recorded
      const recorded = mockHistory.getRecorded("generate");
      const cancelled = recorded.find((e) => e.state === "cancelled");
      expect(cancelled).toBeDefined();
    });
  });

  describe("Race Conditions", () => {
    it("handles cancel vs complete race (cancel first)", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "idle",
        settings: {},
        workflow: "txt2img",
      };

      mockComfyUI.setResponse("submit", { jobId: "job-123" });
      // Job keeps running (never completes naturally)
      mockComfyUI.setStatusSequence("job-123", [
        { state: "running", progress: 25 },
        { state: "running", progress: 50 },
        { state: "running", progress: 75 },
        { state: "running", progress: 90 },
      ]);

      // Start execution
      const startPromise = runner.start(execution, adapterContext, {
        pollIntervalMs: 10,
      });

      // Wait for execution to be running
      await new Promise((resolve) => setTimeout(resolve, 25));

      // Cancel while running
      await runner.cancel!("generate", "exec-1", "job-123");

      // Wait for start to complete
      await startPromise;

      // Verify cancelled state recorded
      const recorded = mockHistory.getRecorded("generate");
      const cancelled = recorded.find((e) => e.state === "cancelled");

      // Should have cancelled (cancel was processed during poll)
      expect(cancelled).toBeDefined();
      expect(cancelled?.state).toBe("cancelled");
    });
  });

  describe("ComfyUI Cancel Failure", () => {
    it("succeeds even if ComfyUI cancel fails", async () => {
      // Record executing execution
      const executingExecution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "executing",
        settings: {},
        workflow: "txt2img",
        queuedAt: new Date(),
        startedAt: new Date(),
        comfyuiPromptId: "job-123",
      };

      await mockHistory.recordExecution("generate", executingExecution);

      // Make ComfyUI cancel fail
      mockComfyUI.setCancelError(new Error("Network error"));

      // Cancel should still succeed (best effort)
      const result = await runner.cancel!("generate", "exec-1", "job-123");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.cancelled).toBe(true);
      }

      // Verify cancelled state recorded
      const recorded = mockHistory.getRecorded("generate");
      const cancelled = recorded.find((e) => e.state === "cancelled");
      expect(cancelled).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("handles execution not found", async () => {
      const result = await runner.cancel!(
        "generate",
        "nonexistent",
        "job-123"
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("EXECUTION_NOT_FOUND");
      }
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
  private cancelError: Error | null = null;
  public cancelCalled = false;

  setResponse(method: "submit", response: { jobId: string } | Error): void {
    this.submitResponse = response;
  }

  setStatusSequence(jobId: string, sequence: ComfyUIJobStatus[]): void {
    this.statusSequences.set(jobId, sequence);
    this.statusIndices.set(jobId, 0);
  }

  setCancelError(error: Error | null): void {
    this.cancelError = error;
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
    this.cancelCalled = true;

    if (this.cancelError) {
      throw this.cancelError;
    }

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
