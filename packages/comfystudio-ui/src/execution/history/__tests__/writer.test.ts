/**
 * Writer Operations Tests
 *
 * Tests write path for executions, errors, and artifacts.
 * Milestone: M2 Phase 2
 */

import { describe, it, expect, beforeEach } from "vitest";
import { recordExecution, recordError, storeArtifacts } from "../writer";
import { readJsonlTolerant } from "../io/jsonl";
import { atomicReadJson } from "../io/atomic";
import { createPaths } from "../paths";
import { validateExecutionRecord, validateErrorRecord, validateArtifactManifest } from "../schemas";
import type { WorkflowExecution } from "../../types";
import type { HistoryStorePorts, FileSystemPort } from "../ports";
import type { ExecutionRecordV1, ExecutionErrorRecordV1, ArtifactManifestV1 } from "../types";

describe("Writer Operations", () => {
  let mockFs: MockFileSystem;
  let ports: HistoryStorePorts;
  let paths: ReturnType<typeof createPaths>;

  beforeEach(() => {
    mockFs = createMockFileSystem();
    ports = createMockPorts(mockFs);
    paths = createPaths("/workspace");
  });

  describe("recordExecution", () => {
    it("writes execution record to JSONL", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "queued",
        settings: { prompt: "test" },
        queuedAt: new Date("2024-01-01T00:00:00Z"),
      };

      await recordExecution(ports, paths, "test-tool", execution);

      // Read back
      const jsonlPath = paths.tools("test-tool").executions.jsonl;
      const { records } = await readJsonlTolerant(
        mockFs,
        jsonlPath,
        validateExecutionRecord
      );

      expect(records).toHaveLength(1);
      expect(records[0].executionId).toBe("exec-1");
      expect(records[0].state).toBe("queued");
      expect(records[0].captured.settings).toEqual({ prompt: "test" });
    });

    it("captures spatial input", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "queued",
        settings: {},
        spatialInput: {
          data: {
            type: "point",
            data: { x: 10, y: 20 },
          },
          capturedAt: new Date(),
          revision: 1,
        },
        queuedAt: new Date(),
      };

      await recordExecution(ports, paths, "test-tool", execution);

      const jsonlPath = paths.tools("test-tool").executions.jsonl;
      const { records } = await readJsonlTolerant(
        mockFs,
        jsonlPath,
        validateExecutionRecord
      );

      expect(records[0].captured.spatialInput).toEqual({
        type: "point",
        data: { x: 10, y: 20 },
      });
      expect(records[0].revision).toBe(1);
    });

    it("records multiple state transitions", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "queued",
        settings: {},
        queuedAt: new Date(),
      };

      // Record queued state
      await recordExecution(ports, paths, "test-tool", execution);

      // Update to executing
      execution.state = "executing";
      execution.startedAt = new Date();
      await recordExecution(ports, paths, "test-tool", execution);

      // Update to completed
      execution.state = "completed";
      execution.completedAt = new Date();
      execution.result = { imageUrl: "test.png" };
      await recordExecution(ports, paths, "test-tool", execution);

      // Read back - should have 3 records
      const jsonlPath = paths.tools("test-tool").executions.jsonl;
      const { records } = await readJsonlTolerant(
        mockFs,
        jsonlPath,
        validateExecutionRecord
      );

      expect(records).toHaveLength(3);
      expect(records[0].state).toBe("queued");
      expect(records[1].state).toBe("executing");
      expect(records[2].state).toBe("completed");
      expect(records[2].result).toEqual({ imageUrl: "test.png" });
    });

    it("records progress updates", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "executing",
        settings: {},
        progress: 50,
        startedAt: new Date(),
      };

      await recordExecution(ports, paths, "test-tool", execution);

      const jsonlPath = paths.tools("test-tool").executions.jsonl;
      const { records } = await readJsonlTolerant(
        mockFs,
        jsonlPath,
        validateExecutionRecord
      );

      expect(records[0].progress).toBe(50);
    });
  });

  describe("recordError", () => {
    it("writes error record and returns ID", async () => {
      const errorId = await recordError(
        ports,
        paths,
        "test-tool",
        "exec-1",
        {
          category: "validation",
          message: "Invalid input",
          details: { field: "prompt" },
          stack: "Error stack...",
        }
      );

      expect(errorId).toMatch(/^mock-uuid-/);

      // Read back
      const jsonlPath = paths.tools("test-tool").errors.jsonl;
      const { records } = await readJsonlTolerant(
        mockFs,
        jsonlPath,
        validateErrorRecord
      );

      expect(records).toHaveLength(1);
      expect(records[0].executionErrorId).toBe(errorId);
      expect(records[0].executionId).toBe("exec-1");
      expect(records[0].category).toBe("validation");
      expect(records[0].message).toBe("Invalid input");
    });

    it("records multiple errors for same execution", async () => {
      await recordError(ports, paths, "test-tool", "exec-1", {
        category: "validation",
        message: "Error 1",
      });

      await recordError(ports, paths, "test-tool", "exec-1", {
        category: "comfyui",
        message: "Error 2",
      });

      const jsonlPath = paths.tools("test-tool").errors.jsonl;
      const { records } = await readJsonlTolerant(
        mockFs,
        jsonlPath,
        validateErrorRecord
      );

      expect(records).toHaveLength(2);
      expect(records[0].message).toBe("Error 1");
      expect(records[1].message).toBe("Error 2");
    });
  });

  describe("storeArtifacts", () => {
    it("stores artifacts with manifest", async () => {
      // Create temp artifact file
      const tempPath = "/tmp/output.png";
      mockFs.files.set(tempPath, "fake-image-data");

      await storeArtifacts(ports, paths, "test-tool", "exec-1", [
        {
          kind: "image",
          sourcePath: tempPath,
          filename: "output.png",
          mime: "image/png",
          role: "primary",
        },
      ]);

      // Check manifest exists
      const manifestPath = paths.tools("test-tool").artifacts.execution("exec-1").manifest;
      const manifest = await atomicReadJson<ArtifactManifestV1>(mockFs, manifestPath);

      expect(manifest).not.toBeNull();
      expect(manifest!.executionId).toBe("exec-1");
      expect(manifest!.artifacts).toHaveLength(1);
      expect(manifest!.artifacts[0].filename).toBe("output.png");
      expect(manifest!.artifacts[0].kind).toBe("image");

      // Check artifact file copied
      const artifactPath = paths.tools("test-tool").artifacts.execution("exec-1").file("output.png");
      const artifactContent = mockFs.files.get(artifactPath);
      expect(artifactContent).toBe("fake-image-data");
    });

    it("stores multiple artifacts", async () => {
      mockFs.files.set("/tmp/image.png", "image-data");
      mockFs.files.set("/tmp/preview.jpg", "preview-data");

      await storeArtifacts(ports, paths, "test-tool", "exec-1", [
        {
          kind: "image",
          sourcePath: "/tmp/image.png",
          filename: "output.png",
          mime: "image/png",
          role: "primary",
        },
        {
          kind: "image",
          sourcePath: "/tmp/preview.jpg",
          filename: "preview.jpg",
          mime: "image/jpeg",
          role: "preview",
        },
      ]);

      const manifestPath = paths.tools("test-tool").artifacts.execution("exec-1").manifest;
      const manifest = await atomicReadJson<ArtifactManifestV1>(mockFs, manifestPath);

      expect(manifest!.artifacts).toHaveLength(2);
      expect(manifest!.artifacts[0].role).toBe("primary");
      expect(manifest!.artifacts[1].role).toBe("preview");
    });
  });

  describe("Integration: Write → Scan → Validate", () => {
    it("round-trips execution record", async () => {
      const execution: WorkflowExecution = {
        id: "exec-1",
        toolId: "test-tool",
        workflow: "test-workflow",
        state: "completed",
        settings: { prompt: "test", steps: 20 },
        spatialInput: {
          data: { type: "selection", data: { x: 0, y: 0, width: 100, height: 100 } },
          capturedAt: new Date(),
          revision: 3,
        },
        queuedAt: new Date("2024-01-01T00:00:00Z"),
        startedAt: new Date("2024-01-01T00:00:01Z"),
        completedAt: new Date("2024-01-01T00:01:00Z"),
        progress: 100,
        result: { images: ["output.png"] },
      };

      // Write
      await recordExecution(ports, paths, "test-tool", execution);

      // Scan
      const jsonlPath = paths.tools("test-tool").executions.jsonl;
      const { records, diagnostics } = await readJsonlTolerant(
        mockFs,
        jsonlPath,
        validateExecutionRecord
      );

      // Validate
      expect(diagnostics).toEqual([]);
      expect(records).toHaveLength(1);

      const record = records[0];
      expect(record.executionId).toBe("exec-1");
      expect(record.state).toBe("completed");
      expect(record.captured.settings).toEqual({ prompt: "test", steps: 20 });
      expect(record.revision).toBe(3);
      expect(record.progress).toBe(100);
      expect(record.result).toEqual({ images: ["output.png"] });
    });
  });
});

/**
 * Mock filesystem for testing
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
      throw new Error(`ENOENT: no such file '${path}'`);
    },

    async readdir(_path: string): Promise<string[]> {
      throw new Error("Not implemented");
    },

    async unlink(path: string): Promise<void> {
      files.delete(path);
    },

    async rmdir(path: string): Promise<void> {
      dirs.delete(path);
    },

    async appendFile(path: string, content: string): Promise<void> {
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
