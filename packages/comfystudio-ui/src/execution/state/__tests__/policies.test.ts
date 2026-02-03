/**
 * Run Policy Tests - All 4 Policies
 *
 * Tests: single, replace, parallel, queue policies
 */

import { describe, it, expect, beforeEach } from "vitest";
import type {
  WorkflowTool,
  ToolExecutionState,
  WorkflowExecution,
} from "../../types";
import * as queue from "../queue";
import * as ops from "../ops";

describe("Run Policies", () => {
  // Helper to create a minimal workflow tool
  function createTool(
    runPolicy: "single" | "replace" | "parallel" | "queue"
  ): WorkflowTool {
    return {
      id: "test-tool",
      name: "Test Tool",
      description: "Test",
      icon: "Test",
      category: "workflow",
      workflow: "test",
      runPolicy,
      triggerMode: "explicit",
      requiresSpatialInput: false,
    };
  }

  // Helper to create empty tool state
  function createToolState(toolId: string): ToolExecutionState {
    return {
      toolId,
      executions: new Map(),
      queuedIds: [],
      executingIds: [],
    };
  }

  // Helper to enqueue and start execution
  function enqueueAndStart(
    tool: WorkflowTool,
    toolState: ToolExecutionState
  ): WorkflowExecution {
    const exec = queue.enqueueRun(tool, toolState, {});
    if (!exec) throw new Error("Failed to enqueue");

    // Move to executing
    ops.advanceQueue(tool, toolState);

    return exec;
  }

  describe("Single Policy", () => {
    let tool: WorkflowTool;
    let toolState: ToolExecutionState;

    beforeEach(() => {
      tool = createTool("single");
      toolState = createToolState(tool.id);
    });

    it("allows first execution", () => {
      const exec = queue.enqueueRun(tool, toolState, {});
      expect(exec).not.toBeNull();
      expect(toolState.queuedIds).toHaveLength(1);
    });

    it("rejects second execution while first is queued", () => {
      queue.enqueueRun(tool, toolState, {});

      const exec2 = queue.enqueueRun(tool, toolState, {});
      expect(exec2).toBeNull();
      expect(toolState.queuedIds).toHaveLength(1);
    });

    it("rejects second execution while first is executing", () => {
      enqueueAndStart(tool, toolState);

      const exec2 = queue.enqueueRun(tool, toolState, {});
      expect(exec2).toBeNull();
    });

    it("rejects second execution while first is completed (not dismissed)", () => {
      const exec1 = enqueueAndStart(tool, toolState);
      ops.completeExecution(exec1, {});
      ops.removeFromExecuting(toolState, exec1.id);

      // Terminal execution exists but not dismissed
      const exec2 = queue.enqueueRun(tool, toolState, {});
      expect(exec2).toBeNull();
    });

    it("allows new execution after dismissing completed", () => {
      const exec1 = enqueueAndStart(tool, toolState);
      ops.completeExecution(exec1, {});
      ops.removeFromExecuting(toolState, exec1.id);

      // Dismiss by resetting
      ops.resetExecution(exec1);
      toolState.activeExecutionId = undefined;

      // Now can enqueue new
      const exec2 = queue.enqueueRun(tool, toolState, {});
      expect(exec2).not.toBeNull();
    });
  });

  describe("Replace Policy", () => {
    let tool: WorkflowTool;
    let toolState: ToolExecutionState;

    beforeEach(() => {
      tool = createTool("replace");
      toolState = createToolState(tool.id);
    });

    it("allows first execution", () => {
      const exec = queue.enqueueRun(tool, toolState, {});
      expect(exec).not.toBeNull();
    });

    it("cancels previous queued execution and enqueues new", () => {
      const exec1 = queue.enqueueRun(tool, toolState, {});
      expect(exec1).not.toBeNull();

      const exec2 = queue.enqueueRun(tool, toolState, {});
      expect(exec2).not.toBeNull();

      // Exec1 should be cancelled
      expect(exec1!.state).toBe("cancelled");

      // Only exec2 in queue
      expect(toolState.queuedIds).toHaveLength(1);
      expect(toolState.queuedIds[0]).toBe(exec2!.id);
    });

    it("cancels executing execution and enqueues new", () => {
      const exec1 = enqueueAndStart(tool, toolState);

      const exec2 = queue.enqueueRun(tool, toolState, {});
      expect(exec2).not.toBeNull();

      // Exec1 should be cancelled
      expect(exec1.state).toBe("cancelled");

      // Exec2 should be queued
      expect(toolState.queuedIds).toHaveLength(1);
      expect(toolState.executingIds).toHaveLength(0); // exec1 removed
    });

    it("clears entire queue when replacing", () => {
      // This requires manually adding to queue since replace cancels
      const exec1 = queue.createExecution(tool.id, tool.workflow, {});
      const exec2 = queue.createExecution(tool.id, tool.workflow, {});

      ops.enqueueExecution(exec1, {});
      ops.enqueueExecution(exec2, {});

      toolState.executions.set(exec1.id, exec1);
      toolState.executions.set(exec2.id, exec2);
      toolState.queuedIds.push(exec1.id, exec2.id);

      // Replace with new
      const exec3 = queue.enqueueRun(tool, toolState, {});

      // Both exec1 and exec2 should be cancelled
      expect(exec1.state).toBe("cancelled");
      expect(exec2.state).toBe("cancelled");

      // Only exec3 in queue
      expect(toolState.queuedIds).toHaveLength(1);
      expect(toolState.queuedIds[0]).toBe(exec3!.id);
    });
  });

  describe("Parallel Policy", () => {
    let tool: WorkflowTool;
    let toolState: ToolExecutionState;

    beforeEach(() => {
      tool = createTool("parallel");
      toolState = createToolState(tool.id);
    });

    it("allows multiple queued executions", () => {
      const exec1 = queue.enqueueRun(tool, toolState, {});
      const exec2 = queue.enqueueRun(tool, toolState, {});
      const exec3 = queue.enqueueRun(tool, toolState, {});

      expect(exec1).not.toBeNull();
      expect(exec2).not.toBeNull();
      expect(exec3).not.toBeNull();
      expect(toolState.queuedIds).toHaveLength(3);
    });

    it("allows multiple executing concurrently", () => {
      const exec1 = enqueueAndStart(tool, toolState);
      const exec2 = enqueueAndStart(tool, toolState);
      const exec3 = enqueueAndStart(tool, toolState);

      expect(exec1.state).toBe("executing");
      expect(exec2.state).toBe("executing");
      expect(exec3.state).toBe("executing");
      expect(toolState.executingIds).toHaveLength(3);
    });

    it("does not block new executions", () => {
      // Start 10 executions
      for (let i = 0; i < 10; i++) {
        enqueueAndStart(tool, toolState);
      }

      // Can still enqueue more
      const exec11 = queue.enqueueRun(tool, toolState, {});
      expect(exec11).not.toBeNull();
    });
  });

  describe("Queue Policy", () => {
    let tool: WorkflowTool;
    let toolState: ToolExecutionState;

    beforeEach(() => {
      tool = createTool("queue");
      toolState = createToolState(tool.id);
    });

    it("allows first execution to start immediately", () => {
      const exec1 = queue.enqueueRun(tool, toolState, {});
      expect(exec1).not.toBeNull();

      ops.advanceQueue(tool, toolState);
      expect(exec1!.state).toBe("executing");
    });

    it("queues second execution while first executes", () => {
      const exec1 = enqueueAndStart(tool, toolState);
      const exec2 = queue.enqueueRun(tool, toolState, {});

      expect(exec1.state).toBe("executing");
      expect(exec2!.state).toBe("queued");
      expect(toolState.executingIds).toHaveLength(1);
      expect(toolState.queuedIds).toHaveLength(1);
    });

    it("advances queue when first completes (FIFO)", () => {
      const exec1 = enqueueAndStart(tool, toolState);
      const exec2 = queue.enqueueRun(tool, toolState, {});
      const exec3 = queue.enqueueRun(tool, toolState, {});

      // Complete exec1
      ops.completeExecution(exec1, {});
      ops.removeFromExecuting(toolState, exec1.id);

      // Advance queue - exec2 should start
      ops.advanceQueue(tool, toolState);

      expect(exec2!.state).toBe("executing");
      expect(exec3!.state).toBe("queued");
      expect(toolState.executingIds).toHaveLength(1);
      expect(toolState.queuedIds).toHaveLength(1);
    });

    it("maintains FIFO order", () => {
      const exec1 = enqueueAndStart(tool, toolState);
      const exec2 = queue.enqueueRun(tool, toolState, {});
      const exec3 = queue.enqueueRun(tool, toolState, {});
      const exec4 = queue.enqueueRun(tool, toolState, {});

      // Complete and advance
      ops.completeExecution(exec1, {});
      ops.removeFromExecuting(toolState, exec1.id);
      ops.advanceQueue(tool, toolState);

      expect(exec2!.state).toBe("executing");

      ops.completeExecution(exec2!, {});
      ops.removeFromExecuting(toolState, exec2!.id);
      ops.advanceQueue(tool, toolState);

      expect(exec3!.state).toBe("executing");

      ops.completeExecution(exec3!, {});
      ops.removeFromExecuting(toolState, exec3!.id);
      ops.advanceQueue(tool, toolState);

      expect(exec4!.state).toBe("executing");
    });

    it("does not allow concurrent execution", () => {
      const exec1 = enqueueAndStart(tool, toolState);
      const exec2 = queue.enqueueRun(tool, toolState, {});

      // Try to advance while exec1 still executing
      const advanced = ops.advanceQueue(tool, toolState);

      expect(advanced).toBeNull(); // Cannot advance
      expect(exec2!.state).toBe("queued");
      expect(toolState.executingIds).toHaveLength(1);
    });
  });
});
