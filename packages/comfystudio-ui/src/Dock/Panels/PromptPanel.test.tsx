import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { PromptPanel } from "./PromptPanel";

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
        use: () => ["generate", () => { }],
      },
    },
  },
}));

describe("PromptPanel", () => {
  it("renders without crashing", () => {
    const { container } = render(<PromptPanel inputId="test" />);
    expect(container).toBeTruthy();
  });
});
