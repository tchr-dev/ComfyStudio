/**
 * Workflow Execution System
 *
 * Production implementation of the frozen workflow execution contract.
 *
 * Related:
 * - Contract: docs/plans/2026-01-29-workflow-execution-contract.md
 * - ADR: docs/adr/ADR-0007-workflow-execution-semantics.md
 * - Plan: docs/plans/2026-01-29-workflow-execution-implementation-plan.md
 *
 * Architecture:
 * - types/: Contract types + shared primitives
 * - state/: Pure FSM + queue policies + revision rules
 * - history/: JSONL writer, replay, prune, artifacts
 * - adapters/comfyui/: Submit, poll/subscribe, cancel, mapping
 * - runner/: Bridge FSM ↔ adapter ↔ history
 * - ui/: Trigger wiring, progress model, disable rules (M4.1 ✅)
 * - service/: Orchestration layer (M4.1 ✅)
 * - spatial/: Capture, normalize, revisions
 * - dev/: Development harness for simulation
 */

export * from "./types";
export * from "./service";
export * from "./ui";
