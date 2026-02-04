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

  it("displays loading state when no tools are loaded", async () => {
    vi.mocked(ToolRegistry.list).mockResolvedValue([]);

    render(<ToolsPanel />);
    expect(
      await screen.findByText("No tools available yet.")
    ).toBeInTheDocument();
  });

  it("renders all 5 tools with names", async () => {
    vi.mocked(ToolRegistry.list).mockResolvedValue(mockTools);

    const { container } = render(<ToolsPanel />);

    await waitFor(() => {
      // Tool names are now in title attributes (tooltips)
      expect(container.querySelector('[title*="Select"]')).toBeInTheDocument();
      expect(container.querySelector('[title*="Eraser"]')).toBeInTheDocument();
      expect(container.querySelector('[title*="Generate"]')).toBeInTheDocument();
      expect(container.querySelector('[title*="Remove Background"]')).toBeInTheDocument();
      expect(container.querySelector('[title*="Replace Background"]')).toBeInTheDocument();
    });
  });

  it("includes tool names in tooltips", async () => {
    vi.mocked(ToolRegistry.list).mockResolvedValue(mockTools);

    const { container } = render(<ToolsPanel />);

    await waitFor(() => {
      // Tool names and shortcuts are in title attributes (tooltips)
      const selectTool = container.querySelector('[title*="Select"]');
      const brushTool = container.querySelector('[title*="Eraser"]');

      expect(selectTool).toBeInTheDocument();
      expect(brushTool).toBeInTheDocument();
      expect(selectTool?.getAttribute("title")).toContain("v");
      expect(brushTool?.getAttribute("title")).toContain("e");
    });
  });

  it("displays shortcuts when present", async () => {
    vi.mocked(ToolRegistry.list).mockResolvedValue(mockTools);

    const { container } = render(<ToolsPanel />);

    await waitFor(() => {
      // Shortcuts are displayed as tiny overlays and in title attributes
      expect(screen.getByText("v")).toBeInTheDocument(); // Select shortcut
      expect(screen.getByText("e")).toBeInTheDocument(); // Brush shortcut
      expect(screen.getByText("g")).toBeInTheDocument(); // Generate shortcut
      expect(screen.getByText("r")).toBeInTheDocument(); // Replace bg shortcut
    });
  });

  it("activates tool when clicked", async () => {
    vi.mocked(ToolRegistry.list).mockResolvedValue(mockTools);

    const { container } = render(<ToolsPanel />);

    await waitFor(() => {
      expect(container.querySelector('[title*="Generate"]')).toBeInTheDocument();
    });

    const generateTool = container.querySelector('[title*="Generate"]');
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
      expect(container.querySelector('[title*="Select"]')).toBeInTheDocument();
    });

    // Find the Select tool container
    const selectToolContainer = container.querySelector(
      '[title*="Select"]'
    ) as HTMLElement;
    expect(selectToolContainer).toBeTruthy();

    // Active tool should have brand color styling
    expect(selectToolContainer.className).toMatch(/border-brand-500/);
    expect(selectToolContainer.className).toMatch(/bg-brand-500/);
  });

  it("shows different styling for inactive tools", async () => {
    vi.mocked(ToolRegistry.list).mockResolvedValue(mockTools);

    const { container } = render(<ToolsPanel />);

    await waitFor(() => {
      expect(container.querySelector('[title*="Generate"]')).toBeInTheDocument();
    });

    const generateTool = container.querySelector('[title*="Generate"]') as HTMLElement;
    expect(generateTool).toBeTruthy();

    if (generateTool) {
      // Inactive tool should have different styling (transparent border, not brand)
      expect(generateTool.className).not.toMatch(/border-brand-500/);
      expect(generateTool.className).toMatch(/border-transparent/);
    }
  });

  it("makes tool items look clickable", async () => {
    vi.mocked(ToolRegistry.list).mockResolvedValue(mockTools);

    const { container } = render(<ToolsPanel />);

    await waitFor(() => {
      expect(container.querySelector('[title*="Select"]')).toBeInTheDocument();
    });

    // Find all clickable tool items
    const toolItems = container.querySelectorAll(".cursor-pointer");
    expect(toolItems.length).toBe(mockTools.length);

    // Each should have cursor-pointer class
    toolItems.forEach((item) => {
      expect(item.className).toMatch(/cursor-pointer/);
    });
  });

  it("renders icons for all tools", async () => {
    vi.mocked(ToolRegistry.list).mockResolvedValue(mockTools);

    const { container } = render(<ToolsPanel />);

    await waitFor(() => {
      expect(container.querySelector('[title*="Select"]')).toBeInTheDocument();
    });

    // Check that SVG icons are rendered (lucide icons render as SVGs)
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(mockTools.length);
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

    const { container } = render(<ToolsPanel />);

    await waitFor(() => {
      expect(container.querySelector('[title*="No Shortcut Tool"]')).toBeInTheDocument();
    });

    // Tool should render without error even without shortcut
    const toolElement = container.querySelector('[title*="No Shortcut Tool"]');
    expect(toolElement).toBeInTheDocument();

    // Title should only have the tool name, no shortcut in parentheses
    expect(toolElement?.getAttribute("title")).toBe("No Shortcut Tool ");
  });
});
