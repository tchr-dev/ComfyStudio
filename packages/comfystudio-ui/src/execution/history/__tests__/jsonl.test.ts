/**
 * JSONL Operations Tests
 *
 * Tests crash-tolerant JSONL reading and schema validation.
 * Milestone: M2 Phase 1
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  appendJsonlLine,
  readJsonlTolerant,
  countJsonlLines,
  getJsonlLineOffsets,
} from "../io/jsonl";
import type { FileSystemPort } from "../ports";
import type { ValidationResult } from "../schemas";

describe("JSONL Operations", () => {
  let mockFs: MockFileSystem;

  beforeEach(() => {
    mockFs = createMockFileSystem();
  });

  describe("appendJsonlLine", () => {
    it("appends single line with newline", async () => {
      await appendJsonlLine(mockFs, "/test.jsonl", { id: 1 });

      const content = mockFs.files.get("/test.jsonl")!;
      expect(content).toBe('{"id":1}\n');
    });

    it("appends multiple lines", async () => {
      await appendJsonlLine(mockFs, "/test.jsonl", { id: 1 });
      await appendJsonlLine(mockFs, "/test.jsonl", { id: 2 });
      await appendJsonlLine(mockFs, "/test.jsonl", { id: 3 });

      const content = mockFs.files.get("/test.jsonl")!;
      expect(content).toBe('{"id":1}\n{"id":2}\n{"id":3}\n');
    });

    it("creates parent directories", async () => {
      await appendJsonlLine(mockFs, "/deep/nested/test.jsonl", { id: 1 });

      expect(mockFs.dirs.has("/deep")).toBe(true);
      expect(mockFs.dirs.has("/deep/nested")).toBe(true);
    });

    it("serializes complex objects", async () => {
      const record = {
        id: "test",
        nested: { a: 1, b: "two" },
        arr: [1, 2, 3],
      };

      await appendJsonlLine(mockFs, "/test.jsonl", record);

      const content = mockFs.files.get("/test.jsonl")!;
      const parsed = JSON.parse(content.trim());
      expect(parsed).toEqual(record);
    });
  });

  describe("readJsonlTolerant", () => {
    const simpleValidator = (data: unknown): ValidationResult<{ id: number }> => {
      if (
        typeof data === "object" &&
        data !== null &&
        "id" in data &&
        typeof (data as any).id === "number"
      ) {
        return { valid: true, data: data as { id: number } };
      }
      return { valid: false, error: "Missing or invalid id" };
    };

    it("reads empty file", async () => {
      const result = await readJsonlTolerant(mockFs, "/missing.jsonl", simpleValidator);

      expect(result.records).toEqual([]);
      expect(result.diagnostics).toEqual([]);
    });

    it("reads valid JSONL", async () => {
      mockFs.files.set("/test.jsonl", '{"id":1}\n{"id":2}\n{"id":3}\n');

      const result = await readJsonlTolerant(mockFs, "/test.jsonl", simpleValidator);

      expect(result.records).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
      expect(result.diagnostics).toEqual([]);
    });

    it("handles truncated last line (crash scenario)", async () => {
      // Simulate crash mid-write: partial JSON at end
      mockFs.files.set("/test.jsonl", '{"id":1}\n{"id":2}\n{"id":');

      const result = await readJsonlTolerant(mockFs, "/test.jsonl", simpleValidator);

      expect(result.records).toEqual([{ id: 1 }, { id: 2 }]);
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0].code).toBe("truncated_line");
      expect(result.diagnostics[0].severity).toBe("warning");
    });

    it("handles invalid JSON mid-file (stops scanning)", async () => {
      mockFs.files.set("/test.jsonl", '{"id":1}\ninvalid json\n{"id":3}\n');

      const result = await readJsonlTolerant(mockFs, "/test.jsonl", simpleValidator);

      // Should stop at invalid line
      expect(result.records).toEqual([{ id: 1 }]);
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0].code).toBe("truncated_line");
    });

    it("reports schema validation errors", async () => {
      mockFs.files.set("/test.jsonl", '{"id":1}\n{"wrong":"field"}\n{"id":3}\n');

      const result = await readJsonlTolerant(mockFs, "/test.jsonl", simpleValidator);

      // Should skip invalid record but continue
      expect(result.records).toEqual([{ id: 1 }, { id: 3 }]);
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0].code).toBe("schema_error");
      expect(result.diagnostics[0].severity).toBe("error");
    });

    it("skips empty lines", async () => {
      mockFs.files.set("/test.jsonl", '{"id":1}\n\n{"id":2}\n\n\n{"id":3}\n');

      const result = await readJsonlTolerant(mockFs, "/test.jsonl", simpleValidator);

      expect(result.records).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
      expect(result.diagnostics).toEqual([]);
    });

    it("reports line numbers correctly", async () => {
      mockFs.files.set("/test.jsonl", '{"id":1}\n{"wrong":"field"}\n{"id":3}\n');

      const result = await readJsonlTolerant(mockFs, "/test.jsonl", simpleValidator);

      expect(result.diagnostics[0].line).toBe(2); // Error on line 2
    });
  });

  describe("countJsonlLines", () => {
    it("returns 0 for missing file", async () => {
      const count = await countJsonlLines(mockFs, "/missing.jsonl");

      expect(count).toBe(0);
    });

    it("counts non-empty lines", async () => {
      mockFs.files.set("/test.jsonl", '{"id":1}\n\n{"id":2}\n{"id":3}\n');

      const count = await countJsonlLines(mockFs, "/test.jsonl");

      expect(count).toBe(3);
    });

    it("handles trailing newline", async () => {
      mockFs.files.set("/test.jsonl", '{"id":1}\n{"id":2}\n');

      const count = await countJsonlLines(mockFs, "/test.jsonl");

      expect(count).toBe(2);
    });
  });

  describe("getJsonlLineOffsets", () => {
    it("returns empty array for missing file", async () => {
      const offsets = await getJsonlLineOffsets(mockFs, "/missing.jsonl");

      expect(offsets).toEqual([]);
    });

    it("computes byte offsets for each line", async () => {
      // Lines: 9 bytes, 9 bytes, 9 bytes (including newline)
      mockFs.files.set("/test.jsonl", '{"id":1}\n{"id":2}\n{"id":3}\n');

      const offsets = await getJsonlLineOffsets(mockFs, "/test.jsonl");

      expect(offsets).toEqual([0, 9, 18]);
    });

    it("handles variable-length lines", async () => {
      mockFs.files.set("/test.jsonl", '{"id":1}\n{"id":100}\n{"id":3}\n');

      const offsets = await getJsonlLineOffsets(mockFs, "/test.jsonl");

      // Line 1: 9 bytes
      // Line 2: 11 bytes (100 is 3 digits)
      // Line 3: starts at 20
      expect(offsets).toEqual([0, 9, 20]);
    });

    it("skips empty lines", async () => {
      mockFs.files.set("/test.jsonl", '{"id":1}\n\n{"id":2}\n');

      const offsets = await getJsonlLineOffsets(mockFs, "/test.jsonl");

      // Empty line doesn't get offset
      expect(offsets).toEqual([0, 10]); // Second line after empty line
    });
  });
});

/**
 * Mock filesystem (minimal for JSONL tests)
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

    async stat(_path: string): Promise<any> {
      throw new Error("Not implemented in mock");
    },

    async readdir(_path: string): Promise<string[]> {
      throw new Error("Not implemented in mock");
    },

    async unlink(path: string): Promise<void> {
      files.delete(path);
    },

    async rmdir(path: string): Promise<void> {
      dirs.delete(path);
    },

    async appendFile(path: string, content: string): Promise<void> {
      // Ensure parent dirs
      const parts = path.split("/").slice(0, -1);
      for (let i = 1; i <= parts.length; i++) {
        dirs.add(parts.slice(0, i).join("/") || "/");
      }

      const existing = files.get(path) || "";
      files.set(path, existing + content);
    },
  } as MockFileSystem;
}
