/**
 * Development Harness for Workflow Execution
 *
 * Simulates basic state transitions in-memory (no UI, no ComfyUI, no file I/O).
 * Useful for rapid iteration and debugging.
 *
 * Usage:
 *   import { simulate } from '~/execution/dev/simulate';
 *   simulate.createExecution('generate', { prompt: 'test' });
 *   simulate.queueExecution(execId);
 *   simulate.completeExecution(execId, result);
 */

export const simulate = {
  // Placeholder for dev harness implementation
};
