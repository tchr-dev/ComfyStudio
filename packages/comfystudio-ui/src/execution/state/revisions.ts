/**
 * Workflow Execution Revision Tracking
 *
 * Monotonic revision numbers for spatial inputs.
 * Prevents stale input re-execution while allowing intentional batching.
 *
 * Milestone: M1.3 - Revision Rules + Stale Prevention
 */

import type {
  SpatialInput,
  SpatialInputSnapshot,
  CaptureReason,
  WorkflowTool,
  ToolExecutionState,
} from "../types";

/**
 * Compare two spatial inputs for data equality.
 * Used by explicit tools to determine if revision should increment.
 */
export function isSameSpatialInput(
  a: SpatialInput,
  b: SpatialInput
): boolean {
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
      return false;
  }
}

/**
 * Check if revision is stale (already queued).
 * Returns true if the revision should NOT be queued again.
 */
export function isStale(
  currentRevision: number,
  lastQueuedRevision: number | undefined
): boolean {
  if (lastQueuedRevision === undefined) {
    return false; // No previous execution - not stale
  }

  return currentRevision <= lastQueuedRevision;
}

/**
 * Capture spatial input and update tool state with correct revision semantics.
 *
 * Revision increment rules:
 * - Interaction tools: Always increment (even if data identical)
 * - Explicit tools: Only increment if data changed
 */
export function captureSpatialInput(
  tool: WorkflowTool,
  toolState: ToolExecutionState,
  snapshot: SpatialInput,
  reason: CaptureReason
): SpatialInputSnapshot {
  if (!tool.requiresSpatialInput) {
    throw new Error(
      `Tool ${tool.id} does not require spatial input`
    );
  }

  if (snapshot.type !== tool.spatialInputType) {
    throw new Error(
      `Spatial input type mismatch: expected ${tool.spatialInputType}, got ${snapshot.type}`
    );
  }

  const now = new Date();
  const prev = toolState.currentSpatialInput?.data;
  const prevRev = toolState.currentSpatialInput?.revision ?? 0;

  // Determine if revision should increment
  let shouldBump: boolean;

  if (reason === "interaction") {
    // Interaction tools: Always increment
    shouldBump = true;
  } else {
    // Explicit tools: Only increment if data changed
    shouldBump = !prev || !isSameSpatialInput(prev, snapshot);
  }

  const newRevision = shouldBump ? prevRev + 1 : prevRev;

  const captured: SpatialInputSnapshot = {
    data: snapshot,
    capturedAt: now,
    revision: newRevision,
  };

  // Update tool state
  toolState.currentSpatialInput = captured;

  return captured;
}

/**
 * Get current revision for a tool (0 if no spatial input captured yet)
 */
export function getCurrentRevision(
  toolState: ToolExecutionState
): number {
  return toolState.currentSpatialInput?.revision ?? 0;
}

/**
 * Check if spatial input has been captured
 */
export function isSpatialInputCaptured(
  toolState: ToolExecutionState
): boolean {
  return toolState.currentSpatialInput !== undefined;
}

/**
 * Reset spatial input (clear captured state).
 * Used when tool is deactivated or needs clean slate.
 */
export function resetSpatialInput(
  toolState: ToolExecutionState
): void {
  toolState.currentSpatialInput = undefined;
  // Note: Don't reset lastQueuedRevision - needed for stale prevention
}

/**
 * Force bump revision (for batch variants or override scenarios).
 * Use with caution - breaks normal revision semantics.
 */
export function forceBumpRevision(
  toolState: ToolExecutionState
): number {
  if (!toolState.currentSpatialInput) {
    throw new Error("Cannot bump revision: no spatial input captured");
  }

  const newRevision = toolState.currentSpatialInput.revision + 1;

  toolState.currentSpatialInput = {
    ...toolState.currentSpatialInput,
    revision: newRevision,
    capturedAt: new Date(),
  };

  return newRevision;
}
