import { describe, expect, it } from "vitest";
import { DockState } from "~/Dock/State";

describe("DockState", () => {
  it("initializes with default panels", () => {
    const state = DockState.createDefault();
    expect(state.panels.length).toBeGreaterThan(0);
  });
});
