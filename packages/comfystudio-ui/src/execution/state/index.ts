/**
 * Workflow Execution State Manager
 *
 * Pure FSM + queue policies + revision rules (no I/O).
 * All state transitions are deterministic and testable.
 *
 * Milestone: M1 - Core Logic
 */

// M1.1: FSM Core
export * from "./fsm";
export * from "./guards";
export * from "./ops";

// M1.2: Queue-First + Run Policies
export * from "./queue";
export * from "./policies";

// M1.3: Revision Rules + Stale Prevention
export * from "./revisions";
