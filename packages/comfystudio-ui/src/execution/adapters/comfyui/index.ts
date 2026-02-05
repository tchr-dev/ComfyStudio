/**
 * ComfyUI Adapter
 *
 * Pure mapping layer: WorkflowExecution → ComfyUIPromptPayload.
 * Deterministic, no I/O, no side effects.
 *
 * Milestone: M3.2 - Adapter Implementation
 */

export { createComfyUIAdapter, PureComfyUIAdapter } from "./adapter";
export { createHasher, stableStringify, hashUtf8 } from "./hasher";
export type {
  ComfyUIPromptAdapter,
  AdapterContext,
  BuildPromptResult,
  ComfyUIBuildResult,
  ComfyUIPromptPayload,
  ExecutionError,
  ExecutionErrorCode,
  WorkflowTemplate,
  WorkflowTemplateRegistry,
  HasherPort,
} from "./types";
