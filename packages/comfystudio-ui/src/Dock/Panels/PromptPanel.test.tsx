import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("~/Generation", () => ({
  Generation: {
    Image: {
      Prompt: {
        Sidebar: {
          Section: () => null,
        },
      },
    },
  },
}));

describe("PromptPanel", () => {
  it("returns a React element", async () => {
    const { PromptPanel } = await import("./PromptPanel");
    const element = PromptPanel({ inputId: "test" });
    expect(React.isValidElement(element)).toBe(true);
  });
});
