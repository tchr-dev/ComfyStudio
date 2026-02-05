/**
 * Replay Tests
 *
 * Tests crash-tolerant replay algorithm.
 * Milestone: M2 Phase 3
 */

import { describe, it, expect, beforeEach } from "vitest";
import { replayTool } from "../replay";
import { recordExecution, recordError, storeArtifacts } from "../writer";
import { createPaths } from "../paths";
import type { WorkflowExecution } from "../../types";
import type { HistoryStorePorts, FileSystemPort } from "../ports";

describe("Replay", () => {
  let mockFs: MockFileSystem;
  let ports: HistoryStorePorts;
  let paths: ReturnType<typeof createPaths>;

  beforeEach(() => {
    mockFs = createMockFileSystem();
    ports = createMockPorts(mockFs);
    paths = createPaths("/workspace");
  });

  describe("Empty History", () => {
    it("replays empty history", async () => {
      const result = await replayTool(ports, paths, "test-tool");

      expect(result.toolState.executions.size).toBe(0);
      expect(result.toolState.queuedIds).toEqual([]);
      expect(result.toolState.executingIds).toEqual([]);
      expect(result.diagnostics).toEqual([]);
    });
  });

  describe("Single Execution", () => {
    it("replays single queued execution", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "queued",
        settings: { prompt: "test" },
        queuedAt: new Date("2024-01-01T00:00:00Z"),
      };

      await recordExecution(ports, paths, "test-tool", execution);

      const result = await replayTool(ports, paths, "test-tool");

      expect(result.toolState.executions.size).toBe(1);
      expect(result.toolState.queuedIds).toEqual(["exec-1"]);
      expect(result.toolState.executingIds).toEqual([]);

      const replayedExec = result.toolState.executions.get("exec-1")!;
      expect(replayedExec.state).toBe("queued");
      expect(replayedExec.settings).toEqual({ prompt: "test" });
    });

    it("replays single completed execution", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "completed",
        settings: {},
        queuedAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
        result: { imageUrl: "test.png" },
      };

      await recordExecution(ports, paths, "test-tool", execution);

      const result = await replayTool(ports, paths, "test-tool");

      expect(result.toolState.executions.size).toBe(1);
      expect(result.toolState.queuedIds).toEqual([]);
      expect(result.toolState.executingIds).toEqual([]);

      const replayedExec = result.toolState.executions.get("exec-1")!;
      expect(replayedExec.state).toBe("completed");
      expect(replayedExec.result).toEqual({ imageUrl: "test.png" });
    });
  });

  describe("Multiple Executions", () => {
    it("reconstructs queue in correct order", async () => {
      // Queue 3 executions with different timestamps
      const exec1: WorkflowExecution = {
        id: "exec-1",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "queued",
        settings: {},
        queuedAt: new Date("2024-01-01T00:00:00Z"),
      };

      const exec2: WorkflowExecution = {
        id: "exec-2",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "queued",
        settings: {},
        queuedAt: new Date("2024-01-01T00:00:01Z"),
      };

      const exec3: WorkflowExecution = {
        id: "exec-3",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "queued",
        settings: {},
        queuedAt: new Date("2024-01-01T00:00:02Z"),
      };

      await recordExecution(ports, paths, "test-tool", exec1);
      await recordExecution(ports, paths, "test-tool", exec2);
      await recordExecution(ports, paths, "test-tool", exec3);

      const result = await replayTool(ports, paths, "test-tool");

      // Should be in FIFO order by queuedAt
      expect(result.toolState.queuedIds).toEqual(["exec-1", "exec-2", "exec-3"]);
    });

    it("separates queued and executing", async () => {
      const queued: WorkflowExecution = {
        id: "exec-1",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "queued",
        settings: {},
        queuedAt: new Date(),
      };

      const executing: WorkflowExecution = {
        id: "exec-2",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "executing",
        settings: {},
        queuedAt: new Date(),
        startedAt: new Date(),
      };

      await recordExecution(ports, paths, "test-tool", queued);
      await recordExecution(ports, paths, "test-tool", executing);

      const result = await replayTool(ports, paths, "test-tool");

      expect(result.toolState.queuedIds).toEqual(["exec-1"]);
      expect(result.toolState.executingIds).toEqual(["exec-2"]);
    });

    it("includes terminal executions in map but not queues", async () => {
      const completed: WorkflowExecution = {
        id: "exec-1",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "completed",
        settings: {},
        queuedAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
      };

      const failed: WorkflowExecution = {
        id: "exec-2",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "failed",
        settings: {},
        queuedAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
      };

      await recordExecution(ports, paths, "test-tool", completed);
      await recordExecution(ports, paths, "test-tool", failed);

      const result = await replayTool(ports, paths, "test-tool");

      expect(result.toolState.executions.size).toBe(2);
      expect(result.toolState.queuedIds).toEqual([]);
      expect(result.toolState.executingIds).toEqual([]);
    });
  });

  describe("Monotonic Truth (Latest Wins)", () => {
    it("uses latest record for same executionId", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "queued",
        settings: { version: 1 },
        queuedAt: new Date(),
      };

      // Record queued state
      await recordExecution(ports, paths, "test-tool", execution);

      // Update to executing
      execution.state = "executing";
      execution.settings = { version: 2 };
      execution.startedAt = new Date();
      await recordExecution(ports, paths, "test-tool", execution);

      // Update to completed
      execution.state = "completed";
      execution.settings = { version: 3 };
      execution.completedAt = new Date();
      await recordExecution(ports, paths, "test-tool", execution);

      const result = await replayTool(ports, paths, "test-tool");

      // Should use latest (completed) record
      const replayedExec = result.toolState.executions.get("exec-1")!;
      expect(replayedExec.state).toBe("completed");
      expect(replayedExec.settings).toEqual({ version: 3 });
    });
  });

  describe("Terminal Immutability", () => {
    it("coerces non-terminal with endedAt to failed", async () => {
      // Manually create invalid record (non-terminal but has endedAt)
      const jsonlPath = paths.tools("test-tool").executions.jsonl;
      const invalidRecord = {
        v: 1,
        type: "execution",
        executionId: "exec-1",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "executing", // Non-terminal
        revision: 0,
        captured: { settings: {} },
        timestamps: {
          queuedAt: "2024-01-01T00:00:00Z",
          startedAt: "2024-01-01T00:00:01Z",
          endedAt: "2024-01-01T00:01:00Z", // But has endedAt!
        },
        progress: 50,
        result: null,
        errorRef: { executionErrorId: null },
        comfyui: { promptId: null },
      };

      await mockFs.appendFile(jsonlPath, JSON.stringify(invalidRecord) + "\n");

      const result = await replayTool(ports, paths, "test-tool");

      // Should coerce to failed
      const replayedExec = result.toolState.executions.get("exec-1")!;
      expect(replayedExec.state).toBe("failed");

      // Should have diagnostic warning
      expect(result.diagnostics).toContainEqual({
        severity: "warning",
        code: "terminal_regression",
        message: expect.stringContaining("coercing to failed"),
      });
    });
  });

  describe("Crash Tolerance", () => {
    it("handles truncated JSONL (partial last line)", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "queued",
        settings: {},
        queuedAt: new Date(),
      };

      await recordExecution(ports, paths, "test-tool", execution);

      // Append truncated line (simulating crash mid-write)
      const jsonlPath = paths.tools("test-tool").executions.jsonl;
      await mockFs.appendFile(jsonlPath, '{"v":1,"type":"execution","executionId":"exec-2"');

      const result = await replayTool(ports, paths, "test-tool");

      // Should have exec-1 (valid)
      expect(result.toolState.executions.size).toBe(1);
      expect(result.toolState.executions.has("exec-1")).toBe(true);
      expect(result.toolState.executions.has("exec-2")).toBe(false);

      // Should have diagnostic
      expect(result.diagnostics).toContainEqual({
        severity: "warning",
        code: "truncated_line",
        message: expect.stringContaining("Truncated"),
        details: expect.any(Object),
      });
    });

    it("handles schema validation errors", async () => {
      // Create invalid record (missing required field)
      const jsonlPath = paths.tools("test-tool").executions.jsonl;
      const invalidRecord = {
        v: 1,
        type: "execution",
        // Missing executionId!
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "queued",
      };

      await mockFs.appendFile(jsonlPath, JSON.stringify(invalidRecord) + "\n");

      const result = await replayTool(ports, paths, "test-tool");

      // Should skip invalid record
      expect(result.toolState.executions.size).toBe(0);

      // Should have diagnostic
      expect(result.diagnostics).toContainEqual({
        severity: "error",
        code: "schema_error",
        message: expect.stringContaining("Invalid record"),
        details: expect.any(Object),
      });
    });
  });

  describe("Errors", () => {
    it("loads errors and links to executions", async () => {
      const errorId = await recordError(
        ports,
        paths,
        "test-tool",
        "exec-1",
        {
          category: "validation",
          message: "Test error",
        }
      );

      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "failed",
        settings: {},
        error: errorId, // Use error ID, not message
        queuedAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
      };

      await recordExecution(ports, paths, "test-tool", execution);

      const result = await replayTool(ports, paths, "test-tool");

      expect(result.errors.size).toBe(1);
      expect(result.errors.has(errorId)).toBe(true);

      const replayedExec = result.toolState.executions.get("exec-1")!;
      expect(replayedExec.error).toBe(errorId);
    });

    it("warns about missing error references", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "failed",
        settings: {},
        error: "missing-error-id",
        queuedAt: new Date(),
        completedAt: new Date(),
      };

      await recordExecution(ports, paths, "test-tool", execution);

      const result = await replayTool(ports, paths, "test-tool");

      expect(result.diagnostics).toContainEqual({
        severity: "warning",
        code: "missing_artifact",
        message: expect.stringContaining("missing error"),
      });
    });
  });

  describe("Artifacts", () => {
    it("loads artifact manifests", async () => {
      mockFs.files.set("/tmp/output.png", "fake-image");

      await storeArtifacts(ports, paths, "test-tool", "exec-1", [
        {
          kind: "image",
          sourcePath: "/tmp/output.png",
          filename: "output.png",
          mime: "image/png",
          role: "primary",
        },
      ]);

      const result = await replayTool(ports, paths, "test-tool");

      expect(result.artifacts.size).toBe(1);
      expect(result.artifacts.has("exec-1")).toBe(true);
    });

    it("warns about orphaned artifacts", async () => {
      // Create artifact without execution
      mockFs.files.set("/tmp/output.png", "fake-image");

      await storeArtifacts(ports, paths, "test-tool", "exec-orphan", [
        {
          kind: "image",
          sourcePath: "/tmp/output.png",
          filename: "output.png",
          mime: "image/png",
          role: "primary",
        },
      ]);

      const result = await replayTool(ports, paths, "test-tool");

      expect(result.diagnostics).toContainEqual({
        severity: "warning",
        code: "orphaned_artifact",
        message: expect.stringContaining("orphan"),
      });
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

      // Find immediate children (directories only for artifacts scan)
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

    async rmdir(path: string): Promise<void> {
      dirs.delete(path);
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
      now: () => new Date("2024-01-01T00:00:00Z").toISOString(),
      nowDate: () => new Date("2024-01-01T00:00:00Z"),
      nowMs: () => new Date("2024-01-01T00:00:00Z").getTime(),
    },
    id: {
      uuid: () => `mock-uuid-${++idCounter}`,
    },
  };
}
