/**
 * Atomic File Operations
 *
 * Crash-safe write primitives using temp-file-then-rename pattern.
 * POSIX rename is atomic (overwrites destination in single syscall).
 *
 * Milestone: M2 Phase 1 - JSONL append + atomicity
 */

import type { FileSystemPort } from "../ports";
import { dirname } from "../paths";

/**
 * Write file atomically using temp-file-then-rename
 *
 * CONTRACT:
 * - If write succeeds, destination has new content
 * - If write fails mid-way, destination unchanged
 * - No partial writes visible to readers
 *
 * Pattern:
 * 1. Write to temp file (path.tmp.{timestamp})
 * 2. Rename temp to final path (atomic on POSIX)
 */
export async function atomicWriteFile(
  fs: FileSystemPort,
  path: string,
  content: string
): Promise<void> {
  // Ensure parent directory exists
  const parentDir = dirname(path);
  await fs.mkdir(parentDir);

  // Write to temp file
  const tmpPath = `${path}.tmp.${Date.now()}`;
  await fs.writeFile(tmpPath, content);

  // Atomic rename
  await fs.rename(tmpPath, path);
}

/**
 * Atomic JSON write with pretty formatting
 */
export async function atomicWriteJson(
  fs: FileSystemPort,
  path: string,
  data: any
): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await atomicWriteFile(fs, path, content);
}

/**
 * Atomic read JSON with validation
 *
 * Returns null if file doesn't exist.
 * Throws if file exists but is not valid JSON.
 */
export async function atomicReadJson<T>(
  fs: FileSystemPort,
  path: string
): Promise<T | null> {
  const exists = await fs.exists(path);
  if (!exists) {
    return null;
  }

  const content = await fs.readFile(path);
  return JSON.parse(content) as T;
}
