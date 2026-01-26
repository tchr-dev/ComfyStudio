import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("~/Generation", () => ({
  Generation: {
    Image: {
      Session: {
        useCurrentInput: () => ({ input: undefined }),
      },
      Size: () => null,
      Count: {
        Slider: () => null,
      },
    },
  },
}));
vi.mock("~/Editor", () => ({
  Editor: {
    Tool: {
      Active: {
        use: () => ["select", () => {}],
      },
    },
  },
}));

vi.mock("./Panels/ToolsPanel", () => ({
  ToolsPanel: () => null,
}));
vi.mock("./Panels/EditorToolPanel", () => ({
  EditorToolPanel: () => null,
}));
vi.mock("./Panels/InputPanel", () => ({
  InputPanel: () => null,
}));
vi.mock("./Panels/PromptPanel", () => ({
  PromptPanel: () => null,
}));
vi.mock("./Panels/AdvancedPanel", () => ({
  AdvancedPanel: () => null,
}));
vi.mock("./Panels/LayersPanel", () => ({
  LayersPanel: () => null,
}));

import { DockLayout } from "./DockLayout";

describe("DockLayout", () => {
  it("renders the tools panel", () => {
    const { getByText } = render(<DockLayout />);
    expect(getByText("Tools")).toBeTruthy();
  });
});
