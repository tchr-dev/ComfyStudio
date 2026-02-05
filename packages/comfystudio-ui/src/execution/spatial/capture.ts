/**
 * Spatial Input Capture
 *
 * Captures canvas interactions as typed spatial inputs with revision tracking.
 * Implements the capture contract from ADR-0007.
 *
 * Milestone: M4.2 - Spatial Input Capture
 */

import type {
  SpatialInput,
  SpatialInputSnapshot,
  CaptureReason,
} from "../types";
import type {
  CanvasPoint,
  CanvasBounds,
  CaptureConfig,
  CaptureResult,
} from "./types";
import { normalizePoint, normalizeBounds } from "./normalize";

// ============================================================================
// Revision Policy
// ============================================================================

/**
 * Determine if new snapshot should increment revision
 *
 * Revision policy from ADR-0007:
 * - Interaction tools: Every interaction increments
 * - Explicit tools: Only data changes increment
 *
 * @param reason - Capture reason (interaction vs explicit)
 * @param previousData - Previous spatial input data (if any)
 * @param newData - New spatial input data
 * @returns True if revision should increment
 */
function shouldIncrementRevision(
  reason: CaptureReason,
  previousData: SpatialInput | undefined,
  newData: SpatialInput
): boolean {
  // Interaction mode: Always increment
  if (reason === "interaction") {
    return true;
  }

  // Explicit mode: Only increment if data changed
  if (!previousData) {
    return true; // First capture always increments
  }

  // Deep equality check on spatial data
  return !spatialInputEquals(previousData, newData);
}

/**
 * Check if two spatial inputs are equal
 */
function spatialInputEquals(a: SpatialInput, b: SpatialInput): boolean {
  if (a.type !== b.type) {
    return false;
  }

  switch (a.type) {
    case "point":
      return (
        b.type === "point" &&
        a.data.x === b.data.x &&
        a.data.y === b.data.y
      );

    case "selection":
      return (
        b.type === "selection" &&
        a.data.x === b.data.x &&
        a.data.y === b.data.y &&
        a.data.width === b.data.width &&
        a.data.height === b.data.height
      );

    case "mask":
      return (
        b.type === "mask" &&
        a.data.maskId === b.data.maskId &&
        a.data.bounds.x === b.data.bounds.x &&
        a.data.bounds.y === b.data.bounds.y &&
        a.data.bounds.width === b.data.bounds.width &&
        a.data.bounds.height === b.data.bounds.height
      );

    case "image":
      return b.type === "image" && a.data.entityId === b.data.entityId;

    default:
      // Exhaustive check
      const _: never = a;
      return false;
  }
}

// ============================================================================
// Capture Functions
// ============================================================================

/**
 * Capture point input (click, tap)
 *
 * @param screenPoint - Point in screen space
 * @param config - Capture configuration
 * @param previousSnapshot - Previous snapshot for revision tracking
 * @returns Capture result with new snapshot
 */
export function capturePoint(
  screenPoint: CanvasPoint,
  config: CaptureConfig,
  previousSnapshot?: SpatialInputSnapshot
): CaptureResult {
  try {
    // Normalize to canvas space
    const normalized = normalizePoint(screenPoint, config.transform);

    // Create spatial input
    const spatialInput: SpatialInput = {
      type: "point",
      data: {
        x: normalized.x,
        y: normalized.y,
      },
    };

    // Determine revision
    const shouldIncrement = shouldIncrementRevision(
      config.reason,
      previousSnapshot?.data,
      spatialInput
    );

    const newRevision = shouldIncrement
      ? config.currentRevision + 1
      : config.currentRevision;

    // Create snapshot
    const snapshot: SpatialInputSnapshot = {
      data: spatialInput,
      capturedAt: new Date(),
      revision: newRevision,
    };

    return {
      ok: true,
      snapshot,
      newRevision,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Capture selection input (rectangular region)
 *
 * @param screenBounds - Selection bounds in screen space
 * @param config - Capture configuration
 * @param previousSnapshot - Previous snapshot for revision tracking
 * @returns Capture result with new snapshot
 */
export function captureSelection(
  screenBounds: CanvasBounds,
  config: CaptureConfig,
  previousSnapshot?: SpatialInputSnapshot
): CaptureResult {
  try {
    // Validate bounds
    if (screenBounds.width <= 0 || screenBounds.height <= 0) {
      return {
        ok: false,
        error: "Selection bounds must have positive width and height",
      };
    }

    // Normalize to canvas space
    const normalized = normalizeBounds(screenBounds, config.transform);

    // Create spatial input
    const spatialInput: SpatialInput = {
      type: "selection",
      data: {
        x: normalized.x,
        y: normalized.y,
        width: normalized.width,
        height: normalized.height,
      },
    };

    // Determine revision
    const shouldIncrement = shouldIncrementRevision(
      config.reason,
      previousSnapshot?.data,
      spatialInput
    );

    const newRevision = shouldIncrement
      ? config.currentRevision + 1
      : config.currentRevision;

    // Create snapshot
    const snapshot: SpatialInputSnapshot = {
      data: spatialInput,
      capturedAt: new Date(),
      revision: newRevision,
    };

    return {
      ok: true,
      snapshot,
      newRevision,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Capture mask input (painted region)
 *
 * @param maskId - ID of mask entity
 * @param screenBounds - Mask bounding box in screen space
 * @param config - Capture configuration
 * @param previousSnapshot - Previous snapshot for revision tracking
 * @returns Capture result with new snapshot
 */
export function captureMask(
  maskId: string,
  screenBounds: CanvasBounds,
  config: CaptureConfig,
  previousSnapshot?: SpatialInputSnapshot
): CaptureResult {
  try {
    // Validate mask ID
    if (!maskId || maskId.trim() === "") {
      return {
        ok: false,
        error: "Mask ID is required",
      };
    }

    // Normalize bounds
    const normalized = normalizeBounds(screenBounds, config.transform);

    // Create spatial input
    const spatialInput: SpatialInput = {
      type: "mask",
      data: {
        maskId,
        bounds: {
          x: normalized.x,
          y: normalized.y,
          width: normalized.width,
          height: normalized.height,
        },
      },
    };

    // Determine revision
    const shouldIncrement = shouldIncrementRevision(
      config.reason,
      previousSnapshot?.data,
      spatialInput
    );

    const newRevision = shouldIncrement
      ? config.currentRevision + 1
      : config.currentRevision;

    // Create snapshot
    const snapshot: SpatialInputSnapshot = {
      data: spatialInput,
      capturedAt: new Date(),
      revision: newRevision,
    };

    return {
      ok: true,
      snapshot,
      newRevision,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Capture image input (reference to canvas entity)
 *
 * @param entityId - ID of image entity
 * @param config - Capture configuration
 * @param previousSnapshot - Previous snapshot for revision tracking
 * @returns Capture result with new snapshot
 */
export function captureImage(
  entityId: string,
  config: CaptureConfig,
  previousSnapshot?: SpatialInputSnapshot
): CaptureResult {
  try {
    // Validate entity ID
    if (!entityId || entityId.trim() === "") {
      return {
        ok: false,
        error: "Entity ID is required",
      };
    }

    // Create spatial input
    const spatialInput: SpatialInput = {
      type: "image",
      data: {
        entityId,
      },
    };

    // Determine revision
    const shouldIncrement = shouldIncrementRevision(
      config.reason,
      previousSnapshot?.data,
      spatialInput
    );

    const newRevision = shouldIncrement
      ? config.currentRevision + 1
      : config.currentRevision;

    // Create snapshot
    const snapshot: SpatialInputSnapshot = {
      data: spatialInput,
      capturedAt: new Date(),
      revision: newRevision,
    };

    return {
      ok: true,
      snapshot,
      newRevision,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
