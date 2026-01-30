/**
 * Tool Execution Hooks
 *
 * React hooks for triggering workflow executions from tools.
 * Integrates tool system with execution service.
 *
 * Phase 2: Tool Integration
 */

import { useCallback, useState } from "react";
import { useExecutionCommands } from "~/execution/ui";
import { ToolRegistry } from "./Registry";
import { ToolState } from "./State";
import type { WorkflowTool } from "./Types";
import type { WorkflowExecution } from "~/execution/types";

// ============================================================================
// Types
// ============================================================================

export type TriggerExecutionResult =
  | { ok: true; executionId: string; jobId: string }
  | { ok: false; error: string };

export type TriggerExecutionState = {
  isTriggering: boolean;
  lastError?: string;
};

// ============================================================================
// Hook: useTriggerExecution
// ============================================================================

/**
 * Hook to trigger workflow execution for a tool
 *
 * Collects tool settings, creates execution object, and starts execution.
 *
 * Usage:
 * ```tsx
 * const { trigger, isTriggering, lastError } = useTriggerExecution("generate");
 *
 * const handleGenerate = async () => {
 *   const result = await trigger();
 *   if (result.ok) {
 *     toast.success(`Started execution: ${result.executionId}`);
 *   } else {
 *     toast.error(`Failed: ${result.error}`);
 *   }
 * };
 * ```
 */
export function useTriggerExecution(toolId: string) {
  const [state, setState] = useState<TriggerExecutionState>({
    isTriggering: false,
  });

  const { startExecution } = useExecutionCommands();

  const trigger = useCallback(async (): Promise<TriggerExecutionResult> => {
    setState({ isTriggering: true });

    try {
      // 1. Get tool definition
      const tool = await ToolRegistry.get(toolId);
      if (!tool) {
        const error = `Tool not found: ${toolId}`;
        setState({ isTriggering: false, lastError: error });
        return { ok: false, error };
      }

      // 2. Verify tool is a workflow tool
      if (tool.category !== "workflow") {
        const error = `Tool ${toolId} is not a workflow tool (category: ${tool.category})`;
        setState({ isTriggering: false, lastError: error });
        return { ok: false, error };
      }

      const workflowTool = tool as WorkflowTool;

      // 3. Collect current settings from ToolState
      const settings = ToolState.getToolSettings(toolId);

      // 4. Create execution object
      const execution: WorkflowExecution = {
        id: crypto.randomUUID(),
        toolId,
        workflow: workflowTool.workflow,
        state: "idle",
        settings,
      };

      // 5. Start execution via service
      const result = await startExecution(execution);

      if (result.ok) {
        setState({ isTriggering: false });
        return {
          ok: true,
          executionId: result.executionId,
          jobId: result.jobId,
        };
      } else {
        setState({ isTriggering: false, lastError: result.error });
        return { ok: false, error: result.error };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setState({ isTriggering: false, lastError: errorMessage });
      return { ok: false, error: errorMessage };
    }
  }, [toolId, startExecution]);

  return {
    trigger,
    isTriggering: state.isTriggering,
    lastError: state.lastError,
  };
}

// ============================================================================
// Hook: useTriggerWithKeyboard
// ============================================================================

/**
 * Hook to trigger execution with keyboard shortcut
 *
 * Automatically handles keyboard events for workflow tools.
 *
 * Usage:
 * ```tsx
 * useTriggerWithKeyboard("generate", () => {
 *   toast.info("Triggering generation...");
 * });
 * ```
 */
export function useTriggerWithKeyboard(
  toolId: string,
  onTrigger?: () => void
) {
  const { trigger } = useTriggerExecution(toolId);

  // TODO: Wire keyboard shortcuts to trigger
  // This will be implemented in Phase 2 after keyboard shortcut system is reviewed

  return { trigger };
}
