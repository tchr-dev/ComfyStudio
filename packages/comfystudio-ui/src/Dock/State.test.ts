import { describe, expect, it } from "vitest";
import { DockState } from "~/Dock/State";

describe("DockState", () => {
  it("initializes with default panels", () => {
    const state = DockState.createDefault();
    expect(state.panels.length).toBeGreaterThan(0);
  });

  it("hydrates from localStorage", () => {
    localStorage.setItem(
      "dock-layout.v1",
      JSON.stringify({
        panels: [{ id: "tools", column: "left", order: 0, open: true }],
      })
    );
    const state = DockState.load();
    expect(state.panels[0].id).toBe("tools");
  });
});
