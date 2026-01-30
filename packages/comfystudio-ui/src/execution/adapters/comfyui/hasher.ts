/**
 * Hasher Port Implementation
 *
 * Provides deterministic hashing and stable JSON serialization.
 * Platform-independent (Node.js + browser).
 *
 * Milestone: M3.2 - Adapter Implementation
 */

import type { HasherPort } from "./types";

/**
 * Stable JSON stringify
 *
 * Sorts object keys recursively for canonical serialization.
 * Same object → byte-identical JSON string.
 */
export function stableStringify(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";

  switch (typeof value) {
    case "boolean":
    case "number":
    case "string":
      return JSON.stringify(value);

    case "object":
      if (Array.isArray(value)) {
        // Arrays: preserve order, recursively stringify elements
        const items = value.map((item) => stableStringify(item));
        return `[${items.join(",")}]`;
      }

      // Objects: sort keys, recursively stringify values
      const keys = Object.keys(value).sort();
      const pairs = keys.map((key) => {
        const val = (value as Record<string, unknown>)[key];
        return `${JSON.stringify(key)}:${stableStringify(val)}`;
      });
      return `{${pairs.join(",")}}`;

    default:
      // Functions, symbols, etc. → undefined
      return "undefined";
  }
}

/**
 * Simple hash function (FNV-1a)
 *
 * Deterministic, platform-independent.
 * Not cryptographic, but sufficient for fingerprinting.
 */
export function hashUtf8(input: string): string {
  let hash = 2166136261; // FNV offset basis

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619); // FNV prime
  }

  // Convert to unsigned 32-bit hex
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Create hasher port instance
 */
export function createHasher(): HasherPort {
  return {
    stableStringify,
    hashUtf8,
  };
}
