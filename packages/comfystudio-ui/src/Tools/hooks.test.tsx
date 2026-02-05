/**
 * Tool Execution Hooks Tests
 *
 * Tests for useTriggerExecution hook integration with execution service.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTriggerExecution } from "./hooks";
import { ToolRegistry } from "./Registry";
import { ToolState } from "./State";
import * as executionUI from "~/execution/ui";

// Mock execution UI hooks
vi.mock("~/execution/ui", () => ({
  useExecutionCommands: vi.fn(),
}));

describe("useTriggerExecution", () => {
  const mockStartExecution = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    ToolState.reset();

    // Mock useExecutionCommands to return our mock
    (executionUI.useExecutionCommands as any).mockReturnValue({
      startExecution: mockStartExecution,
    });
  });

  it("should trigger execution with collected settings", async () => {
    // Setup: Tool exists in registry and has settings
    const toolId = "generate";

    // Set some tool settings
    ToolState.initializeDefaults(toolId, {
      prompt: "A beautiful landscape",
      steps: 20,
      cfgScale: 7,
    });

    // Mock successful execution start
    mockStartExecution.mockResolvedValue({
      ok: true,
      executionId: "exec-123",
      jobId: "job-456",
    });

    // Render hook
    const { result } = renderHook(() => useTriggerExecution(toolId));

    // Initial state
    expect(result.current.isTriggering).toBe(false);
    expect(result.current.lastError).toBeUndefined();

    // Trigger execution
    let triggerResult: any;
    await act(async () => {
      triggerResult = await result.current.trigger();
    });

    // Should call startExecution with proper execution object
    expect(mockStartExecution).toHaveBeenCalledTimes(1);
    const execution = mockStartExecution.mock.calls[0][0];
    expect(execution).toMatchObject({
      toolId: "generate",
      workflow: "txt2img",
      state: "idle",
      settings: {
        prompt: "A beautiful landscape",
        steps: 20,
        cfgScale: 7,
      },
    });
    expect(execution.id).toBeDefined();

    // Should return success result
    expect(triggerResult).toEqual({
      ok: true,
      executionId: "exec-123",
      jobId: "job-456",
    });

    // State should reflect completion
    await waitFor(() => {
      expect(result.current.isTriggering).toBe(false);
    });
    expect(result.current.lastError).toBeUndefined();
  });

  it("should handle execution failure", async () => {
    const toolId = "generate";

    // Mock failed execution start
    mockStartExecution.mockResolvedValue({
      ok: false,
      error: "ComfyUI not available",
    });

    const { result } = renderHook(() => useTriggerExecution(toolId));

    // Trigger execution
    let triggerResult: any;
    await act(async () => {
      triggerResult = await result.current.trigger();
    });

    // Should return error result
    expect(triggerResult).toEqual({
      ok: false,
      error: "ComfyUI not available",
    });

    // State should reflect error
    await waitFor(() => {
      expect(result.current.isTriggering).toBe(false);
    });
    expect(result.current.lastError).toBe("ComfyUI not available");
  });

  it("should reject non-workflow tools", async () => {
    const toolId = "select";  // Selection tool, not workflow

    const { result } = renderHook(() => useTriggerExecution(toolId));

    // Trigger execution
    let triggerResult: any;
    await act(async () => {
      triggerResult = await result.current.trigger();
    });

    // Should return error without calling startExecution
    expect(mockStartExecution).not.toHaveBeenCalled();
    expect(triggerResult.ok).toBe(false);
    expect(triggerResult.error).toContain("not a workflow tool");
  });

  it("should handle missing tool", async () => {
    const toolId = "nonexistent";

    const { result } = renderHook(() => useTriggerExecution(toolId));

    // Trigger execution
    let triggerResult: any;
    await act(async () => {
      triggerResult = await result.current.trigger();
    });

    // Should return error without calling startExecution
    expect(mockStartExecution).not.toHaveBeenCalled();
    expect(triggerResult.ok).toBe(false);
    expect(triggerResult.error).toContain("Tool not found");
  });

  it("should collect empty settings when no defaults set", async () => {
    const toolId = "generate";

    // Don't set any settings

    mockStartExecution.mockResolvedValue({
      ok: true,
      executionId: "exec-123",
      jobId: "job-456",
    });

    const { result } = renderHook(() => useTriggerExecution(toolId));

    // Trigger execution
    await act(async () => {
      await result.current.trigger();
    });

    // Should use empty settings
    const execution = mockStartExecution.mock.calls[0][0];
    expect(execution.settings).toEqual({});
  });
});
