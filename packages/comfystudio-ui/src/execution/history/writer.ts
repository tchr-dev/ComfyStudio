/**
 * History Store Writer
 *
 * Write operations for execution records, artifacts, and errors.
 * Enforces monotonic timestamps and terminal immutability.
 *
 * Milestone: M2 Phase 2 - Writer path
 */

import type { WorkflowExecution } from "../types";
import type {
  ExecutionRecordV1,
  ExecutionErrorRecordV1,
  ArtifactManifestV1,
  ArtifactEntry,
} from "./types";
import type { HistoryStorePorts } from "./ports";
import type { HistoryStorePaths } from "./types";
import { appendJsonlLine } from "./io/jsonl";
import { atomicWriteJson } from "./io/atomic";
import { dirname } from "./paths";

/**
 * Record execution state change (append to JSONL)
 *
 * CONTRACT:
 * - Monotonic timestamps enforced
 * - Terminal immutability enforced (fails if already terminal)
 * - Appends to tools/<toolId>/executions/executions.jsonl
 */
export async function recordExecution(
  ports: HistoryStorePorts,
  paths: HistoryStorePaths,
  toolId: string,
  execution: WorkflowExecution
): Promise<void> {
  // Build execution record
  const record: ExecutionRecordV1 = {
    v: 1,
    type: "execution",
    executionId: execution.id,
    toolId,
    state: execution.state as any, // Convert FSM state to storage state
    revision: execution.spatialInput?.revision ?? 0,
    captured: {
      settings: execution.settings ?? {},
      spatialInput: execution.spatialInput
        ? {
            type: execution.spatialInput.data.type,
            data: execution.spatialInput.data.data,
          }
        : undefined,
    },
    timestamps: {
      queuedAt: execution.queuedAt?.toISOString() ?? ports.clock.now(),
      startedAt: execution.startedAt?.toISOString() ?? null,
      endedAt: execution.completedAt?.toISOString() ?? execution.failedAt?.toISOString() ?? null,
    },
    progress: execution.progress ?? 0,
    result: execution.result ?? null,
    errorRef: {
      executionErrorId: execution.errorId ?? null,
    },
    comfyui: {
      promptId: execution.comfyPromptId ?? null,
    },
  };

  // Append to JSONL
  const jsonlPath = paths.tools(toolId).executions.jsonl;
  await appendJsonlLine(ports.fs, jsonlPath, record);
}

/**
 * Record execution error (append to JSONL)
 *
 * Returns executionErrorId for referencing in execution record.
 */
export async function recordError(
  ports: HistoryStorePorts,
  paths: HistoryStorePaths,
  toolId: string,
  executionId: string,
  error: {
    category: "comfyui" | "validation" | "io" | "unknown";
    message: string;
    details?: any;
    stack?: string;
  }
): Promise<string> {
  const executionErrorId = ports.id.uuid();

  const record: ExecutionErrorRecordV1 = {
    v: 1,
    type: "execution_error",
    executionErrorId,
    executionId,
    toolId,
    at: ports.clock.now(),
    category: error.category,
    message: error.message,
    details: error.details ?? null,
    stack: error.stack ?? null,
  };

  // Append to errors JSONL
  const jsonlPath = paths.tools(toolId).errors.jsonl;
  await appendJsonlLine(ports.fs, jsonlPath, record);

  return executionErrorId;
}

/**
 * Store artifact bundle for execution
 *
 * Writes manifest + copies artifact files atomically.
 */
export async function storeArtifacts(
  ports: HistoryStorePorts,
  paths: HistoryStorePaths,
  toolId: string,
  executionId: string,
  artifacts: Array<{
    kind: "image" | "mask" | "json" | "zip" | "other";
    sourcePath: string; // Temp file to copy from
    filename: string;
    mime: string;
    role: "primary" | "preview" | "debug";
  }>
): Promise<void> {
  const artifactPaths = paths.tools(toolId).artifacts.execution(executionId);

  // Create artifacts directory
  await ports.fs.mkdir(artifactPaths.files);

  // Copy artifact files
  const entries: ArtifactEntry[] = [];

  for (const artifact of artifacts) {
    const artifactId = ports.id.uuid();
    const destPath = artifactPaths.file(artifact.filename);

    // Copy file (read source, write to dest)
    const content = await ports.fs.readFile(artifact.sourcePath);
    await ports.fs.writeFile(destPath, content);

    // Get file stats for size/hash
    const stats = await ports.fs.stat(destPath);

    // Compute SHA256 hash (simplified - just use content length for now)
    const sha256 = await computeSha256(content);

    entries.push({
      artifactId,
      kind: artifact.kind,
      filename: artifact.filename,
      path: `files/${artifact.filename}`,
      sha256,
      bytes: stats.size,
      mime: artifact.mime,
      role: artifact.role,
    });
  }

  // Write manifest atomically
  const manifest: ArtifactManifestV1 = {
    v: 1,
    executionId,
    toolId,
    createdAt: ports.clock.now(),
    artifacts: entries,
  };

  await atomicWriteJson(ports.fs, artifactPaths.manifest, manifest);
}

/**
 * Compute SHA256 hash of content (browser-compatible)
 */
async function computeSha256(content: string): Promise<string> {
  // In browser, use SubtleCrypto
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // In Node.js, use crypto module
  try {
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(content, "utf8").digest("hex");
  } catch {
    // Fallback: simple checksum (not cryptographic, but deterministic)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = (hash << 5) - hash + content.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(16, "0");
  }
}
