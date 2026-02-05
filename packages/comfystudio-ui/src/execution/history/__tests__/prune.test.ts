/**
 * Pruning Tests
 *
 * Tests deterministic pruning with configurable policies.
 * Milestone: M2 Phase 4
 */

import { describe, it, expect, beforeEach } from "vitest";
import { pruneTool, DEFAULT_PRUNE_POLICY } from "../prune";
import { recordExecution, storeArtifacts } from "../writer";
import { replayTool } from "../replay";
import { createPaths } from "../paths";
import type { WorkflowExecution } from "../../types";
import type { HistoryStorePorts, FileSystemPort } from "../ports";

describe("Pruning", () => {
  let mockFs: MockFileSystem;
  let ports: HistoryStorePorts;
  let paths: ReturnType<typeof createPaths>;

  beforeEach(() => {
    mockFs = createMockFileSystem();
    ports = createMockPorts(mockFs);
    paths = createPaths("/workspace");
  });

  describe("Empty History", () => {
    it("prunes nothing when history is empty", async () => {
      const report = await pruneTool(ports, paths, "test-tool");

      expect(report.prunedExecutionIds).toEqual([]);
      expect(report.deletedArtifactCount).toBe(0);
    });
  });

  describe("Non-Terminal Protection", () => {
    it("never prunes queued executions", async () => {
      const queued: WorkflowExecution = {
        id: "exec-1",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "queued",
        settings: {},
        queuedAt: new Date("2020-01-01T00:00:00Z"), // Very old
      };

      await recordExecution(ports, paths, "test-tool", queued);

      // Try to prune with age policy (10 years old should be pruned if terminal)
      const report = await pruneTool(ports, paths, "test-tool", {
        maxTerminalCount: 1000,
        maxTerminalAgeDays: 1,
        keepLatestPerRevision: false,
      });

      expect(report.prunedExecutionIds).toEqual([]);
    });

    it("never prunes executing executions", async () => {
      const executing: WorkflowExecution = {
        id: "exec-1",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "executing",
        settings: {},
        queuedAt: new Date("2020-01-01T00:00:00Z"),
        startedAt: new Date("2020-01-01T00:00:01Z"),
      };

      await recordExecution(ports, paths, "test-tool", executing);

      const report = await pruneTool(ports, paths, "test-tool", {
        maxTerminalCount: 1000,
        maxTerminalAgeDays: 1,
        keepLatestPerRevision: false,
      });

      expect(report.prunedExecutionIds).toEqual([]);
    });
  });

  describe("Count-Based Pruning", () => {
    it("prunes oldest terminal executions when over count", async () => {
      // Create 5 completed executions
      for (let i = 1; i <= 5; i++) {
        const exec: WorkflowExecution = {
          id: `exec-${i}`,
          toolId: "test-tool",
        workflow: "test-workflow",
          state: "completed",
          settings: {},
          queuedAt: new Date(`2024-01-0${i}T00:00:00Z`),
          startedAt: new Date(`2024-01-0${i}T00:00:01Z`),
          completedAt: new Date(`2024-01-0${i}T00:01:00Z`),
        };
        await recordExecution(ports, paths, "test-tool", exec);
      }

      // Prune to keep only 3 (delete 2 oldest)
      const report = await pruneTool(ports, paths, "test-tool", {
        maxTerminalCount: 3,
        maxTerminalAgeDays: 1000,
        keepLatestPerRevision: false,
      });

      expect(report.prunedExecutionIds).toHaveLength(2);
      expect(report.prunedExecutionIds).toContain("exec-1");
      expect(report.prunedExecutionIds).toContain("exec-2");
    });

    it("keeps latest terminal when pruning by count", async () => {
      // Create 3 executions
      for (let i = 1; i <= 3; i++) {
        const exec: WorkflowExecution = {
          id: `exec-${i}`,
          toolId: "test-tool",
        workflow: "test-workflow",
          state: "completed",
          settings: {},
          queuedAt: new Date(`2024-01-0${i}T00:00:00Z`),
          completedAt: new Date(`2024-01-0${i}T00:01:00Z`),
        };
        await recordExecution(ports, paths, "test-tool", exec);
      }

      // Prune to keep 2 total (latest is protected, so we can prune 1 from eligible)
      const report = await pruneTool(ports, paths, "test-tool", {
        maxTerminalCount: 2,
        maxTerminalAgeDays: 1000,
        keepLatestPerRevision: false,
      });

      // Should prune exec-1 only (keep exec-2 and exec-3, where exec-3 is latest/protected)
      expect(report.prunedExecutionIds).toHaveLength(1);
      expect(report.prunedExecutionIds).toContain("exec-1");
      expect(report.prunedExecutionIds).not.toContain("exec-2");
      expect(report.prunedExecutionIds).not.toContain("exec-3");
    });
  });

  describe("Age-Based Pruning", () => {
    it("prunes executions older than maxTerminalAgeDays", async () => {
      const nowMs = Date.now();
      const oldTime = nowMs - 40 * 24 * 60 * 60 * 1000; // 40 days ago
      const recentTime = nowMs - 10 * 24 * 60 * 60 * 1000; // 10 days ago

      const oldExec: WorkflowExecution = {
        id: "exec-old",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "completed",
        settings: {},
        queuedAt: new Date(oldTime),
        completedAt: new Date(oldTime),
      };

      const recentExec: WorkflowExecution = {
        id: "exec-recent",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "completed",
        settings: {},
        queuedAt: new Date(recentTime),
        completedAt: new Date(recentTime),
      };

      await recordExecution(ports, paths, "test-tool", oldExec);
      await recordExecution(ports, paths, "test-tool", recentExec);

      // Prune executions older than 30 days
      const report = await pruneTool(ports, paths, "test-tool", {
        maxTerminalCount: 1000,
        maxTerminalAgeDays: 30,
        keepLatestPerRevision: false,
      });

      expect(report.prunedExecutionIds).toContain("exec-old");
      expect(report.prunedExecutionIds).not.toContain("exec-recent");
    });
  });

  describe("keepLatestPerRevision", () => {
    it("protects latest execution per revision", async () => {
      // Create multiple executions with different revisions
      const exec1: WorkflowExecution = {
        id: "exec-1",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "completed",
        settings: {},
        spatialInput: {
          data: { type: "point", data: { x: 0, y: 0 } },
          capturedAt: new Date(),
          revision: 1,
        },
        queuedAt: new Date("2024-01-01T00:00:00Z"),
        completedAt: new Date("2024-01-01T00:01:00Z"),
      };

      const exec2: WorkflowExecution = {
        id: "exec-2",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "completed",
        settings: {},
        spatialInput: {
          data: { type: "point", data: { x: 0, y: 0 } },
          capturedAt: new Date(),
          revision: 2,
        },
        queuedAt: new Date("2024-01-02T00:00:00Z"),
        completedAt: new Date("2024-01-02T00:01:00Z"),
      };

      const exec3: WorkflowExecution = {
        id: "exec-3",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "completed",
        settings: {},
        spatialInput: {
          data: { type: "point", data: { x: 0, y: 0 } },
          capturedAt: new Date(),
          revision: 1, // Same revision as exec-1 but newer
        },
        queuedAt: new Date("2024-01-03T00:00:00Z"),
        completedAt: new Date("2024-01-03T00:01:00Z"),
      };

      await recordExecution(ports, paths, "test-tool", exec1);
      await recordExecution(ports, paths, "test-tool", exec2);
      await recordExecution(ports, paths, "test-tool", exec3);

      // Prune with keepLatestPerRevision enabled
      const report = await pruneTool(ports, paths, "test-tool", {
        maxTerminalCount: 1, // Try to prune down to 1
        maxTerminalAgeDays: 1000,
        keepLatestPerRevision: true,
      });

      // Should keep exec-2 (rev 2) and exec-3 (latest for rev 1)
      // Should prune exec-1 (older rev 1)
      expect(report.prunedExecutionIds).toEqual(["exec-1"]);
    });
  });

  describe("Deterministic Selection", () => {
    it("produces same result on repeated runs", async () => {
      // Create same set of executions
      for (let i = 1; i <= 10; i++) {
        const exec: WorkflowExecution = {
          id: `exec-${i}`,
          toolId: "test-tool",
        workflow: "test-workflow",
          state: "completed",
          settings: {},
          queuedAt: new Date(`2024-01-${i.toString().padStart(2, "0")}T00:00:00Z`),
          completedAt: new Date(
            `2024-01-${i.toString().padStart(2, "0")}T00:01:00Z`
          ),
        };
        await recordExecution(ports, paths, "test-tool", exec);
      }

      // First prune
      const report1 = await pruneTool(ports, paths, "test-tool", {
        maxTerminalCount: 5,
        maxTerminalAgeDays: 1000,
        keepLatestPerRevision: false,
      });

      // Replay to restore state
      const state1 = await replayTool(ports, paths, "test-tool");

      // Second prune (should prune nothing - already at limit)
      const report2 = await pruneTool(ports, paths, "test-tool", {
        maxTerminalCount: 5,
        maxTerminalAgeDays: 1000,
        keepLatestPerRevision: false,
      });

      // Results should be deterministic
      expect(report2.prunedExecutionIds).toEqual([]);
      expect(state1.toolState.executions.size).toBe(5);
    });
  });

  describe("Artifact Cleanup", () => {
    it("deletes artifacts when pruning executions", async () => {
      mockFs.files.set("/tmp/output1.png", "fake-image-data-1");
      mockFs.files.set("/tmp/output2.png", "fake-image-data-2");

      // Create two executions - old one will be pruned, recent one kept as latest
      const oldExec: WorkflowExecution = {
        id: "exec-old",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "completed",
        settings: {},
        queuedAt: new Date("2020-01-01T00:00:00Z"), // Very old
        completedAt: new Date("2020-01-01T00:01:00Z"),
      };

      const recentExec: WorkflowExecution = {
        id: "exec-recent",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "completed",
        settings: {},
        queuedAt: new Date(), // Recent
        completedAt: new Date(),
      };

      await recordExecution(ports, paths, "test-tool", oldExec);
      await recordExecution(ports, paths, "test-tool", recentExec);

      // Store artifacts for old execution
      await storeArtifacts(ports, paths, "test-tool", "exec-old", [
        {
          kind: "image",
          sourcePath: "/tmp/output1.png",
          filename: "output.png",
          mime: "image/png",
          role: "primary",
        },
      ]);

      // Store artifacts for recent execution
      await storeArtifacts(ports, paths, "test-tool", "exec-recent", [
        {
          kind: "image",
          sourcePath: "/tmp/output2.png",
          filename: "output.png",
          mime: "image/png",
          role: "primary",
        },
      ]);

      // Verify old artifact exists
      const oldArtifactPath = paths
        .tools("test-tool")
        .artifacts.execution("exec-old")
        .file("output.png");
      expect(mockFs.files.has(oldArtifactPath)).toBe(true);

      // Prune by age
      const report = await pruneTool(ports, paths, "test-tool", {
        maxTerminalCount: 1000,
        maxTerminalAgeDays: 1,
        keepLatestPerRevision: false,
      });

      expect(report.prunedExecutionIds).toContain("exec-old");
      expect(report.deletedArtifactCount).toBe(1);
      expect(report.bytesFreed).toBeGreaterThan(0);

      // Verify old artifact deleted
      const oldArtifactRoot = paths.tools("test-tool").artifacts.execution("exec-old").root;
      expect(mockFs.dirs.has(oldArtifactRoot)).toBe(false);

      // Verify recent artifact still exists
      const recentArtifactPath = paths
        .tools("test-tool")
        .artifacts.execution("exec-recent")
        .file("output.png");
      expect(mockFs.files.has(recentArtifactPath)).toBe(true);
    });
  });

  describe("Compaction", () => {
    it("rewrites JSONL without pruned records", async () => {
      // Create 5 executions
      for (let i = 1; i <= 5; i++) {
        const exec: WorkflowExecution = {
          id: `exec-${i}`,
          toolId: "test-tool",
        workflow: "test-workflow",
          state: "completed",
          settings: {},
          queuedAt: new Date(`2024-01-0${i}T00:00:00Z`),
          completedAt: new Date(`2024-01-0${i}T00:01:00Z`),
        };
        await recordExecution(ports, paths, "test-tool", exec);
      }

      // Prune to keep only 3
      await pruneTool(ports, paths, "test-tool", {
        maxTerminalCount: 3,
        maxTerminalAgeDays: 1000,
        keepLatestPerRevision: false,
      });

      // Replay - should only find 3 executions
      const result = await replayTool(ports, paths, "test-tool");

      expect(result.toolState.executions.size).toBe(3);
      expect(result.toolState.executions.has("exec-3")).toBe(true);
      expect(result.toolState.executions.has("exec-4")).toBe(true);
      expect(result.toolState.executions.has("exec-5")).toBe(true);
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
        // Delete all files and dirs under path
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
