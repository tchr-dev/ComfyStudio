// packages/comfystudio-ui/src/Dock/Panels/ToolsPanel.test.tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToolRegistry } from "~/Tools/Registry";
import { ToolDefinition } from "~/Tools/Types";

import { ToolsPanel } from "./ToolsPanel";

// Mock the ToolRegistry
vi.mock("~/Tools/Registry", () => ({
  ToolRegistry: {
    list: vi.fn(),
  },
}));

// Mock Editor.Tool.Active
const mockActiveTool = { value: "select", set: vi.fn() };
vi.mock("~/Editor", () => ({
  Editor: {
    Tool: {
      Active: {
        use: () => [mockActiveTool.value, mockActiveTool.set] as const,
        useSet: () => mockActiveTool.set,
      },
    },
  },
}));

describe("ToolsPanel", () => {
  const mockTools: ToolDefinition[] = [
    {
      id: "select",
      name: "Select",
      description: "Select and manipulate canvas entities",
      icon: "Select",
      shortcut: "v",
      category: "selection",
      multiSelect: true,
    },
    {
      id: "brush",
      name: "Eraser",
      description: "Remove pixels from images by painting over them",
      icon: "Eraser",
      shortcut: "e",
      category: "canvas-interaction",
      cursor: "custom",
      cursorComponent: "BrushCursor",
    },
    {
      id: "generate",
      name: "Generate",
      description: "Generate images from text prompts",
      icon: "Wand",
      shortcut: "g",
      category: "workflow",
      workflow: "txt2img",
    },
    {
      id: "remove-background",
      name: "Remove Background",
      description: "Automatically remove background from images",
      icon: "Eraser",
      category: "workflow",
      workflow: "remove-background",
    },
    {
      id: "replace-background",
      name: "Replace Background",
      description: "Replace image background with generated content",
      icon: "ImagePlus",
      shortcut: "r",
      category: "workflow",
      workflow: "replace-background",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveTool.value = "select";
  });

  it("displays loading state when no tools are loaded", () => {
    vi.mocked(ToolRegistry.list).mockResolvedValue([]);

    render(<ToolsPanel />);
    expect(screen.getByText("No tools available yet.")).toBeInTheDocument();
  });

  it("renders all 5 tools with names", async () => {
    vi.mocked(ToolRegistry.list).mockResolvedValue(mockTools);

    render(<ToolsPanel />);

    await waitFor(() => {
      expect(screen.getByText("Select")).toBeInTheDocument();
      expect(screen.getByText("Eraser")).toBeInTheDocument();
      expect(screen.getByText("Generate")).toBeInTheDocument();
      expect(screen.getByText("Remove Background")).toBeInTheDocument();
      expect(screen.getByText("Replace Background")).toBeInTheDocument();
    });
  });

  it("renders tool descriptions", async () => {
    vi.mocked(ToolRegistry.list).mockResolvedValue(mockTools);

    render(<ToolsPanel />);

    await waitFor(() => {
      expect(
        screen.getByText("Select and manipulate canvas entities")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Remove pixels from images by painting over them")
      ).toBeInTheDocument();
    });
  });

  it("displays shortcuts when present", async () => {
    vi.mocked(ToolRegistry.list).mockResolvedValue(mockTools);

    render(<ToolsPanel />);

    await waitFor(() => {
      expect(screen.getByText("v")).toBeInTheDocument(); // Select shortcut
      expect(screen.getByText("e")).toBeInTheDocument(); // Brush shortcut
      expect(screen.getByText("g")).toBeInTheDocument(); // Generate shortcut
      expect(screen.getByText("r")).toBeInTheDocument(); // Replace bg shortcut
    });
  });

  it("activates tool when clicked", async () => {
    vi.mocked(ToolRegistry.list).mockResolvedValue(mockTools);

    render(<ToolsPanel />);

    await waitFor(() => {
      expect(screen.getByText("Generate")).toBeInTheDocument();
    });

    const generateTool = screen.getByText("Generate").closest("div");
    expect(generateTool).toBeTruthy();

    if (generateTool) {
      fireEvent.click(generateTool);
      expect(mockActiveTool.set).toHaveBeenCalledWith("generate");
    }
  });

  it("highlights active tool visually", async () => {
    vi.mocked(ToolRegistry.list).mockResolvedValue(mockTools);

    const { container } = render(<ToolsPanel />);

    await waitFor(() => {
      expect(screen.getByText("Select")).toBeInTheDocument();
    });

    // Find the clickable container div with cursor-pointer
    const selectToolContainer = container.querySelector(
      ".cursor-pointer"
    ) as HTMLElement;
    expect(selectToolContainer).toBeTruthy();

    // Active tool should have brand color styling
    expect(selectToolContainer.className).toMatch(/border-brand-500/);
    expect(selectToolContainer.className).toMatch(/bg-brand-500/);
  });

  it("shows different styling for inactive tools", async () => {
    vi.mocked(ToolRegistry.list).mockResolvedValue(mockTools);

    render(<ToolsPanel />);

    await waitFor(() => {
      expect(screen.getByText("Generate")).toBeInTheDocument();
    });

    const generateTool = screen.getByText("Generate").closest("div");
    expect(generateTool).toBeTruthy();

    if (generateTool) {
      // Inactive tool should have different styling
      expect(generateTool.className).not.toMatch(/border-brand-500/);
    }
  });

  it("makes tool items look clickable", async () => {
    vi.mocked(ToolRegistry.list).mockResolvedValue(mockTools);

    const { container } = render(<ToolsPanel />);

    await waitFor(() => {
      expect(screen.getByText("Select")).toBeInTheDocument();
    });

    // Find all clickable tool items
    const toolItems = container.querySelectorAll(".cursor-pointer");
    expect(toolItems.length).toBeGreaterThan(0);

    // Each should have cursor-pointer class
    toolItems.forEach((item) => {
      expect(item.className).toMatch(/cursor-pointer/);
    });
  });

  it("renders icons for all tools", async () => {
    vi.mocked(ToolRegistry.list).mockResolvedValue(mockTools);

    const { container } = render(<ToolsPanel />);

    await waitFor(() => {
      expect(screen.getByText("Select")).toBeInTheDocument();
    });

    // Check that SVG icons are rendered (lucide icons render as SVGs)
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });

  it("handles tools without shortcuts gracefully", async () => {
    const toolsWithoutShortcuts: ToolDefinition[] = [
      {
        id: "tool-without-shortcut",
        name: "No Shortcut Tool",
        description: "A tool without a shortcut",
        icon: "Wrench",
        category: "workflow",
        workflow: "test",
      },
    ];

    vi.mocked(ToolRegistry.list).mockResolvedValue(toolsWithoutShortcuts);

    render(<ToolsPanel />);

    await waitFor(() => {
      expect(screen.getByText("No Shortcut Tool")).toBeInTheDocument();
    });

    // Tool should render without error even without shortcut
    expect(screen.getByText("A tool without a shortcut")).toBeInTheDocument();
  });
});
