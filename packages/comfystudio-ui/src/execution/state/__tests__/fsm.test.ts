/**
 * FSM Tests - State Machine Transitions
 *
 * Tests all valid transitions, forbidden transitions, and terminal immutability.
 */

import { describe, it, expect } from "vitest";
import * as fsm from "../fsm";
import type { WorkflowExecutionState } from "../../types";

describe("Workflow Execution FSM", () => {
  describe("Valid Transitions", () => {
    it("allows idle → armed", () => {
      expect(fsm.canTransition("idle", "armed")).toBe(true);
    });

    it("allows idle → queued (non-spatial tools skip armed)", () => {
      expect(fsm.canTransition("idle", "queued")).toBe(true);
    });

    it("allows armed → queued", () => {
      expect(fsm.canTransition("armed", "queued")).toBe(true);
    });

    it("allows armed → idle (reset)", () => {
      expect(fsm.canTransition("armed", "idle")).toBe(true);
    });

    it("allows queued → executing", () => {
      expect(fsm.canTransition("queued", "executing")).toBe(true);
    });

    it("allows queued → cancelled", () => {
      expect(fsm.canTransition("queued", "cancelled")).toBe(true);
    });

    it("allows queued → idle (reset)", () => {
      expect(fsm.canTransition("queued", "idle")).toBe(true);
    });

    it("allows executing → completed", () => {
      expect(fsm.canTransition("executing", "completed")).toBe(true);
    });

    it("allows executing → failed", () => {
      expect(fsm.canTransition("executing", "failed")).toBe(true);
    });

    it("allows executing → cancelled", () => {
      expect(fsm.canTransition("executing", "cancelled")).toBe(true);
    });

    it("allows completed → idle (dismiss)", () => {
      expect(fsm.canTransition("completed", "idle")).toBe(true);
    });

    it("allows failed → idle (dismiss)", () => {
      expect(fsm.canTransition("failed", "idle")).toBe(true);
    });

    it("allows cancelled → idle (dismiss)", () => {
      expect(fsm.canTransition("cancelled", "idle")).toBe(true);
    });
  });

  describe("Forbidden Transitions", () => {
    it("forbids idle → executing (must go through queued)", () => {
      expect(fsm.canTransition("idle", "executing")).toBe(false);
    });

    it("forbids idle → completed", () => {
      expect(fsm.canTransition("idle", "completed")).toBe(false);
    });

    it("forbids armed → executing (must go through queued)", () => {
      expect(fsm.canTransition("armed", "executing")).toBe(false);
    });

    it("forbids queued → completed (must execute first)", () => {
      expect(fsm.canTransition("queued", "completed")).toBe(false);
    });

    it("forbids executing → idle (must reach terminal first)", () => {
      expect(fsm.canTransition("executing", "idle")).toBe(false);
    });

    it("forbids executing → queued (no backward transitions)", () => {
      expect(fsm.canTransition("executing", "queued")).toBe(false);
    });

    it("forbids completed → executing (terminal is immutable)", () => {
      expect(fsm.canTransition("completed", "executing")).toBe(false);
    });

    it("forbids completed → failed (terminal is immutable)", () => {
      expect(fsm.canTransition("completed", "failed")).toBe(false);
    });

    it("forbids failed → completed (terminal is immutable)", () => {
      expect(fsm.canTransition("failed", "completed")).toBe(false);
    });

    it("forbids cancelled → executing (terminal is immutable)", () => {
      expect(fsm.canTransition("cancelled", "executing")).toBe(false);
    });
  });

  describe("Terminal State Checks", () => {
    it("identifies completed as terminal", () => {
      expect(fsm.isTerminal("completed")).toBe(true);
    });

    it("identifies failed as terminal", () => {
      expect(fsm.isTerminal("failed")).toBe(true);
    });

    it("identifies cancelled as terminal", () => {
      expect(fsm.isTerminal("cancelled")).toBe(true);
    });

    it("identifies idle as non-terminal", () => {
      expect(fsm.isTerminal("idle")).toBe(false);
    });

    it("identifies armed as non-terminal", () => {
      expect(fsm.isTerminal("armed")).toBe(false);
    });

    it("identifies queued as non-terminal", () => {
      expect(fsm.isTerminal("queued")).toBe(false);
    });

    it("identifies executing as non-terminal", () => {
      expect(fsm.isTerminal("executing")).toBe(false);
    });
  });

  describe("Active State Checks", () => {
    it("identifies queued as active", () => {
      expect(fsm.isActive("queued")).toBe(true);
    });

    it("identifies executing as active", () => {
      expect(fsm.isActive("executing")).toBe(true);
    });

    it("identifies idle as inactive", () => {
      expect(fsm.isActive("idle")).toBe(false);
    });

    it("identifies terminal states as inactive", () => {
      expect(fsm.isActive("completed")).toBe(false);
      expect(fsm.isActive("failed")).toBe(false);
      expect(fsm.isActive("cancelled")).toBe(false);
    });
  });

  describe("Assert Transition", () => {
    it("does not throw for valid transition", () => {
      expect(() => fsm.assertTransition("idle", "armed")).not.toThrow();
    });

    it("throws for invalid transition", () => {
      expect(() => fsm.assertTransition("idle", "executing")).toThrow(
        /Invalid transition.*idle.*executing/
      );
    });

    it("includes context in error message", () => {
      expect(() =>
        fsm.assertTransition("idle", "executing", "test operation")
      ).toThrow(/test operation/);
    });
  });

  describe("Next States", () => {
    it("returns correct next states for idle", () => {
      expect(fsm.nextStates("idle")).toEqual(["armed", "queued"]);
    });

    it("returns correct next states for armed", () => {
      expect(fsm.nextStates("armed")).toEqual(["queued", "idle"]);
    });

    it("returns correct next states for queued", () => {
      expect(fsm.nextStates("queued")).toEqual([
        "executing",
        "cancelled",
        "idle",
      ]);
    });

    it("returns correct next states for executing", () => {
      expect(fsm.nextStates("executing")).toEqual([
        "completed",
        "failed",
        "cancelled",
      ]);
    });

    it("returns only idle for terminal states", () => {
      expect(fsm.nextStates("completed")).toEqual(["idle"]);
      expect(fsm.nextStates("failed")).toEqual(["idle"]);
      expect(fsm.nextStates("cancelled")).toEqual(["idle"]);
    });
  });

  describe("Complete Transition Coverage", () => {
    // Ensure every state has defined transitions
    const allStates: WorkflowExecutionState[] = [
      "idle",
      "armed",
      "queued",
      "executing",
      "completed",
      "failed",
      "cancelled",
    ];

    it("has transitions defined for all states", () => {
      for (const state of allStates) {
        expect(fsm.VALID_TRANSITIONS[state]).toBeDefined();
        expect(fsm.VALID_TRANSITIONS[state].length).toBeGreaterThan(0);
      }
    });
  });
});
