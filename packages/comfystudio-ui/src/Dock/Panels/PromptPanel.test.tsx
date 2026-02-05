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
vi.mock("~/Editor", () => ({
  Editor: {
    Tool: {
      Active: {
        use: () => ["generate", () => {}],
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
