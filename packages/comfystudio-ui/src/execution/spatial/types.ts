/**
 * Spatial Capture Types
 *
 * Helper types for spatial input capture and normalization.
 *
 * Milestone: M4.2 - Spatial Input Capture
 */

import type { SpatialInput, SpatialInputSnapshot, CaptureReason } from "../types";

// ============================================================================
// Canvas Coordinate System
// ============================================================================

/**
 * Raw canvas coordinates (screen space)
 */
export type CanvasPoint = {
  x: number;
  y: number;
};

/**
 * Canvas bounding box (screen space)
 */
export type CanvasBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Normalized coordinates (0-1 range, relative to canvas)
 */
export type NormalizedPoint = {
  x: number; // 0 = left edge, 1 = right edge
  y: number; // 0 = top edge, 1 = bottom edge
};

/**
 * Normalized bounds (0-1 range)
 */
export type NormalizedBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// ============================================================================
// Capture Context
// ============================================================================

/**
 * Canvas transform state for normalization
 */
export type CanvasTransform = {
  /**
   * Canvas position (pan offset)
   */
  position: { x: number; y: number };

  /**
   * Canvas scale (zoom level)
   */
  scale: number;

  /**
   * Canvas dimensions (viewport size)
   */
  dimensions: { width: number; height: number };
};

/**
 * Capture configuration
 */
export type CaptureConfig = {
  /**
   * Tool ID capturing this input
   */
  toolId: string;

  /**
   * Capture reason (drives revision policy)
   */
  reason: CaptureReason;

  /**
   * Current revision counter for this tool
   */
  currentRevision: number;

  /**
   * Canvas transform for normalization
   */
  transform: CanvasTransform;
};

// ============================================================================
// Capture Result
// ============================================================================

/**
 * Spatial capture result
 */
export type CaptureResult =
  | { ok: true; snapshot: SpatialInputSnapshot; newRevision: number }
  | { ok: false; error: string };
