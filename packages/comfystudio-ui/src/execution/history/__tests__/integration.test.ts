/**
 * Integration Tests
 *
 * End-to-end tests for complete HistoryStore API.
 * Milestone: M2 Phase 5
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createHistoryStore } from "../api";
import type { WorkflowExecution } from "../../types";
import type { HistoryStorePorts, FileSystemPort } from "../ports";

describe("HistoryStore Integration", () => {
  let mockFs: MockFileSystem;
  let ports: HistoryStorePorts;
  let store: ReturnType<typeof createHistoryStore>;

  beforeEach(() => {
    mockFs = createMockFileSystem();
    ports = createMockPorts(mockFs);
    store = createHistoryStore("/workspace", ports);
  });

  describe("End-to-End: Record → Replay → Prune", () => {
    it("completes full lifecycle", async () => {
      // Record execution
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "queued",
        settings: { prompt: "test" },
        queuedAt: new Date("2024-01-01T00:00:00Z"),
      };

      await store.recordExecution("test-tool", execution);

      // Update to executing
      execution.state = "executing";
      execution.startedAt = new Date("2024-01-01T00:00:01Z");
      await store.recordExecution("test-tool", execution);

      // Record error
      const errorId = await store.recordError("test-tool", "exec-1", {
        category: "validation",
        message: "Test error",
      });

      // Update to failed with error
      execution.state = "failed";
      execution.completedAt = new Date("2024-01-01T00:01:00Z");
      execution.error = `Error: ${errorId}`;
      await store.recordExecution("test-tool", execution);

      // Replay
      const replay1 = await store.replay("test-tool");

      expect(replay1.toolState.executions.size).toBe(1);
      expect(replay1.errors.size).toBe(1);

      const replayedExec = replay1.toolState.executions.get("exec-1")!;
      expect(replayedExec.state).toBe("failed");
      expect(replayedExec.error).toContain(errorId);

      // Add more executions
      for (let i = 2; i <= 10; i++) {
        const day = i.toString().padStart(2, "0");
        const exec: WorkflowExecution = {
          id: `exec-${i}`,
          toolId: "test-tool",
          workflow: "test-workflow",
          state: "completed",
          settings: {},
          queuedAt: new Date(`2024-01-${day}T00:00:00Z`),
          completedAt: new Date(`2024-01-${day}T00:01:00Z`),
        };
        await store.recordExecution("test-tool", exec);
      }

      // Replay again - should have all 10
      const replay2 = await store.replay("test-tool");
      expect(replay2.toolState.executions.size).toBe(10);

      // Prune to keep only 5
      const pruneReport = await store.prune("test-tool", {
        maxTerminalCount: 5,
        maxTerminalAgeDays: 1000,
        keepLatestPerRevision: false,
      });

      expect(pruneReport.prunedExecutionIds.length).toBeGreaterThan(0);

      // Replay after prune - should have 5
      const replay3 = await store.replay("test-tool");
      expect(replay3.toolState.executions.size).toBe(5);
    });
  });

  describe("Multi-Tool Support", () => {
    it("isolates history per tool", async () => {
      // Record executions for tool-a
      const execA: WorkflowExecution = {
        id: "exec-a1",
        toolId: "tool-a",
        workflow: "test-workflow",
        state: "completed",
        settings: {},
        queuedAt: new Date(),
        completedAt: new Date(),
      };
      await store.recordExecution("tool-a", execA);

      // Record executions for tool-b
      const execB: WorkflowExecution = {
        id: "exec-b1",
        toolId: "tool-b",
        workflow: "test-workflow",
        state: "completed",
        settings: {},
        queuedAt: new Date(),
        completedAt: new Date(),
      };
      await store.recordExecution("tool-b", execB);

      // Replay tool-a
      const replayA = await store.replay("tool-a");
      expect(replayA.toolState.executions.size).toBe(1);
      expect(replayA.toolState.executions.has("exec-a1")).toBe(true);

      // Replay tool-b
      const replayB = await store.replay("tool-b");
      expect(replayB.toolState.executions.size).toBe(1);
      expect(replayB.toolState.executions.has("exec-b1")).toBe(true);

      // List tools
      const tools = await store.listTools();
      expect(tools).toContain("tool-a");
      expect(tools).toContain("tool-b");
    });
  });

  describe("ReplayAll", () => {
    it("replays all tools at once", async () => {
      // Record for multiple tools
      for (const toolId of ["tool-1", "tool-2", "tool-3"]) {
        const exec: WorkflowExecution = {
          id: `exec-${toolId}`,
          toolId,
          workflow: "test-workflow",
          state: "completed",
          settings: {},
          queuedAt: new Date(),
          completedAt: new Date(),
        };
        await store.recordExecution(toolId, exec);
      }

      // Replay all
      const stateMap = await store.replayAll();

      expect(stateMap.size).toBe(3);
      expect(stateMap.has("tool-1")).toBe(true);
      expect(stateMap.has("tool-2")).toBe(true);
      expect(stateMap.has("tool-3")).toBe(true);
    });
  });

  describe("Stats", () => {
    it("computes storage statistics", async () => {
      // Create mix of states
      const queued: WorkflowExecution = {
        id: "exec-queued",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "queued",
        settings: {},
        queuedAt: new Date(),
      };

      const completed: WorkflowExecution = {
        id: "exec-completed",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "completed",
        settings: {},
        queuedAt: new Date(),
        completedAt: new Date(),
      };

      await store.recordExecution("test-tool", queued);
      await store.recordExecution("test-tool", completed);

      const stats = await store.getStats();

      expect(stats.totalExecutions).toBe(2);
      expect(stats.terminalExecutions).toBe(1);
      expect(stats.activeExecutions).toBe(1);
      expect(stats.oldestExecution).toBeTruthy();
      expect(stats.newestExecution).toBeTruthy();
    });
  });

  describe("Pruning Config", () => {
    it("persists pruning config", async () => {
      const policy = {
        maxTerminalCount: 100,
        maxTerminalAgeDays: 7,
        keepLatestPerRevision: true,
      };

      // Set config
      await store.setPruningConfig("test-tool", policy);

      // Get config
      const loaded = await store.getPruningConfig("test-tool");

      expect(loaded).toBeTruthy();
      expect(loaded!.policy).toEqual(policy);
      expect(loaded!.lastPrunedAt).toBeTruthy();
    });
  });
});

/**
 * Mock filesystem
 */
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
          if (file.startsWith(path)) {
            files.delete(file);
          }
        }
        for (const dir of Array.from(dirs)) {
          if (dir.startsWith(path)) {
            dirs.delete(dir);
          }
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

function createMockPorts(fs: FileSystemPort): HistoryStorePorts {
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
