/**
 * Atomic File Operations Tests
 *
 * Tests crash-safe write primitives.
 * Milestone: M2 Phase 1
 */

import { describe, it, expect, beforeEach } from "vitest";
import { atomicWriteFile, atomicWriteJson, atomicReadJson } from "../io/atomic";
import type { FileSystemPort } from "../ports";

describe("Atomic File Operations", () => {
  let mockFs: MockFileSystem;

  beforeEach(() => {
    mockFs = createMockFileSystem();
  });

  describe("atomicWriteFile", () => {
    it("writes file atomically", async () => {
      await atomicWriteFile(mockFs, "/test/file.txt", "hello");

      expect(mockFs.files.get("/test/file.txt")).toBe("hello");
    });

    it("creates parent directories", async () => {
      await atomicWriteFile(mockFs, "/deep/nested/file.txt", "content");

      expect(mockFs.files.get("/deep/nested/file.txt")).toBe("content");
      expect(mockFs.dirs.has("/deep")).toBe(true);
      expect(mockFs.dirs.has("/deep/nested")).toBe(true);
    });

    it("overwrites existing file", async () => {
      mockFs.files.set("/test/file.txt", "old");

      await atomicWriteFile(mockFs, "/test/file.txt", "new");

      expect(mockFs.files.get("/test/file.txt")).toBe("new");
    });

    it("uses temp file during write", async () => {
      const writes: string[] = [];

      const trackingFs: FileSystemPort = {
        ...mockFs,
        writeFile: async (path: string, content: string) => {
          writes.push(path);
          await mockFs.writeFile(path, content);
        },
      };

      await atomicWriteFile(trackingFs, "/test/file.txt", "content");

      // Should write to temp file first
      expect(writes.some((p) => p.includes(".tmp."))).toBe(true);
    });
  });

  describe("atomicWriteJson", () => {
    it("writes JSON with formatting", async () => {
      const data = { foo: "bar", baz: 123 };

      await atomicWriteJson(mockFs, "/test/data.json", data);

      const content = mockFs.files.get("/test/data.json")!;
      expect(content).toContain("{\n");
      expect(content).toContain('  "foo": "bar"');
    });

    it("round-trips data", async () => {
      const data = { id: "test", value: 42, nested: { a: 1 } };

      await atomicWriteJson(mockFs, "/test/data.json", data);
      const loaded = await atomicReadJson(mockFs, "/test/data.json");

      expect(loaded).toEqual(data);
    });
  });

  describe("atomicReadJson", () => {
    it("returns null for missing file", async () => {
      const result = await atomicReadJson(mockFs, "/missing.json");

      expect(result).toBeNull();
    });

    it("throws for invalid JSON", async () => {
      mockFs.files.set("/bad.json", "not json {");

      await expect(atomicReadJson(mockFs, "/bad.json")).rejects.toThrow();
    });

    it("reads valid JSON", async () => {
      const data = { test: true };
      mockFs.files.set("/test.json", JSON.stringify(data));

      const result = await atomicReadJson(mockFs, "/test.json");

      expect(result).toEqual(data);
    });
  });
});

/**
 * Mock filesystem for testing (in-memory)
 */
type MockFileSystem = FileSystemPort & {
  files: Map<string, string>;
  dirs: Set<string>;
};

function createMockFileSystem(): MockFileSystem {
  const files = new Map<string, string>();
  const dirs = new Set<string>();

  const mock: MockFileSystem = {
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
      // Ensure parent dirs exist
      const parts = path.split("/").slice(0, -1);
      for (let i = 1; i <= parts.length; i++) {
        dirs.add(parts.slice(0, i).join("/") || "/");
      }

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

      // Find immediate children
      for (const file of files.keys()) {
        if (file.startsWith(prefix)) {
          const relative = file.slice(prefix.length);
          const name = relative.split("/")[0];
          if (name && !results.includes(name)) {
            results.push(name);
          }
        }
      }

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
      if (!files.has(path)) {
        throw new Error(`ENOENT: no such file '${path}'`);
      }
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
      const existing = files.get(path) || "";
      files.set(path, existing + content);
    },
  };

  return mock;
}
