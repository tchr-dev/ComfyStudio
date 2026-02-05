/**
 * Workflow Execution UI Integration
 *
 * React hooks for observing execution state and dispatching commands.
 * Strict observation boundary: UI reads state, dispatches commands.
 *
 * Milestones:
 * - M4.1: Runner ↔ UI Wiring (service + hooks)
 * - M4.3: Execution Visualization (overlays + visual state)
 * - M4.4: Progress Indicators (deterministic progress)
 */

// Provider (Phase 1 Integration)
export { ExecutionServiceProvider } from "./ExecutionServiceProvider";

// M4.1: Core hooks and commands
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

// M4.3: Visualization utilities and hooks
export {
  getActiveOverlays,
  getOverlaysForTool,
  getOverlay,
  getStateColor,
  isExecutionInProgress,
  isExecutionTerminal,
  getStateLabel,
  EXECUTION_COLORS,
  type ExecutionOverlay,
  type ExecutionVisualState,
} from "./visualization";

export {
  useExecutionOverlays,
  useToolOverlays,
  useExecutionOverlay,
  useActiveExecutionCount,
  useHasActiveExecutions,
  useSpatialOverlays,
} from "./visualization-hooks";

// M4.4: Progress utilities and hooks
export {
  getActiveProgress,
  getProgress,
  getToolProgress,
  aggregateProgress,
  formatProgress,
  formatElapsedTime,
  formatPhase,
  getProgressColor,
  type ExecutionProgress,
  type ProgressPhase,
} from "./progress";

export {
  useActiveProgress,
  useExecutionProgress,
  useToolProgress,
  useAggregatedProgress,
  useOverallProgress,
  useIsExecuting,
  useActiveJobCount,
} from "./progress-hooks";
