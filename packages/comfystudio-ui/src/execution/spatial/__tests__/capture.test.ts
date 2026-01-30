/**
 * Spatial Capture Tests
 *
 * Tests spatial input capture, normalization, and revision tracking.
 *
 * Milestone: M4.2 - Spatial Input Capture
 */

import { describe, it, expect } from "vitest";
import {
  capturePoint,
  captureSelection,
  captureMask,
  captureImage,
} from "../capture";
import {
  normalizePoint,
  denormalizePoint,
  normalizeBounds,
  denormalizeBounds,
  isPointInBounds,
  clampPoint,
  isBoundsInRange,
} from "../normalize";
import type { CaptureConfig, CanvasTransform } from "../types";
import type { SpatialInputSnapshot } from "../../types";

describe("Spatial Capture", () => {
  // Test canvas transform
  const baseTransform: CanvasTransform = {
    position: { x: 0, y: 0 },
    scale: 1,
    dimensions: { width: 1000, height: 800 },
  };

  const baseConfig: CaptureConfig = {
    toolId: "test-tool",
    reason: "explicit",
    currentRevision: 0,
    transform: baseTransform,
  };

  describe("Coordinate Normalization", () => {
    it("normalizes point at origin", () => {
      const result = normalizePoint({ x: 0, y: 0 }, baseTransform);
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it("normalizes point at center", () => {
      const result = normalizePoint({ x: 500, y: 400 }, baseTransform);
      expect(result).toEqual({ x: 0.5, y: 0.5 });
    });

    it("normalizes point at bottom-right", () => {
      const result = normalizePoint({ x: 1000, y: 800 }, baseTransform);
      expect(result).toEqual({ x: 1, y: 1 });
    });

    it("accounts for pan offset", () => {
      const transform: CanvasTransform = {
        ...baseTransform,
        position: { x: 100, y: 50 },
      };

      const result = normalizePoint({ x: 100, y: 50 }, transform);
      expect(result).toEqual({ x: 0, y: 0 }); // Offset cancels out to origin
    });

    it("accounts for zoom scale", () => {
      const transform: CanvasTransform = {
        ...baseTransform,
        scale: 2, // 2x zoom
      };

      // At 2x zoom, screen point 1000 maps to canvas point 500
      const result = normalizePoint({ x: 1000, y: 800 }, transform);
      expect(result).toEqual({ x: 0.5, y: 0.5 });
    });

    it("denormalizes point back to screen space", () => {
      const normalized = { x: 0.5, y: 0.5 };
      const result = denormalizePoint(normalized, baseTransform);
      expect(result).toEqual({ x: 500, y: 400 });
    });

    it("round-trips normalize and denormalize", () => {
      const original = { x: 123, y: 456 };
      const normalized = normalizePoint(original, baseTransform);
      const restored = denormalizePoint(normalized, baseTransform);

      expect(restored.x).toBeCloseTo(original.x);
      expect(restored.y).toBeCloseTo(original.y);
    });

    it("normalizes bounds", () => {
      const bounds = { x: 100, y: 80, width: 200, height: 160 };
      const result = normalizeBounds(bounds, baseTransform);

      expect(result).toEqual({
        x: 0.1,
        y: 0.1,
        width: 0.2,
        height: 0.2,
      });
    });

    it("denormalizes bounds back to screen space", () => {
      const normalized = { x: 0.1, y: 0.1, width: 0.2, height: 0.2 };
      const result = denormalizeBounds(normalized, baseTransform);

      expect(result).toEqual({
        x: 100,
        y: 80,
        width: 200,
        height: 160,
      });
    });

    it("checks if point is in bounds", () => {
      expect(isPointInBounds({ x: 0.5, y: 0.5 })).toBe(true);
      expect(isPointInBounds({ x: 0, y: 0 })).toBe(true);
      expect(isPointInBounds({ x: 1, y: 1 })).toBe(true);
      expect(isPointInBounds({ x: -0.1, y: 0.5 })).toBe(false);
      expect(isPointInBounds({ x: 0.5, y: 1.1 })).toBe(false);
    });

    it("clamps point to valid range", () => {
      expect(clampPoint({ x: -0.5, y: 0.5 })).toEqual({ x: 0, y: 0.5 });
      expect(clampPoint({ x: 0.5, y: 1.5 })).toEqual({ x: 0.5, y: 1 });
      expect(clampPoint({ x: -1, y: 2 })).toEqual({ x: 0, y: 1 });
    });

    it("checks if bounds is in range", () => {
      expect(isBoundsInRange({ x: 0.1, y: 0.1, width: 0.5, height: 0.5 })).toBe(true);
      expect(isBoundsInRange({ x: 0, y: 0, width: 1, height: 1 })).toBe(true);
      expect(isBoundsInRange({ x: 0.5, y: 0.5, width: 0.6, height: 0.3 })).toBe(false);
      expect(isBoundsInRange({ x: -0.1, y: 0, width: 0.5, height: 0.5 })).toBe(false);
    });
  });

  describe("Point Capture", () => {
    it("captures point at origin", () => {
      const result = capturePoint({ x: 0, y: 0 }, baseConfig);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.snapshot.data.type).toBe("point");
      if (result.snapshot.data.type !== "point") return;

      expect(result.snapshot.data.data.x).toBe(0);
      expect(result.snapshot.data.data.y).toBe(0);
      expect(result.snapshot.revision).toBe(1); // First capture increments
    });

    it("captures point at center", () => {
      const result = capturePoint({ x: 500, y: 400 }, baseConfig);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      if (result.snapshot.data.type !== "point") return;
      expect(result.snapshot.data.data.x).toBe(0.5);
      expect(result.snapshot.data.data.y).toBe(0.5);
    });

    it("increments revision on explicit mode with data change", () => {
      const config: CaptureConfig = {
        ...baseConfig,
        currentRevision: 1, // Match previous snapshot's revision
      };

      const previous: SpatialInputSnapshot = {
        data: { type: "point", data: { x: 0.5, y: 0.5 } },
        capturedAt: new Date(),
        revision: 1,
      };

      const result = capturePoint({ x: 600, y: 400 }, config, previous);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.newRevision).toBe(2); // Data changed, increment
    });

    it("does not increment revision on explicit mode without data change", () => {
      const config: CaptureConfig = {
        ...baseConfig,
        currentRevision: 1, // Match previous snapshot's revision
      };

      const previous: SpatialInputSnapshot = {
        data: { type: "point", data: { x: 0.5, y: 0.5 } },
        capturedAt: new Date(),
        revision: 1,
      };

      // Capture same point
      const result = capturePoint({ x: 500, y: 400 }, config, previous);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.newRevision).toBe(1); // Data unchanged, no increment
    });

    it("always increments revision on interaction mode", () => {
      const interactionConfig: CaptureConfig = {
        ...baseConfig,
        reason: "interaction",
        currentRevision: 1,
      };

      const previous: SpatialInputSnapshot = {
        data: { type: "point", data: { x: 0.5, y: 0.5 } },
        capturedAt: new Date(),
        revision: 1,
      };

      // Capture same point in interaction mode
      const result = capturePoint({ x: 500, y: 400 }, interactionConfig, previous);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.newRevision).toBe(2); // Always increment in interaction mode
    });

    it("sets capturedAt timestamp", () => {
      const before = new Date();
      const result = capturePoint({ x: 500, y: 400 }, baseConfig);
      const after = new Date();

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.snapshot.capturedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.snapshot.capturedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe("Selection Capture", () => {
    it("captures selection bounds", () => {
      const bounds = { x: 100, y: 80, width: 200, height: 160 };
      const result = captureSelection(bounds, baseConfig);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.snapshot.data.type).toBe("selection");
      if (result.snapshot.data.type !== "selection") return;

      expect(result.snapshot.data.data).toEqual({
        x: 0.1,
        y: 0.1,
        width: 0.2,
        height: 0.2,
      });
    });

    it("rejects zero width", () => {
      const bounds = { x: 100, y: 80, width: 0, height: 160 };
      const result = captureSelection(bounds, baseConfig);

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error).toContain("positive width");
    });

    it("rejects zero height", () => {
      const bounds = { x: 100, y: 80, width: 200, height: 0 };
      const result = captureSelection(bounds, baseConfig);

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error).toContain("positive");
    });

    it("rejects negative dimensions", () => {
      const bounds = { x: 100, y: 80, width: -200, height: 160 };
      const result = captureSelection(bounds, baseConfig);

      expect(result.ok).toBe(false);
    });

    it("increments revision on data change", () => {
      const config: CaptureConfig = {
        ...baseConfig,
        currentRevision: 1,
      };

      const previous: SpatialInputSnapshot = {
        data: {
          type: "selection",
          data: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
        },
        capturedAt: new Date(),
        revision: 1,
      };

      // Different bounds
      const bounds = { x: 200, y: 160, width: 200, height: 160 };
      const result = captureSelection(bounds, config, previous);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.newRevision).toBe(2);
    });
  });

  describe("Mask Capture", () => {
    it("captures mask with bounds", () => {
      const bounds = { x: 100, y: 80, width: 200, height: 160 };
      const result = captureMask("mask-123", bounds, baseConfig);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.snapshot.data.type).toBe("mask");
      if (result.snapshot.data.type !== "mask") return;

      expect(result.snapshot.data.data.maskId).toBe("mask-123");
      expect(result.snapshot.data.data.bounds).toEqual({
        x: 0.1,
        y: 0.1,
        width: 0.2,
        height: 0.2,
      });
    });

    it("rejects empty mask ID", () => {
      const bounds = { x: 100, y: 80, width: 200, height: 160 };
      const result = captureMask("", bounds, baseConfig);

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error).toContain("Mask ID is required");
    });

    it("rejects whitespace-only mask ID", () => {
      const bounds = { x: 100, y: 80, width: 200, height: 160 };
      const result = captureMask("   ", bounds, baseConfig);

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error).toContain("Mask ID is required");
    });

    it("increments revision when mask ID changes", () => {
      const config: CaptureConfig = {
        ...baseConfig,
        currentRevision: 1,
      };

      const previous: SpatialInputSnapshot = {
        data: {
          type: "mask",
          data: {
            maskId: "mask-123",
            bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
          },
        },
        capturedAt: new Date(),
        revision: 1,
      };

      const bounds = { x: 100, y: 80, width: 200, height: 160 };
      const result = captureMask("mask-456", bounds, config, previous);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.newRevision).toBe(2);
    });
  });

  describe("Image Capture", () => {
    it("captures image entity reference", () => {
      const result = captureImage("entity-123", baseConfig);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.snapshot.data.type).toBe("image");
      if (result.snapshot.data.type !== "image") return;

      expect(result.snapshot.data.data.entityId).toBe("entity-123");
    });

    it("rejects empty entity ID", () => {
      const result = captureImage("", baseConfig);

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error).toContain("Entity ID is required");
    });

    it("rejects whitespace-only entity ID", () => {
      const result = captureImage("   ", baseConfig);

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error).toContain("Entity ID is required");
    });

    it("increments revision when entity changes", () => {
      const config: CaptureConfig = {
        ...baseConfig,
        currentRevision: 1,
      };

      const previous: SpatialInputSnapshot = {
        data: {
          type: "image",
          data: { entityId: "entity-123" },
        },
        capturedAt: new Date(),
        revision: 1,
      };

      const result = captureImage("entity-456", config, previous);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.newRevision).toBe(2);
    });

    it("does not increment revision when entity unchanged", () => {
      const config: CaptureConfig = {
        ...baseConfig,
        currentRevision: 1,
      };

      const previous: SpatialInputSnapshot = {
        data: {
          type: "image",
          data: { entityId: "entity-123" },
        },
        capturedAt: new Date(),
        revision: 1,
      };

      const result = captureImage("entity-123", config, previous);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.newRevision).toBe(1); // Unchanged
    });
  });

  describe("Revision Policy", () => {
    it("first capture always increments from 0 to 1", () => {
      const result = capturePoint({ x: 500, y: 400 }, baseConfig);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.newRevision).toBe(1);
    });

    it("explicit mode with unchanged data does not increment", () => {
      const config: CaptureConfig = {
        ...baseConfig,
        reason: "explicit",
        currentRevision: 5,
      };

      const previous: SpatialInputSnapshot = {
        data: { type: "point", data: { x: 0.5, y: 0.5 } },
        capturedAt: new Date(),
        revision: 5,
      };

      const result = capturePoint({ x: 500, y: 400 }, config, previous);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.newRevision).toBe(5); // Stays at 5
    });

    it("interaction mode always increments", () => {
      const config: CaptureConfig = {
        ...baseConfig,
        reason: "interaction",
        currentRevision: 5,
      };

      const previous: SpatialInputSnapshot = {
        data: { type: "point", data: { x: 0.5, y: 0.5 } },
        capturedAt: new Date(),
        revision: 5,
      };

      // Same data, but interaction mode
      const result = capturePoint({ x: 500, y: 400 }, config, previous);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.newRevision).toBe(6); // Increments regardless
    });
  });
});
