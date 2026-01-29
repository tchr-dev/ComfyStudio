/**
 * Revision Tracking Tests
 *
 * Tests: Interaction vs explicit increment rules, stale prevention
 */

import { describe, it, expect, beforeEach } from "vitest";
import type {
  WorkflowTool,
  ToolExecutionState,
  SpatialInput,
} from "../../types";
import * as revisions from "../revisions";

describe("Revision Tracking", () => {
  // Helper to create workflow tool
  function createTool(
    triggerMode: "explicit" | "interaction",
    spatialInputType: SpatialInput["type"]
  ): WorkflowTool {
    return {
      id: "test-tool",
      name: "Test Tool",
      description: "Test",
      icon: "Test",
      category: "workflow",
      workflow: "test",
      triggerMode,
      requiresSpatialInput: true,
      spatialInputType,
    };
  }

  function createToolState(toolId: string): ToolExecutionState {
    return {
      toolId,
      executions: new Map(),
      queuedIds: [],
      executingIds: [],
    };
  }

  describe("Spatial Input Equality", () => {
    it("considers identical points equal", () => {
      const a: SpatialInput = { type: "point", data: { x: 10, y: 20 } };
      const b: SpatialInput = { type: "point", data: { x: 10, y: 20 } };

      expect(revisions.isSameSpatialInput(a, b)).toBe(true);
    });

    it("considers different points unequal", () => {
      const a: SpatialInput = { type: "point", data: { x: 10, y: 20 } };
      const b: SpatialInput = { type: "point", data: { x: 10, y: 21 } };

      expect(revisions.isSameSpatialInput(a, b)).toBe(false);
    });

    it("considers identical selections equal", () => {
      const a: SpatialInput = {
        type: "selection",
        data: { x: 10, y: 20, width: 100, height: 50 },
      };
      const b: SpatialInput = {
        type: "selection",
        data: { x: 10, y: 20, width: 100, height: 50 },
      };

      expect(revisions.isSameSpatialInput(a, b)).toBe(true);
    });

    it("considers different selections unequal", () => {
      const a: SpatialInput = {
        type: "selection",
        data: { x: 10, y: 20, width: 100, height: 50 },
      };
      const b: SpatialInput = {
        type: "selection",
        data: { x: 10, y: 20, width: 101, height: 50 },
      };

      expect(revisions.isSameSpatialInput(a, b)).toBe(false);
    });

    it("considers different types unequal", () => {
      const a: SpatialInput = { type: "point", data: { x: 10, y: 20 } };
      const b: SpatialInput = {
        type: "selection",
        data: { x: 10, y: 20, width: 1, height: 1 },
      };

      expect(revisions.isSameSpatialInput(a, b)).toBe(false);
    });
  });

  describe("Interaction Tools - Always Increment", () => {
    let tool: WorkflowTool;
    let toolState: ToolExecutionState;

    beforeEach(() => {
      tool = createTool("interaction", "point");
      toolState = createToolState(tool.id);
    });

    it("increments revision on first capture", () => {
      const snapshot: SpatialInput = { type: "point", data: { x: 10, y: 20 } };

      const captured = revisions.captureSpatialInput(
        tool,
        toolState,
        snapshot,
        "interaction"
      );

      expect(captured.revision).toBe(1);
      expect(toolState.currentSpatialInput?.revision).toBe(1);
    });

    it("increments revision on every capture (even if data identical)", () => {
      const snapshot: SpatialInput = { type: "point", data: { x: 10, y: 20 } };

      // First capture
      revisions.captureSpatialInput(tool, toolState, snapshot, "interaction");

      // Second capture with same data
      const captured2 = revisions.captureSpatialInput(
        tool,
        toolState,
        snapshot,
        "interaction"
      );

      expect(captured2.revision).toBe(2);

      // Third capture with same data
      const captured3 = revisions.captureSpatialInput(
        tool,
        toolState,
        snapshot,
        "interaction"
      );

      expect(captured3.revision).toBe(3);
    });

    it("increments revision when data changes", () => {
      const snapshot1: SpatialInput = {
        type: "point",
        data: { x: 10, y: 20 },
      };
      const snapshot2: SpatialInput = {
        type: "point",
        data: { x: 15, y: 25 },
      };

      revisions.captureSpatialInput(tool, toolState, snapshot1, "interaction");

      const captured2 = revisions.captureSpatialInput(
        tool,
        toolState,
        snapshot2,
        "interaction"
      );

      expect(captured2.revision).toBe(2);
    });
  });

  describe("Explicit Tools - Increment Only on Data Change", () => {
    let tool: WorkflowTool;
    let toolState: ToolExecutionState;

    beforeEach(() => {
      tool = createTool("explicit", "selection");
      toolState = createToolState(tool.id);
    });

    it("increments revision on first capture", () => {
      const snapshot: SpatialInput = {
        type: "selection",
        data: { x: 10, y: 20, width: 100, height: 50 },
      };

      const captured = revisions.captureSpatialInput(
        tool,
        toolState,
        snapshot,
        "explicit"
      );

      expect(captured.revision).toBe(1);
    });

    it("does NOT increment when data is identical", () => {
      const snapshot: SpatialInput = {
        type: "selection",
        data: { x: 10, y: 20, width: 100, height: 50 },
      };

      // First capture
      revisions.captureSpatialInput(tool, toolState, snapshot, "explicit");

      // Second capture with same data
      const captured2 = revisions.captureSpatialInput(
        tool,
        toolState,
        snapshot,
        "explicit"
      );

      expect(captured2.revision).toBe(1); // Still 1

      // Third capture with same data
      const captured3 = revisions.captureSpatialInput(
        tool,
        toolState,
        snapshot,
        "explicit"
      );

      expect(captured3.revision).toBe(1); // Still 1
    });

    it("increments when data changes", () => {
      const snapshot1: SpatialInput = {
        type: "selection",
        data: { x: 10, y: 20, width: 100, height: 50 },
      };
      const snapshot2: SpatialInput = {
        type: "selection",
        data: { x: 10, y: 20, width: 101, height: 50 },
      };

      revisions.captureSpatialInput(tool, toolState, snapshot1, "explicit");

      const captured2 = revisions.captureSpatialInput(
        tool,
        toolState,
        snapshot2,
        "explicit"
      );

      expect(captured2.revision).toBe(2);
    });

    it("allows multiple executions with same revision", () => {
      const snapshot: SpatialInput = {
        type: "selection",
        data: { x: 10, y: 20, width: 100, height: 50 },
      };

      const captured = revisions.captureSpatialInput(
        tool,
        toolState,
        snapshot,
        "explicit"
      );

      // Simulate queueing with same revision
      toolState.lastQueuedRevision = captured.revision;

      // Capture again (same data)
      const captured2 = revisions.captureSpatialInput(
        tool,
        toolState,
        snapshot,
        "explicit"
      );

      // Revision unchanged
      expect(captured2.revision).toBe(captured.revision);

      // Not stale for explicit tools (only matters for interaction)
      expect(revisions.isStale(captured2.revision, toolState.lastQueuedRevision)).toBe(true);
    });
  });

  describe("Stale Input Prevention", () => {
    it("returns false when no previous queue", () => {
      expect(revisions.isStale(1, undefined)).toBe(false);
    });

    it("returns false when current revision is newer", () => {
      expect(revisions.isStale(2, 1)).toBe(false);
    });

    it("returns true when current revision equals last queued", () => {
      expect(revisions.isStale(1, 1)).toBe(true);
    });

    it("returns true when current revision is older", () => {
      expect(revisions.isStale(1, 2)).toBe(true);
    });
  });

  describe("Force Bump Revision", () => {
    let tool: WorkflowTool;
    let toolState: ToolExecutionState;

    beforeEach(() => {
      tool = createTool("explicit", "point");
      toolState = createToolState(tool.id);
    });

    it("throws if no spatial input captured", () => {
      expect(() => revisions.forceBumpRevision(toolState)).toThrow(
        /no spatial input captured/
      );
    });

    it("increments revision by 1", () => {
      const snapshot: SpatialInput = { type: "point", data: { x: 10, y: 20 } };

      revisions.captureSpatialInput(tool, toolState, snapshot, "explicit");
      expect(toolState.currentSpatialInput?.revision).toBe(1);

      const newRev = revisions.forceBumpRevision(toolState);
      expect(newRev).toBe(2);
      expect(toolState.currentSpatialInput?.revision).toBe(2);
    });

    it("can be called multiple times", () => {
      const snapshot: SpatialInput = { type: "point", data: { x: 10, y: 20 } };

      revisions.captureSpatialInput(tool, toolState, snapshot, "explicit");

      revisions.forceBumpRevision(toolState);
      expect(toolState.currentSpatialInput?.revision).toBe(2);

      revisions.forceBumpRevision(toolState);
      expect(toolState.currentSpatialInput?.revision).toBe(3);
    });
  });

  describe("Utility Functions", () => {
    let toolState: ToolExecutionState;

    beforeEach(() => {
      toolState = createToolState("test");
    });

    it("getCurrentRevision returns 0 when no input captured", () => {
      expect(revisions.getCurrentRevision(toolState)).toBe(0);
    });

    it("getCurrentRevision returns current revision", () => {
      toolState.currentSpatialInput = {
        data: { type: "point", data: { x: 10, y: 20 } },
        capturedAt: new Date(),
        revision: 5,
      };

      expect(revisions.getCurrentRevision(toolState)).toBe(5);
    });

    it("isSpatialInputCaptured returns false when not captured", () => {
      expect(revisions.isSpatialInputCaptured(toolState)).toBe(false);
    });

    it("isSpatialInputCaptured returns true when captured", () => {
      toolState.currentSpatialInput = {
        data: { type: "point", data: { x: 10, y: 20 } },
        capturedAt: new Date(),
        revision: 1,
      };

      expect(revisions.isSpatialInputCaptured(toolState)).toBe(true);
    });

    it("resetSpatialInput clears captured input", () => {
      toolState.currentSpatialInput = {
        data: { type: "point", data: { x: 10, y: 20 } },
        capturedAt: new Date(),
        revision: 1,
      };

      revisions.resetSpatialInput(toolState);

      expect(toolState.currentSpatialInput).toBeUndefined();
    });

    it("resetSpatialInput preserves lastQueuedRevision", () => {
      toolState.currentSpatialInput = {
        data: { type: "point", data: { x: 10, y: 20 } },
        capturedAt: new Date(),
        revision: 1,
      };
      toolState.lastQueuedRevision = 1;

      revisions.resetSpatialInput(toolState);

      expect(toolState.lastQueuedRevision).toBe(1);
    });
  });
});
