/**
 * Coordinate Normalization
 *
 * Converts screen-space coordinates to normalized 0-1 range relative to canvas.
 * Accounts for pan, zoom, and viewport dimensions for stable spatial references.
 *
 * Milestone: M4.2 - Spatial Input Capture
 */

import type {
  CanvasPoint,
  CanvasBounds,
  NormalizedPoint,
  NormalizedBounds,
  CanvasTransform,
} from "./types";

// ============================================================================
// Point Normalization
// ============================================================================

/**
 * Normalize screen-space point to 0-1 range relative to canvas
 *
 * Accounts for:
 * - Canvas pan (position offset)
 * - Canvas zoom (scale)
 * - Viewport dimensions
 *
 * @param screenPoint - Point in screen space (pixels)
 * @param transform - Canvas transform state
 * @returns Normalized point (0-1 range)
 */
export function normalizePoint(
  screenPoint: CanvasPoint,
  transform: CanvasTransform
): NormalizedPoint {
  const { position, scale, dimensions } = transform;

  // Convert screen space to canvas space
  // Account for pan offset and zoom scale
  const canvasX = (screenPoint.x - position.x) / scale;
  const canvasY = (screenPoint.y - position.y) / scale;

  // Normalize to 0-1 range relative to viewport
  const normalizedX = canvasX / dimensions.width;
  const normalizedY = canvasY / dimensions.height;

  return {
    x: normalizedX,
    y: normalizedY,
  };
}

/**
 * Denormalize point from 0-1 range to screen space
 *
 * Inverse of normalizePoint - reconstructs screen coordinates from normalized values.
 *
 * @param normalizedPoint - Point in normalized space (0-1)
 * @param transform - Canvas transform state
 * @returns Screen-space point (pixels)
 */
export function denormalizePoint(
  normalizedPoint: NormalizedPoint,
  transform: CanvasTransform
): CanvasPoint {
  const { position, scale, dimensions } = transform;

  // Convert from 0-1 range to canvas space
  const canvasX = normalizedPoint.x * dimensions.width;
  const canvasY = normalizedPoint.y * dimensions.height;

  // Convert from canvas space to screen space
  const screenX = canvasX * scale + position.x;
  const screenY = canvasY * scale + position.y;

  return {
    x: screenX,
    y: screenY,
  };
}

// ============================================================================
// Bounds Normalization
// ============================================================================

/**
 * Normalize screen-space bounds to 0-1 range
 *
 * @param screenBounds - Bounds in screen space (pixels)
 * @param transform - Canvas transform state
 * @returns Normalized bounds (0-1 range)
 */
export function normalizeBounds(
  screenBounds: CanvasBounds,
  transform: CanvasTransform
): NormalizedBounds {
  const { position, scale, dimensions } = transform;

  // Convert bounds corners to canvas space
  const canvasX = (screenBounds.x - position.x) / scale;
  const canvasY = (screenBounds.y - position.y) / scale;
  const canvasWidth = screenBounds.width / scale;
  const canvasHeight = screenBounds.height / scale;

  // Normalize to 0-1 range
  return {
    x: canvasX / dimensions.width,
    y: canvasY / dimensions.height,
    width: canvasWidth / dimensions.width,
    height: canvasHeight / dimensions.height,
  };
}

/**
 * Denormalize bounds from 0-1 range to screen space
 *
 * @param normalizedBounds - Bounds in normalized space (0-1)
 * @param transform - Canvas transform state
 * @returns Screen-space bounds (pixels)
 */
export function denormalizeBounds(
  normalizedBounds: NormalizedBounds,
  transform: CanvasTransform
): CanvasBounds {
  const { position, scale, dimensions } = transform;

  // Convert from 0-1 range to canvas space
  const canvasX = normalizedBounds.x * dimensions.width;
  const canvasY = normalizedBounds.y * dimensions.height;
  const canvasWidth = normalizedBounds.width * dimensions.width;
  const canvasHeight = normalizedBounds.height * dimensions.height;

  // Convert from canvas space to screen space
  return {
    x: canvasX * scale + position.x,
    y: canvasY * scale + position.y,
    width: canvasWidth * scale,
    height: canvasHeight * scale,
  };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Check if normalized point is within valid range
 *
 * Points outside 0-1 range are off-canvas.
 * This is valid (e.g., dragging outside viewport) but may need special handling.
 */
export function isPointInBounds(point: NormalizedPoint): boolean {
  return point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
}

/**
 * Clamp point to 0-1 range
 */
export function clampPoint(point: NormalizedPoint): NormalizedPoint {
  return {
    x: Math.max(0, Math.min(1, point.x)),
    y: Math.max(0, Math.min(1, point.y)),
  };
}

/**
 * Check if normalized bounds is within valid range
 */
export function isBoundsInRange(bounds: NormalizedBounds): boolean {
  return (
    bounds.x >= 0 &&
    bounds.y >= 0 &&
    bounds.width >= 0 &&
    bounds.height >= 0 &&
    bounds.x + bounds.width <= 1 &&
    bounds.y + bounds.height <= 1
  );
}
