/**
 * Hasher Unit Tests
 *
 * Tests stable JSON serialization and hashing.
 * Critical for determinism guarantees.
 *
 * Milestone: M3.2 - Adapter Implementation
 */

import { describe, it, expect } from "vitest";
import { stableStringify, hashUtf8, createHasher } from "../hasher";

describe("Hasher", () => {
  describe("stableStringify", () => {
    it("produces identical output for primitives", () => {
      expect(stableStringify(null)).toBe("null");
      expect(stableStringify(true)).toBe("true");
      expect(stableStringify(false)).toBe("false");
      expect(stableStringify(42)).toBe("42");
      expect(stableStringify(3.14159)).toBe("3.14159");
      expect(stableStringify("hello")).toBe('"hello"');
    });

    it("produces identical output for arrays", () => {
      const arr = [1, 2, 3];
      expect(stableStringify(arr)).toBe("[1,2,3]");

      const nested = [1, [2, 3], 4];
      expect(stableStringify(nested)).toBe("[1,[2,3],4]");
    });

    it("produces identical output for objects with sorted keys", () => {
      const obj1 = { z: 3, a: 1, m: 2 };
      const obj2 = { a: 1, m: 2, z: 3 };
      const obj3 = { m: 2, z: 3, a: 1 };

      const result1 = stableStringify(obj1);
      const result2 = stableStringify(obj2);
      const result3 = stableStringify(obj3);

      // All should be identical (keys sorted)
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(result1).toBe('{"a":1,"m":2,"z":3}');
    });

    it("handles nested objects with sorted keys", () => {
      const obj1 = {
        outer: { z: 3, a: 1 },
        middle: { y: 2, b: 0 },
      };

      const obj2 = {
        middle: { b: 0, y: 2 },
        outer: { a: 1, z: 3 },
      };

      const result1 = stableStringify(obj1);
      const result2 = stableStringify(obj2);

      expect(result1).toBe(result2);
    });

    it("handles mixed arrays and objects", () => {
      const complex = {
        users: [
          { name: "Alice", age: 30 },
          { name: "Bob", age: 25 },
        ],
        count: 2,
      };

      const result = stableStringify(complex);
      expect(result).toContain('"count":2');
      expect(result).toContain('"users"');
      expect(result).toContain('"name":"Alice"');
    });

    it("handles undefined values", () => {
      expect(stableStringify(undefined)).toBe("undefined");

      const obj = { a: 1, b: undefined, c: 3 };
      const result = stableStringify(obj);
      // undefined values are serialized as "undefined"
      expect(result).toContain('"b":undefined');
    });

    it("handles empty objects and arrays", () => {
      expect(stableStringify({})).toBe("{}");
      expect(stableStringify([])).toBe("[]");
    });

    it("produces byte-identical output for complex nested structures", () => {
      const complex1 = {
        workflow: "txt2img",
        settings: { steps: 20, cfg: 7.5, seed: 42 },
        metadata: { version: "1.0", timestamp: 1234567890 },
      };

      const complex2 = {
        metadata: { timestamp: 1234567890, version: "1.0" },
        workflow: "txt2img",
        settings: { seed: 42, cfg: 7.5, steps: 20 },
      };

      const result1 = stableStringify(complex1);
      const result2 = stableStringify(complex2);

      expect(result1).toBe(result2);
    });
  });

  describe("hashUtf8", () => {
    it("produces consistent hash for same input", () => {
      const input = "hello world";
      const hash1 = hashUtf8(input);
      const hash2 = hashUtf8(input);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[0-9a-f]{8}$/);
    });

    it("produces different hashes for different inputs", () => {
      const hash1 = hashUtf8("hello");
      const hash2 = hashUtf8("world");

      expect(hash1).not.toBe(hash2);
    });

    it("produces hash for empty string", () => {
      const hash = hashUtf8("");
      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });

    it("produces hash for long strings", () => {
      const longString = "a".repeat(10000);
      const hash = hashUtf8(longString);
      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });

    it("handles unicode characters", () => {
      const unicode = "Hello 世界 🌍";
      const hash1 = hashUtf8(unicode);
      const hash2 = hashUtf8(unicode);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[0-9a-f]{8}$/);
    });
  });

  describe("createHasher", () => {
    it("creates hasher with both methods", () => {
      const hasher = createHasher();

      expect(hasher.stableStringify).toBeDefined();
      expect(hasher.hashUtf8).toBeDefined();
    });

    it("produces deterministic fingerprints", () => {
      const hasher = createHasher();

      const obj = {
        prompt: { "1": { class_type: "CheckpointLoader" } },
        extra_data: { executionId: "exec-1", toolId: "generate" },
      };

      const canonical1 = hasher.stableStringify(obj);
      const canonical2 = hasher.stableStringify(obj);

      expect(canonical1).toBe(canonical2);

      const hash1 = hasher.hashUtf8(canonical1);
      const hash2 = hasher.hashUtf8(canonical2);

      expect(hash1).toBe(hash2);
    });
  });

  describe("Determinism integration", () => {
    it("same object → same fingerprint (full pipeline)", () => {
      const hasher = createHasher();

      const obj1 = {
        z: { nested: { value: 42 } },
        a: [1, 2, 3],
        m: "test",
      };

      const obj2 = {
        m: "test",
        a: [1, 2, 3],
        z: { nested: { value: 42 } },
      };

      const canonical1 = hasher.stableStringify(obj1);
      const canonical2 = hasher.stableStringify(obj2);

      expect(canonical1).toBe(canonical2);

      const fingerprint1 = hasher.hashUtf8(canonical1);
      const fingerprint2 = hasher.hashUtf8(canonical2);

      expect(fingerprint1).toBe(fingerprint2);
    });

    it("different objects → different fingerprints", () => {
      const hasher = createHasher();

      const obj1 = { value: 1 };
      const obj2 = { value: 2 };

      const canonical1 = hasher.stableStringify(obj1);
      const canonical2 = hasher.stableStringify(obj2);

      expect(canonical1).not.toBe(canonical2);

      const fingerprint1 = hasher.hashUtf8(canonical1);
      const fingerprint2 = hasher.hashUtf8(canonical2);

      expect(fingerprint1).not.toBe(fingerprint2);
    });
  });
});
