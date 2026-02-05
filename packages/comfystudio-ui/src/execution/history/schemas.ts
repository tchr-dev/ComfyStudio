/**
 * History Store Schema Validation
 *
 * Type guards and validators for record shapes.
 * Used during JSONL parsing to ensure data integrity.
 *
 * Milestone: M2 - History Store (Files-as-Truth)
 */

import type {
  ExecutionRecordV1,
  ExecutionErrorRecordV1,
  ArtifactManifestV1,
  ExecutionIndexV1,
  PruningConfigV1,
  StoreMetaV1,
} from "./types";

/**
 * Validation result
 */
export type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; error: string };

/**
 * Validate ExecutionRecordV1
 */
export function validateExecutionRecord(
  data: unknown
): ValidationResult<ExecutionRecordV1> {
  if (typeof data !== "object" || data === null) {
    return { valid: false, error: "Expected object" };
  }

  const record = data as any;

  // Check version
  if (record.v !== 1) {
    return { valid: false, error: `Expected v:1, got ${record.v}` };
  }

  // Check type
  if (record.type !== "execution") {
    return { valid: false, error: `Expected type:execution, got ${record.type}` };
  }

  // Check required fields
  if (typeof record.executionId !== "string") {
    return { valid: false, error: "Missing executionId" };
  }

  if (typeof record.toolId !== "string") {
    return { valid: false, error: "Missing toolId" };
  }

  // Check state enum
  const validStates = ["queued", "executing", "completed", "failed", "cancelled"];
  if (!validStates.includes(record.state)) {
    return { valid: false, error: `Invalid state: ${record.state}` };
  }

  // Check revision
  if (typeof record.revision !== "number") {
    return { valid: false, error: "Missing revision" };
  }

  // Check captured
  if (typeof record.captured !== "object" || record.captured === null) {
    return { valid: false, error: "Missing captured" };
  }

  if (typeof record.captured.settings !== "object") {
    return { valid: false, error: "Missing captured.settings" };
  }

  // Check timestamps
  if (typeof record.timestamps !== "object" || record.timestamps === null) {
    return { valid: false, error: "Missing timestamps" };
  }

  if (typeof record.timestamps.queuedAt !== "string") {
    return { valid: false, error: "Missing timestamps.queuedAt" };
  }

  // Check progress
  if (typeof record.progress !== "number") {
    return { valid: false, error: "Missing progress" };
  }

  // Check errorRef
  if (typeof record.errorRef !== "object" || record.errorRef === null) {
    return { valid: false, error: "Missing errorRef" };
  }

  // Check comfyui
  if (typeof record.comfyui !== "object" || record.comfyui === null) {
    return { valid: false, error: "Missing comfyui" };
  }

  return { valid: true, data: record as ExecutionRecordV1 };
}

/**
 * Validate ExecutionErrorRecordV1
 */
export function validateErrorRecord(
  data: unknown
): ValidationResult<ExecutionErrorRecordV1> {
  if (typeof data !== "object" || data === null) {
    return { valid: false, error: "Expected object" };
  }

  const record = data as any;

  // Check version
  if (record.v !== 1) {
    return { valid: false, error: `Expected v:1, got ${record.v}` };
  }

  // Check type
  if (record.type !== "execution_error") {
    return { valid: false, error: `Expected type:execution_error, got ${record.type}` };
  }

  // Check required fields
  if (typeof record.executionErrorId !== "string") {
    return { valid: false, error: "Missing executionErrorId" };
  }

  if (typeof record.executionId !== "string") {
    return { valid: false, error: "Missing executionId" };
  }

  if (typeof record.toolId !== "string") {
    return { valid: false, error: "Missing toolId" };
  }

  if (typeof record.at !== "string") {
    return { valid: false, error: "Missing at" };
  }

  // Check category enum
  const validCategories = ["comfyui", "validation", "io", "unknown"];
  if (!validCategories.includes(record.category)) {
    return { valid: false, error: `Invalid category: ${record.category}` };
  }

  if (typeof record.message !== "string") {
    return { valid: false, error: "Missing message" };
  }

  return { valid: true, data: record as ExecutionErrorRecordV1 };
}

/**
 * Validate ArtifactManifestV1
 */
export function validateArtifactManifest(
  data: unknown
): ValidationResult<ArtifactManifestV1> {
  if (typeof data !== "object" || data === null) {
    return { valid: false, error: "Expected object" };
  }

  const manifest = data as any;

  // Check version
  if (manifest.v !== 1) {
    return { valid: false, error: `Expected v:1, got ${manifest.v}` };
  }

  // Check required fields
  if (typeof manifest.executionId !== "string") {
    return { valid: false, error: "Missing executionId" };
  }

  if (typeof manifest.toolId !== "string") {
    return { valid: false, error: "Missing toolId" };
  }

  if (typeof manifest.createdAt !== "string") {
    return { valid: false, error: "Missing createdAt" };
  }

  if (!Array.isArray(manifest.artifacts)) {
    return { valid: false, error: "Missing artifacts array" };
  }

  // Validate each artifact entry
  for (const artifact of manifest.artifacts) {
    if (typeof artifact.artifactId !== "string") {
      return { valid: false, error: "Artifact missing artifactId" };
    }

    const validKinds = ["image", "mask", "json", "zip", "other"];
    if (!validKinds.includes(artifact.kind)) {
      return { valid: false, error: `Invalid artifact kind: ${artifact.kind}` };
    }

    if (typeof artifact.filename !== "string") {
      return { valid: false, error: "Artifact missing filename" };
    }

    if (typeof artifact.path !== "string") {
      return { valid: false, error: "Artifact missing path" };
    }

    const validRoles = ["primary", "preview", "debug"];
    if (!validRoles.includes(artifact.role)) {
      return { valid: false, error: `Invalid artifact role: ${artifact.role}` };
    }
  }

  return { valid: true, data: manifest as ArtifactManifestV1 };
}

/**
 * Validate ExecutionIndexV1
 */
export function validateExecutionIndex(
  data: unknown
): ValidationResult<ExecutionIndexV1> {
  if (typeof data !== "object" || data === null) {
    return { valid: false, error: "Expected object" };
  }

  const index = data as any;

  // Check version
  if (index.v !== 1) {
    return { valid: false, error: `Expected v:1, got ${index.v}` };
  }

  if (typeof index.toolId !== "string") {
    return { valid: false, error: "Missing toolId" };
  }

  if (typeof index.builtAt !== "string") {
    return { valid: false, error: "Missing builtAt" };
  }

  if (typeof index.entries !== "object") {
    return { valid: false, error: "Missing entries" };
  }

  return { valid: true, data: index as ExecutionIndexV1 };
}

/**
 * Validate PruningConfigV1
 */
export function validatePruningConfig(
  data: unknown
): ValidationResult<PruningConfigV1> {
  if (typeof data !== "object" || data === null) {
    return { valid: false, error: "Expected object" };
  }

  const config = data as any;

  // Check version
  if (config.v !== 1) {
    return { valid: false, error: `Expected v:1, got ${config.v}` };
  }

  if (typeof config.policy !== "object" || config.policy === null) {
    return { valid: false, error: "Missing policy" };
  }

  if (typeof config.policy.maxTerminalCount !== "number") {
    return { valid: false, error: "Missing policy.maxTerminalCount" };
  }

  if (typeof config.policy.maxTerminalAgeDays !== "number") {
    return { valid: false, error: "Missing policy.maxTerminalAgeDays" };
  }

  if (typeof config.policy.keepLatestPerRevision !== "boolean") {
    return { valid: false, error: "Missing policy.keepLatestPerRevision" };
  }

  return { valid: true, data: config as PruningConfigV1 };
}

/**
 * Validate StoreMetaV1
 */
export function validateStoreMeta(data: unknown): ValidationResult<StoreMetaV1> {
  if (typeof data !== "object" || data === null) {
    return { valid: false, error: "Expected object" };
  }

  const meta = data as any;

  if (typeof meta.format !== "object" || meta.format === null) {
    return { valid: false, error: "Missing format" };
  }

  if (meta.format.name !== "comfystudio.history") {
    return { valid: false, error: "Invalid format name" };
  }

  if (meta.format.version !== 1) {
    return { valid: false, error: "Invalid format version" };
  }

  return { valid: true, data: meta as StoreMetaV1 };
}
