/**
 * Visualization Tests
 *
 * Tests execution visualization state derivation.
 *
 * Milestones: M4.3 - Execution Visualization
 */

import { describe, it, expect } from "vitest";
import {
  getActiveOverlays,
  getOverlaysForTool,
  getOverlay,
  getStateColor,
  isExecutionInProgress,
  isExecutionTerminal,
  getStateLabel,
  EXECUTION_COLORS,
} from "../visualization";
import type { ExecutionStateSnapshot } from "../../service";
import type { WorkflowExecution } from "../../types";

describe("Execution Visualization", () => {
  // Helper to create execution
  const createExecution = (
    id: string,
    state: WorkflowExecution["state"],
    overrides?: Partial<WorkflowExecution>
  ): WorkflowExecution => ({
    id,
    toolId: "test-tool",
    workflow: "test-workflow",
    state,
    settings: {},
    ...overrides,
  });

  // Helper to create snapshot
  const createSnapshot = (
    executions: Map<string, WorkflowExecution>
  ): ExecutionStateSnapshot => ({
    executionsByTool: new Map([["test-tool", executions]]),
    activeJobs: new Map(),
    status: "idle",
  });

  describe("getActiveOverlays", () => {
    it("returns empty array for null snapshot", () => {
      const overlays = getActiveOverlays(null);
      expect(overlays).toEqual([]);
    });

    it("excludes idle executions", () => {
      const executions = new Map([
        ["exec-1", createExecution("exec-1", "idle")],
      ]);

      const snapshot = createSnapshot(executions);
      const overlays = getActiveOverlays(snapshot);

      expect(overlays).toEqual([]);
    });

    it("includes queued executions", () => {
      const executions = new Map([
        ["exec-1", createExecution("exec-1", "queued", { queuedAt: new Date() })],
      ]);

      const snapshot = createSnapshot(executions);
      const overlays = getActiveOverlays(snapshot);

      expect(overlays).toHaveLength(1);
      expect(overlays[0].state).toBe("queued");
    });

    it("includes executing executions", () => {
      const executions = new Map([
        ["exec-1", createExecution("exec-1", "executing", { startedAt: new Date() })],
      ]);

      const snapshot = createSnapshot(executions);
      const overlays = getActiveOverlays(snapshot);

      expect(overlays).toHaveLength(1);
      expect(overlays[0].state).toBe("executing");
    });

    it("includes recent completed executions", () => {
      const executions = new Map([
        [
          "exec-1",
          createExecution("exec-1", "completed", {
            completedAt: new Date(), // Just completed
          }),
        ],
      ]);

      const snapshot = createSnapshot(executions);
      const overlays = getActiveOverlays(snapshot, 3000); // 3 second timeout

      expect(overlays).toHaveLength(1);
      expect(overlays[0].state).toBe("completed");
    });

    it("excludes old completed executions", () => {
      const oldCompletedAt = new Date(Date.now() - 5000); // 5 seconds ago

      const executions = new Map([
        [
          "exec-1",
          createExecution("exec-1", "completed", {
            completedAt: oldCompletedAt,
          }),
        ],
      ]);

      const snapshot = createSnapshot(executions);
      const overlays = getActiveOverlays(snapshot, 3000); // 3 second timeout

      expect(overlays).toEqual([]);
    });

    it("includes failed executions", () => {
      const executions = new Map([
        [
          "exec-1",
          createExecution("exec-1", "failed", {
            completedAt: new Date(),
            error: "Test error",
          }),
        ],
      ]);

      const snapshot = createSnapshot(executions);
      const overlays = getActiveOverlays(snapshot);

      expect(overlays).toHaveLength(1);
      expect(overlays[0].state).toBe("failed");
      expect(overlays[0].error).toBe("Test error");
    });

    it("includes multiple executions from multiple tools", () => {
      const snapshot: ExecutionStateSnapshot = {
        executionsByTool: new Map([
          [
            "tool-1",
            new Map([
              ["exec-1", createExecution("exec-1", "queued")],
            ]),
          ],
          [
            "tool-2",
            new Map([
              ["exec-2", createExecution("exec-2", "executing")],
            ]),
          ],
        ]),
        activeJobs: new Map(),
        status: "idle",
      };

      const overlays = getActiveOverlays(snapshot);

      expect(overlays).toHaveLength(2);
    });
  });

  describe("getOverlaysForTool", () => {
    it("returns empty array for null snapshot", () => {
      const overlays = getOverlaysForTool(null, "test-tool");
      expect(overlays).toEqual([]);
    });

    it("returns empty array for nonexistent tool", () => {
      const snapshot = createSnapshot(new Map());
      const overlays = getOverlaysForTool(snapshot, "nonexistent");
      expect(overlays).toEqual([]);
    });

    it("returns overlays for specific tool", () => {
      const executions = new Map([
        ["exec-1", createExecution("exec-1", "queued")],
        ["exec-2", createExecution("exec-2", "executing")],
      ]);

      const snapshot = createSnapshot(executions);
      const overlays = getOverlaysForTool(snapshot, "test-tool");

      expect(overlays).toHaveLength(2);
    });

    it("excludes idle executions", () => {
      const executions = new Map([
        ["exec-1", createExecution("exec-1", "idle")],
        ["exec-2", createExecution("exec-2", "queued")],
      ]);

      const snapshot = createSnapshot(executions);
      const overlays = getOverlaysForTool(snapshot, "test-tool");

      expect(overlays).toHaveLength(1);
      expect(overlays[0].executionId).toBe("exec-2");
    });
  });

  describe("getOverlay", () => {
    it("returns null for null snapshot", () => {
      const overlay = getOverlay(null, "test-tool", "exec-1");
      expect(overlay).toBeNull();
    });

    it("returns null for nonexistent tool", () => {
      const snapshot = createSnapshot(new Map());
      const overlay = getOverlay(snapshot, "nonexistent", "exec-1");
      expect(overlay).toBeNull();
    });

    it("returns null for nonexistent execution", () => {
      const snapshot = createSnapshot(new Map());
      const overlay = getOverlay(snapshot, "test-tool", "nonexistent");
      expect(overlay).toBeNull();
    });

    it("returns overlay for existing execution", () => {
      const executions = new Map([
        ["exec-1", createExecution("exec-1", "executing")],
      ]);

      const snapshot = createSnapshot(executions);
      const overlay = getOverlay(snapshot, "test-tool", "exec-1");

      expect(overlay).not.toBeNull();
      expect(overlay?.executionId).toBe("exec-1");
      expect(overlay?.state).toBe("executing");
    });

    it("includes progress if available", () => {
      const executions = new Map([
        ["exec-1", createExecution("exec-1", "executing", { progress: 45 })],
      ]);

      const snapshot = createSnapshot(executions);
      const overlay = getOverlay(snapshot, "test-tool", "exec-1");

      expect(overlay?.progress).toBe(45);
    });

    it("extracts bounds from selection spatial input", () => {
      const executions = new Map([
        [
          "exec-1",
          createExecution("exec-1", "executing", {
            spatialInput: {
              data: {
                type: "selection",
                data: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
              },
              capturedAt: new Date(),
              revision: 1,
            },
          }),
        ],
      ]);

      const snapshot = createSnapshot(executions);
      const overlay = getOverlay(snapshot, "test-tool", "exec-1");

      expect(overlay?.bounds).toEqual({
        x: 0.1,
        y: 0.2,
        width: 0.3,
        height: 0.4,
      });
    });

    it("extracts bounds from mask spatial input", () => {
      const executions = new Map([
        [
          "exec-1",
          createExecution("exec-1", "executing", {
            spatialInput: {
              data: {
                type: "mask",
                data: {
                  maskId: "mask-123",
                  bounds: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
                },
              },
              capturedAt: new Date(),
              revision: 1,
            },
          }),
        ],
      ]);

      const snapshot = createSnapshot(executions);
      const overlay = getOverlay(snapshot, "test-tool", "exec-1");

      expect(overlay?.bounds).toEqual({
        x: 0.1,
        y: 0.2,
        width: 0.3,
        height: 0.4,
      });
    });

    it("does not include bounds for point spatial input", () => {
      const executions = new Map([
        [
          "exec-1",
          createExecution("exec-1", "executing", {
            spatialInput: {
              data: {
                type: "point",
                data: { x: 0.5, y: 0.5 },
              },
              capturedAt: new Date(),
              revision: 1,
            },
          }),
        ],
      ]);

      const snapshot = createSnapshot(executions);
      const overlay = getOverlay(snapshot, "test-tool", "exec-1");

      expect(overlay?.bounds).toBeUndefined();
    });
  });

  describe("Utility Functions", () => {
    it("getStateColor returns correct colors", () => {
      expect(getStateColor("idle")).toBe(EXECUTION_COLORS.idle);
      expect(getStateColor("queued")).toBe(EXECUTION_COLORS.queued);
      expect(getStateColor("executing")).toBe(EXECUTION_COLORS.executing);
      expect(getStateColor("completed")).toBe(EXECUTION_COLORS.completed);
      expect(getStateColor("failed")).toBe(EXECUTION_COLORS.failed);
      expect(getStateColor("cancelled")).toBe(EXECUTION_COLORS.cancelled);
    });

    it("isExecutionInProgress identifies active states", () => {
      expect(isExecutionInProgress("idle")).toBe(false);
      expect(isExecutionInProgress("queued")).toBe(true);
      expect(isExecutionInProgress("executing")).toBe(true);
      expect(isExecutionInProgress("completed")).toBe(false);
      expect(isExecutionInProgress("failed")).toBe(false);
      expect(isExecutionInProgress("cancelled")).toBe(false);
    });

    it("isExecutionTerminal identifies terminal states", () => {
      expect(isExecutionTerminal("idle")).toBe(false);
      expect(isExecutionTerminal("queued")).toBe(false);
      expect(isExecutionTerminal("executing")).toBe(false);
      expect(isExecutionTerminal("completed")).toBe(true);
      expect(isExecutionTerminal("failed")).toBe(true);
      expect(isExecutionTerminal("cancelled")).toBe(true);
    });

    it("getStateLabel returns human-readable labels", () => {
      expect(getStateLabel("idle")).toBe("Idle");
      expect(getStateLabel("queued")).toBe("Queued");
      expect(getStateLabel("executing")).toBe("Executing");
      expect(getStateLabel("completed")).toBe("Completed");
      expect(getStateLabel("failed")).toBe("Failed");
      expect(getStateLabel("cancelled")).toBe("Cancelled");
    });
  });
});
