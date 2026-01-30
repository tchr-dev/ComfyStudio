/**
 * Workflow Execution UI Integration
 *
 * React hooks for observing execution state and dispatching commands.
 * Strict observation boundary: UI reads state, dispatches commands.
 *
 * Milestone: M4.1 - Runner ↔ UI Wiring
 */

export {
  setExecutionService,
  useExecutionState,
  useExecutionCommands,
  useExecutionEvents,
  useExecutionsForTool,
  useExecution,
  useActiveExecutions,
  useExecutionStatus,
  useRehydrateOnMount,
} from "./hooks";
