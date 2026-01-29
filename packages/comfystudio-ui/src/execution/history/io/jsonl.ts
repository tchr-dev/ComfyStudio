/**
 * JSONL Operations
 *
 * Append-only JSONL with crash-tolerant reading.
 * CONTRACT: One JSON object per line, newline-terminated.
 *
 * Milestone: M2 Phase 1 - JSONL append + atomicity
 */

import type { FileSystemPort } from "../ports";
import type { ValidationResult } from "../schemas";
import { dirname } from "../paths";

/**
 * Append single line to JSONL file
 *
 * CONTRACT:
 * - Each line is valid JSON object
 * - Line ends with newline (\n)
 * - Append is atomic (single write call)
 *
 * Crash safety:
 * - If crash during write, partial line at end
 * - Reader handles partial lines gracefully (stops scanning)
 */
export async function appendJsonlLine(
  fs: FileSystemPort,
  path: string,
  record: any
): Promise<void> {
  // Ensure parent directory exists
  const parentDir = dirname(path);
  await fs.mkdir(parentDir);

  // Serialize to single line (no newlines in JSON)
  const line = JSON.stringify(record) + "\n";

  // Append atomically
  await fs.appendFile(path, line);
}

/**
 * Read JSONL file with crash-tolerant parsing
 *
 * CONTRACT:
 * - Stops on first parse error (truncated tail)
 * - Returns all valid records before error
 * - Reports line numbers for diagnostics
 *
 * Usage:
 * ```
 * const { records, diagnostics } = await readJsonlTolerant(
 *   fs,
 *   path,
 *   validateExecutionRecord
 * );
 * ```
 */
export async function readJsonlTolerant<T>(
  fs: FileSystemPort,
  path: string,
  validate: (data: unknown) => ValidationResult<T>
): Promise<ReadJsonlResult<T>> {
  const diagnostics: JsonlDiagnostic[] = [];
  const records: T[] = [];

  // Check if file exists
  const exists = await fs.exists(path);
  if (!exists) {
    return { records: [], diagnostics: [] };
  }

  // Read entire file
  const content = await fs.readFile(path);

  // Split into lines
  const lines = content.split("\n");

  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Skip empty lines (including trailing newline)
    if (!line.trim()) {
      continue;
    }

    // Try to parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      // JSON parse failed - stop scanning (truncated tail)
      diagnostics.push({
        severity: "warning",
        code: "truncated_line",
        message: `Truncated line ${lineNumber}, stopping scan`,
        line: lineNumber,
      });
      break; // Stop processing
    }

    // Validate schema
    const result = validate(parsed);
    if (!result.valid) {
      diagnostics.push({
        severity: "error",
        code: "schema_error",
        message: `Invalid record at line ${lineNumber}: ${result.error}`,
        line: lineNumber,
      });
      continue; // Skip this record, continue scanning
    }

    // Add valid record
    records.push(result.data);
  }

  return { records, diagnostics };
}

/**
 * Result of JSONL read operation
 */
export type ReadJsonlResult<T> = {
  records: T[];
  diagnostics: JsonlDiagnostic[];
};

/**
 * Diagnostic message from JSONL reading
 */
export type JsonlDiagnostic = {
  severity: "warning" | "error";
  code: "truncated_line" | "invalid_json" | "schema_error";
  message: string;
  line: number;
};

/**
 * Count lines in JSONL file (for indexing)
 */
export async function countJsonlLines(
  fs: FileSystemPort,
  path: string
): Promise<number> {
  const exists = await fs.exists(path);
  if (!exists) {
    return 0;
  }

  const content = await fs.readFile(path);
  const lines = content.split("\n");

  // Count non-empty lines
  return lines.filter((line) => line.trim()).length;
}

/**
 * Get byte offsets for each line in JSONL (for indexing)
 */
export async function getJsonlLineOffsets(
  fs: FileSystemPort,
  path: string
): Promise<number[]> {
  const exists = await fs.exists(path);
  if (!exists) {
    return [];
  }

  const content = await fs.readFile(path);
  const offsets: number[] = [];

  let offset = 0;
  const lines = content.split("\n");

  for (const line of lines) {
    if (line.trim()) {
      offsets.push(offset);
    }
    offset += line.length + 1; // +1 for newline
  }

  return offsets;
}
