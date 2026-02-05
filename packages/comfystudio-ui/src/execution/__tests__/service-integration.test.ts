/**
 * Service Integration Tests
 *
 * Tests execution service wiring: runner → service → UI.
 * Validates observation boundary and command dispatch.
 *
 * Milestone: M4.1 - Runner ↔ UI Wiring
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createExecutionService } from "../service";
import { createWorkflowRunner } from "../runner/runner";
import { createHistoryStore } from "../history/api";
import { createComfyUIAdapter } from "../adapters/comfyui/adapter";
import { createHasher } from "../adapters/comfyui/hasher";
import type { WorkflowExecution } from "../types";
import type {
  ComfyUIClientPort,
  ComfyUIJobStatus,
  ClockPort,
  LoggerPort,
} from "../runner/types";
import type { HistoryStorePorts, FileSystemPort } from "../history/ports";
import type {
  WorkflowTemplateRegistry,
  WorkflowTemplate,
} from "../adapters/comfyui/types";

describe("Service Integration", () => {
  let service: ReturnType<typeof createExecutionService>;
  let mockComfyUI: MockComfyUIClient;
  let mockFs: MockFileSystem;

  beforeEach(() => {
    // Setup mocks
    mockComfyUI = createMockComfyUIClient();
    mockFs = createMockFileSystem();

    const historyPorts = createMockHistoryPorts(mockFs);
    const history = createHistoryStore("/workspace", historyPorts);

    const runner = createWorkflowRunner({
      adapter: createComfyUIAdapter(),
      comfyui: mockComfyUI,
      history,
      clock: createMockClock(),
      log: createMockLogger(),
    });

    const mockTemplates = new Map<string, WorkflowTemplate>();
    mockTemplates.set("txt2img", {
      id: "txt2img",
      version: "1.0",
      data: { prompt: { "1": { class_type: "CheckpointLoader" } } },
    });

    service = createExecutionService(runner, history, {
      workspaceRoot: "/workspace",
      runnerOptions: { pollIntervalMs: 10 },
      adapterContext: {
        templates: createMockTemplateRegistry(mockTemplates),
        hasher: createHasher(),
        clientId: "test-client",
      },
    });
  });

  describe("Command Dispatch", () => {
    it("dispatches start command to runner", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "idle",
        settings: {},
        workflow: "txt2img",
      };

      mockComfyUI.setResponse("submit", { jobId: "job-123" });
      mockComfyUI.setStatusSequence("job-123", [{ state: "completed" }]);

      const result = await service.startExecution(execution);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.executionId).toBe("exec-1");
        // Service uses execution.id as tracking ID initially
        // (ComfyUI jobId not available until runner completes)
        expect(result.jobId).toBe("exec-1");
      }
    });

    it("dispatches cancel command to runner", async () => {
      // Start execution first
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "idle",
        settings: {},
        workflow: "txt2img",
      };

      mockComfyUI.setResponse("submit", { jobId: "job-123" });
      mockComfyUI.setStatusSequence("job-123", [
        { state: "running" },
        { state: "running" },
      ]);

      await service.startExecution(execution);

      // Now cancel
      const cancelResult = await service.cancelExecution("generate", "exec-1");

      expect(cancelResult.ok).toBe(true);
    });
  });

  describe("State Observation", () => {
    it("provides read-only state snapshot", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "idle",
        settings: {},
        workflow: "txt2img",
      };

      mockComfyUI.setResponse("submit", { jobId: "job-123" });
      mockComfyUI.setStatusSequence("job-123", [{ state: "completed" }]);

      await service.startExecution(execution);

      // Small delay for async state updates
      await new Promise((resolve) => setTimeout(resolve, 50));

      const snapshot = await service.getSnapshot();

      expect(snapshot.executionsByTool).toBeDefined();
      expect(snapshot.status).toBe("idle");
    });

    it("tracks active jobs", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "idle",
        settings: {},
        workflow: "txt2img",
      };

      mockComfyUI.setResponse("submit", { jobId: "job-123" });
      mockComfyUI.setStatusSequence("job-123", [
        { state: "running" },
        { state: "running" },
      ]);

      const startPromise = service.startExecution(execution);

      // Check snapshot during execution
      await new Promise((resolve) => setTimeout(resolve, 20));
      const snapshot = await service.getSnapshot();

      expect(snapshot.activeJobs.size).toBeGreaterThan(0);

      await startPromise;
    });
  });

  describe("Event Emission", () => {
    it("emits execution_started event", async () => {
      const events: Array<any> = [];
      service.subscribe((event) => events.push(event));

      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "idle",
        settings: {},
        workflow: "txt2img",
      };

      mockComfyUI.setResponse("submit", { jobId: "job-123" });
      mockComfyUI.setStatusSequence("job-123", [{ state: "completed" }]);

      await service.startExecution(execution);

      const startedEvent = events.find((e) => e.type === "execution_started");
      expect(startedEvent).toBeDefined();
      expect(startedEvent?.executionId).toBe("exec-1");
      // Service uses execution.id as tracking ID
      expect(startedEvent?.jobId).toBe("exec-1");
    });

    it("emits execution_failed event on error", async () => {
      const events: Array<any> = [];
      service.subscribe((event) => events.push(event));

      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "idle",
        settings: {},
        workflow: "nonexistent", // Invalid workflow
      };

      await service.startExecution(execution);

      const failedEvent = events.find((e) => e.type === "execution_failed");
      expect(failedEvent).toBeDefined();
      expect(failedEvent?.error).toContain("Workflow template not found");
    });

    it("supports unsubscribe", async () => {
      const events: Array<any> = [];
      const unsubscribe = service.subscribe((event) => events.push(event));

      // Unsubscribe immediately
      unsubscribe();

      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "idle",
        settings: {},
        workflow: "txt2img",
      };

      mockComfyUI.setResponse("submit", { jobId: "job-123" });
      mockComfyUI.setStatusSequence("job-123", [{ state: "completed" }]);

      await service.startExecution(execution);

      // Should not receive events
      expect(events.length).toBe(0);
    });
  });

  describe("Rehydration", () => {
    it("rehydrates state from history", async () => {
      // Create execution and record in history
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "generate",
        state: "completed",
        settings: {},
        workflow: "txt2img",
        queuedAt: new Date(),
        completedAt: new Date(),
      };

      mockComfyUI.setResponse("submit", { jobId: "job-123" });
      mockComfyUI.setStatusSequence("job-123", [{ state: "completed" }]);

      await service.startExecution(execution);
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Rehydrate
      await service.rehydrate();

      const snapshot = await service.getSnapshot();
      expect(snapshot.executionsByTool.size).toBeGreaterThan(0);
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
    if (!sequence) return { state: "missing" };

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

type MockFileSystem = FileSystemPort & {
  files: Map<string, string>;
  dirs: Set<string>;
};

function createMockFileSystem(): MockFileSystem {
  const files = new Map<string, string>();
  const dirs = new Set<string>();

  return {
    files,
    dirs,
    async readFile(path: string): Promise<string> {
      const content = files.get(path);
      if (content === undefined) {
        throw new Error(`ENOENT: no such file '${path}'`);
      }
      return content;
    },
    async writeFile(path: string, content: string): Promise<void> {
      files.set(path, content);
    },
    async rename(oldPath: string, newPath: string): Promise<void> {
      const content = files.get(oldPath);
      if (content === undefined) {
        throw new Error(`ENOENT: no such file '${oldPath}'`);
      }
      files.delete(oldPath);
      files.set(newPath, content);
    },
    async mkdir(path: string): Promise<void> {
      const parts = path.split("/");
      for (let i = 1; i <= parts.length; i++) {
        dirs.add(parts.slice(0, i).join("/") || "/");
      }
    },
    async exists(path: string): Promise<boolean> {
      return files.has(path) || dirs.has(path);
    },
    async stat(path: string): Promise<any> {
      if (files.has(path)) {
        return {
          size: files.get(path)!.length,
          mtimeMs: Date.now(),
          isFile: () => true,
          isDirectory: () => false,
        };
      }
      if (dirs.has(path)) {
        return {
          size: 0,
          mtimeMs: Date.now(),
          isFile: () => false,
          isDirectory: () => true,
        };
      }
      throw new Error(`ENOENT: no such file or directory '${path}'`);
    },
    async readdir(path: string): Promise<string[]> {
      if (!dirs.has(path)) {
        throw new Error(`ENOENT: no such directory '${path}'`);
      }

      const results: string[] = [];
      const prefix = path === "/" ? "/" : path + "/";

      for (const dir of dirs) {
        if (dir.startsWith(prefix) && dir !== path) {
          const relative = dir.slice(prefix.length);
          const name = relative.split("/")[0];
          if (name && !results.includes(name)) {
            results.push(name);
          }
        }
      }

      return results;
    },
    async unlink(path: string): Promise<void> {
      files.delete(path);
    },
    async rmdir(path: string, options?: { recursive?: boolean }): Promise<void> {
      if (options?.recursive) {
        for (const file of Array.from(files.keys())) {
          if (file.startsWith(path)) files.delete(file);
        }
        for (const dir of Array.from(dirs)) {
          if (dir.startsWith(path)) dirs.delete(dir);
        }
      } else {
        dirs.delete(path);
      }
    },
    async appendFile(path: string, content: string): Promise<void> {
      const parts = path.split("/").slice(0, -1);
      for (let i = 1; i <= parts.length; i++) {
        dirs.add(parts.slice(0, i).join("/") || "/");
      }

      const existing = files.get(path) || "";
      files.set(path, existing + content);
    },
  } as MockFileSystem;
}

function createMockHistoryPorts(fs: FileSystemPort): HistoryStorePorts {
  let idCounter = 0;

  return {
    fs,
    clock: {
      now: () => new Date().toISOString(),
      nowDate: () => new Date(),
      nowMs: () => Date.now(),
    },
    id: {
      uuid: () => `mock-uuid-${++idCounter}`,
    },
  };
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
