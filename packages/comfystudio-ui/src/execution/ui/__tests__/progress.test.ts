/**
 * Progress Tests
 *
 * Tests execution progress state derivation.
 *
 * Milestones: M4.4 - Progress Indicators
 */

import { describe, it, expect } from "vitest";
import {
  getActiveProgress,
  getProgress,
  getToolProgress,
  aggregateProgress,
  formatProgress,
  formatElapsedTime,
  formatPhase,
  getProgressColor,
} from "../progress";
import type { ExecutionStateSnapshot } from "../../service";
import type { WorkflowExecution } from "../../types";

describe("Execution Progress", () => {
  // Helper to create execution
  const createExecution = (
    id: string,
    state: WorkflowExecution["state"],
    overrides?: Partial<WorkflowExecution>
  ): WorkflowExecution => ({
    id,
    toolId: "test-tool",
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

  describe("getActiveProgress", () => {
    it("returns empty array for null snapshot", () => {
      const progress = getActiveProgress(null);
      expect(progress).toEqual([]);
    });

    it("includes only queued and executing", () => {
      const executions = new Map([
        ["exec-1", createExecution("exec-1", "idle")],
        ["exec-2", createExecution("exec-2", "queued")],
        ["exec-3", createExecution("exec-3", "executing")],
        ["exec-4", createExecution("exec-4", "completed")],
        ["exec-5", createExecution("exec-5", "failed")],
        ["exec-6", createExecution("exec-6", "cancelled")],
      ]);

      const snapshot = createSnapshot(executions);
      const progress = getActiveProgress(snapshot);

      expect(progress).toHaveLength(2);
      expect(progress.map((p) => p.state)).toEqual(["queued", "executing"]);
    });

    it("includes progress percentage if available", () => {
      const executions = new Map([
        ["exec-1", createExecution("exec-1", "executing", { progress: 45 })],
      ]);

      const snapshot = createSnapshot(executions);
      const progress = getActiveProgress(snapshot);

      expect(progress[0].progress).toBe(45);
    });

    it("calculates elapsed time", () => {
      const queuedAt = new Date(Date.now() - 5000); // 5 seconds ago

      const executions = new Map([
        ["exec-1", createExecution("exec-1", "executing", { queuedAt })],
      ]);

      const snapshot = createSnapshot(executions);
      const progress = getActiveProgress(snapshot);

      expect(progress[0].elapsedMs).toBeGreaterThanOrEqual(5000);
    });
  });

  describe("getProgress", () => {
    it("returns null for null snapshot", () => {
      const progress = getProgress(null, "test-tool", "exec-1");
      expect(progress).toBeNull();
    });

    it("returns null for nonexistent tool", () => {
      const snapshot = createSnapshot(new Map());
      const progress = getProgress(snapshot, "nonexistent", "exec-1");
      expect(progress).toBeNull();
    });

    it("returns null for nonexistent execution", () => {
      const snapshot = createSnapshot(new Map());
      const progress = getProgress(snapshot, "test-tool", "nonexistent");
      expect(progress).toBeNull();
    });

    it("returns progress for existing execution", () => {
      const executions = new Map([
        ["exec-1", createExecution("exec-1", "executing", { progress: 50 })],
      ]);

      const snapshot = createSnapshot(executions);
      const progress = getProgress(snapshot, "test-tool", "exec-1");

      expect(progress).not.toBeNull();
      expect(progress?.executionId).toBe("exec-1");
      expect(progress?.progress).toBe(50);
    });

    it("sets isComplete for terminal states", () => {
      const completedExec = new Map([
        ["exec-1", createExecution("exec-1", "completed")],
      ]);

      const failedExec = new Map([
        ["exec-2", createExecution("exec-2", "failed")],
      ]);

      const cancelledExec = new Map([
        ["exec-3", createExecution("exec-3", "cancelled")],
      ]);

      expect(getProgress(createSnapshot(completedExec), "test-tool", "exec-1")?.isComplete).toBe(true);
      expect(getProgress(createSnapshot(failedExec), "test-tool", "exec-2")?.isComplete).toBe(true);
      expect(getProgress(createSnapshot(cancelledExec), "test-tool", "exec-3")?.isComplete).toBe(true);
    });

    it("sets isComplete false for non-terminal states", () => {
      const queuedExec = new Map([
        ["exec-1", createExecution("exec-1", "queued")],
      ]);

      const executingExec = new Map([
        ["exec-2", createExecution("exec-2", "executing")],
      ]);

      expect(getProgress(createSnapshot(queuedExec), "test-tool", "exec-1")?.isComplete).toBe(false);
      expect(getProgress(createSnapshot(executingExec), "test-tool", "exec-2")?.isComplete).toBe(false);
    });

    it("includes error message for failed executions", () => {
      const executions = new Map([
        ["exec-1", createExecution("exec-1", "failed", { error: "Test error" })],
      ]);

      const snapshot = createSnapshot(executions);
      const progress = getProgress(snapshot, "test-tool", "exec-1");

      expect(progress?.error).toBe("Test error");
    });
  });

  describe("getToolProgress", () => {
    it("returns empty array for null snapshot", () => {
      const progress = getToolProgress(null, "test-tool");
      expect(progress).toEqual([]);
    });

    it("returns empty array for nonexistent tool", () => {
      const snapshot = createSnapshot(new Map());
      const progress = getToolProgress(snapshot, "nonexistent");
      expect(progress).toEqual([]);
    });

    it("returns progress for all executions", () => {
      const executions = new Map([
        ["exec-1", createExecution("exec-1", "queued")],
        ["exec-2", createExecution("exec-2", "executing")],
        ["exec-3", createExecution("exec-3", "completed")],
      ]);

      const snapshot = createSnapshot(executions);
      const progress = getToolProgress(snapshot, "test-tool");

      expect(progress).toHaveLength(3);
    });

    it("excludes idle executions", () => {
      const executions = new Map([
        ["exec-1", createExecution("exec-1", "idle")],
        ["exec-2", createExecution("exec-2", "queued")],
      ]);

      const snapshot = createSnapshot(executions);
      const progress = getToolProgress(snapshot, "test-tool");

      expect(progress).toHaveLength(1);
      expect(progress[0].executionId).toBe("exec-2");
    });
  });

  describe("aggregateProgress", () => {
    it("returns zero summary for empty array", () => {
      const summary = aggregateProgress([]);

      expect(summary).toEqual({
        total: 0,
        queued: 0,
        executing: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        averageProgress: undefined,
      });
    });

    it("counts executions by state", () => {
      const progress = [
        { executionId: "1", toolId: "test", state: "queued" as const, phase: "queued" as const, isComplete: false },
        { executionId: "2", toolId: "test", state: "queued" as const, phase: "queued" as const, isComplete: false },
        { executionId: "3", toolId: "test", state: "executing" as const, phase: "executing" as const, isComplete: false },
        { executionId: "4", toolId: "test", state: "completed" as const, phase: "completed" as const, isComplete: true },
        { executionId: "5", toolId: "test", state: "failed" as const, phase: "failed" as const, isComplete: true },
        { executionId: "6", toolId: "test", state: "cancelled" as const, phase: "cancelled" as const, isComplete: true },
      ];

      const summary = aggregateProgress(progress);

      expect(summary.total).toBe(6);
      expect(summary.queued).toBe(2);
      expect(summary.executing).toBe(1);
      expect(summary.completed).toBe(1);
      expect(summary.failed).toBe(1);
      expect(summary.cancelled).toBe(1);
    });

    it("calculates average progress", () => {
      const progress = [
        { executionId: "1", toolId: "test", state: "executing" as const, phase: "executing" as const, isComplete: false, progress: 20 },
        { executionId: "2", toolId: "test", state: "executing" as const, phase: "executing" as const, isComplete: false, progress: 40 },
        { executionId: "3", toolId: "test", state: "executing" as const, phase: "executing" as const, isComplete: false, progress: 60 },
      ];

      const summary = aggregateProgress(progress);

      expect(summary.averageProgress).toBe(40); // (20 + 40 + 60) / 3
    });

    it("handles executions without progress data", () => {
      const progress = [
        { executionId: "1", toolId: "test", state: "executing" as const, phase: "executing" as const, isComplete: false, progress: 50 },
        { executionId: "2", toolId: "test", state: "queued" as const, phase: "queued" as const, isComplete: false }, // No progress
      ];

      const summary = aggregateProgress(progress);

      expect(summary.averageProgress).toBe(50); // Only counts execution with progress
    });

    it("returns undefined average when no progress data", () => {
      const progress = [
        { executionId: "1", toolId: "test", state: "queued" as const, phase: "queued" as const, isComplete: false },
        { executionId: "2", toolId: "test", state: "queued" as const, phase: "queued" as const, isComplete: false },
      ];

      const summary = aggregateProgress(progress);

      expect(summary.averageProgress).toBeUndefined();
    });
  });

  describe("Formatting Functions", () => {
    it("formatProgress handles undefined", () => {
      expect(formatProgress(undefined)).toBe("—");
    });

    it("formatProgress rounds to integer", () => {
      expect(formatProgress(45.7)).toBe("46%");
      expect(formatProgress(0)).toBe("0%");
      expect(formatProgress(100)).toBe("100%");
    });

    it("formatElapsedTime handles undefined", () => {
      expect(formatElapsedTime(undefined)).toBe("—");
    });

    it("formatElapsedTime formats milliseconds", () => {
      expect(formatElapsedTime(500)).toBe("0.5s");
      expect(formatElapsedTime(1234)).toBe("1.2s");
    });

    it("formatElapsedTime formats seconds", () => {
      expect(formatElapsedTime(5000)).toBe("5s");
      expect(formatElapsedTime(45000)).toBe("45s");
    });

    it("formatElapsedTime formats minutes and seconds", () => {
      expect(formatElapsedTime(60000)).toBe("1m 0s");
      expect(formatElapsedTime(83000)).toBe("1m 23s");
      expect(formatElapsedTime(125000)).toBe("2m 5s");
    });

    it("formatPhase returns human-readable labels", () => {
      expect(formatPhase("idle")).toBe("Idle");
      expect(formatPhase("queued")).toBe("Queued");
      expect(formatPhase("executing")).toBe("Executing");
      expect(formatPhase("completed")).toBe("Completed");
      expect(formatPhase("failed")).toBe("Failed");
      expect(formatPhase("cancelled")).toBe("Cancelled");
    });

    it("getProgressColor returns Tailwind classes", () => {
      expect(getProgressColor("idle")).toBe("bg-slate-400");
      expect(getProgressColor("queued")).toBe("bg-amber-400");
      expect(getProgressColor("executing")).toBe("bg-blue-500");
      expect(getProgressColor("completed")).toBe("bg-green-500");
      expect(getProgressColor("failed")).toBe("bg-red-500");
      expect(getProgressColor("cancelled")).toBe("bg-gray-400");
    });
  });
});
