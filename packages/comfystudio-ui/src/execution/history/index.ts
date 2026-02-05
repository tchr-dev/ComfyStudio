/**
 * History Store - Public Exports
 *
 * Files-as-truth storage for workflow execution history.
 * Crash-resilient, zero-dependency, deterministic replay.
 *
 * Milestone: M2 - History Store (Files-as-Truth)
 */

// Public API
export type { HistoryStore, ReplayResult, ReplayDiagnostic, HistoryStats } from "./api";
export { createHistoryStore, createDefaultHistoryStore } from "./api";

// Record types (for consumers)
export type {
  ExecutionRecordV1,
  ArtifactManifestV1,
  ArtifactEntry,
  ExecutionErrorRecordV1,
  PruningConfigV1,
  PruneReport,
  StoreMetaV1,
} from "./types";

// Ports (for testing/injection)
export type {
  FileSystemPort,
  ClockPort,
  IdPort,
  HistoryStorePorts,
  FileStats,
} from "./ports";
export { createDefaultPorts } from "./ports";

// Schema validators (for testing/validation)
export {
  validateExecutionRecord,
  validateErrorRecord,
  validateArtifactManifest,
  validateExecutionIndex,
  validatePruningConfig,
  validateStoreMeta,
} from "./schemas";
export type { ValidationResult } from "./schemas";
