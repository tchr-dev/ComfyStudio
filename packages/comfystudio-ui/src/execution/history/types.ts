/**
 * History Store Types
 *
 * Record shapes and schemas for files-as-truth storage.
 * Milestone: M2 - History Store (Files-as-Truth)
 */

/**
 * Execution lifecycle record (append-only JSONL)
 *
 * CONTRACT: One JSON object per line in executions.jsonl
 * Monotonic truth: Multiple records for same executionId allowed,
 * latest valid record wins during replay.
 */
export type ExecutionRecordV1 = {
  v: 1;
  type: "execution";
  executionId: string;
  toolId: string;
  state: "queued" | "executing" | "completed" | "failed" | "cancelled";
  revision: number;
  captured: {
    settings: Record<string, any>;
    spatialInput?: {
      type: "point" | "selection" | "mask" | "image";
      data: any;
    };
  };
  timestamps: {
    queuedAt: string; // ISO-8601
    startedAt: string | null;
    endedAt: string | null;
  };
  progress: number;
  result: any;
  errorRef: {
    executionErrorId: string | null;
  };
  comfyui: {
    promptId: string | null;
  };
};

/**
 * Artifact inventory (per execution)
 *
 * CONTRACT: Single manifest.json per executionId
 * Immutable once written. Lists all output artifacts.
 */
export type ArtifactManifestV1 = {
  v: 1;
  executionId: string;
  toolId: string;
  createdAt: string; // ISO-8601
  artifacts: ArtifactEntry[];
};

export type ArtifactEntry = {
  artifactId: string;
  kind: "image" | "mask" | "json" | "zip" | "other";
  filename: string;
  path: string; // Relative to manifest (e.g., "files/output.png")
  sha256: string;
  bytes: number;
  mime: string;
  role: "primary" | "preview" | "debug";
};

/**
 * Error record (append-only JSONL)
 *
 * CONTRACT: Referenced by errorRef in ExecutionRecordV1
 */
export type ExecutionErrorRecordV1 = {
  v: 1;
  type: "execution_error";
  executionErrorId: string;
  executionId: string;
  toolId: string;
  at: string; // ISO-8601
  category: "comfyui" | "validation" | "io" | "unknown";
  message: string;
  details: any;
  stack: string | null;
};

/**
 * Store-wide metadata (optional, not source of truth)
 */
export type StoreMetaV1 = {
  format: {
    name: "comfystudio.history";
    version: 1;
  };
  createdAt: string; // ISO-8601
  app: {
    name: string;
    build: string;
  };
};

/**
 * Optional index for replay acceleration (not source of truth)
 *
 * CONTRACT: Safe to delete, replay falls back to JSONL scan.
 * If corrupted, ignore and rebuild.
 */
export type ExecutionIndexV1 = {
  v: 1;
  toolId: string;
  builtAt: string; // ISO-8601
  entries: Record<
    string,
    {
      offset: number; // Byte offset in JSONL
      line: number; // Line number (1-indexed)
      state: ExecutionRecordV1["state"];
    }
  >;
};

/**
 * Pruning configuration + last prune marker
 */
export type PruningConfigV1 = {
  v: 1;
  policy: {
    maxTerminalCount: number; // e.g., 500
    maxTerminalAgeDays: number; // e.g., 30
    keepLatestPerRevision: boolean;
  };
  lastPrunedAt: string | null; // ISO-8601
};

/**
 * Pruning report (output of prune operation)
 */
export type PruneReport = {
  prunedExecutionIds: string[];
  deletedArtifactCount: number;
  bytesFreed: number;
  compactedFiles: string[];
  duration: number; // milliseconds
};

/**
 * Storage layout paths
 */
export type HistoryStorePaths = {
  root: string; // <workspace_root>/history/v1
  meta: string; // meta.json
  tools: (toolId: string) => {
    root: string; // tools/<toolId>
    executions: {
      jsonl: string; // executions/executions.jsonl
      index: string; // executions/executions.idx.json
      pruning: string; // executions/pruning.json
    };
    artifacts: {
      root: string; // artifacts/
      execution: (executionId: string) => {
        root: string; // artifacts/<executionId>
        manifest: string; // artifacts/<executionId>/manifest.json
        files: string; // artifacts/<executionId>/files/
        file: (filename: string) => string; // artifacts/<executionId>/files/<filename>
      };
    };
    errors: {
      jsonl: string; // errors/errors.jsonl
    };
  };
};
