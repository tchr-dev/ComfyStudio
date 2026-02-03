// packages/comfystudio-ui/src/Editor/Tool/Sidebar.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToolRegistry } from "~/Tools/Registry";
import type { CanvasInteractionTool, ToolImplementation } from "~/Tools/Types";

import { Sidebar } from "./Sidebar";

// Mock the Editor.Tool.Active hook
const mockActiveTool = vi.fn(() => ["brush", vi.fn()]);
vi.mock("~/Editor", () => ({
  Editor: {
    Tool: {
      Active: {
        use: () => mockActiveTool(),
      },
    },
  },
}));

// Mock ToolRegistry
vi.mock("~/Tools/Registry", () => ({
  ToolRegistry: {
    get: vi.fn(),
    getImplementation: vi.fn(),
  },
}));

// Mock SettingRenderer
vi.mock("~/Tools/SettingRenderer", () => ({
  SettingRenderer: ({ setting, toolId }: any) => (
    <div data-testid={`setting-${toolId}-${setting.id}`}>
      {setting.label}
    </div>
  ),
}));

// Mock App.Sidebar.Section
vi.mock("~/App", () => ({
  App: {
    Sidebar: {
      Section: ({ title, children }: any) => (
        <div data-testid="sidebar-section">
          {title && <div data-testid="section-title">{title}</div>}
          {children}
        </div>
      ),
    },
  },
}));

describe("Editor.Tool.Sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveTool.mockReturnValue(["brush", vi.fn()]);
  });

  describe("Tool with settings array", () => {
    it("renders tool settings when tool has settings", async () => {
      const brushTool: CanvasInteractionTool = {
        id: "brush",
        name: "Eraser",
        description: "Remove pixels",
        icon: "Eraser",
        category: "canvas-interaction",
        cursor: "custom",
        settings: [
          {
            id: "size",
            type: "slider",
            label: "Size",
            min: 1,
            max: 100,
            default: 20,
          },
          {
            id: "blur",
            type: "slider",
            label: "Blur",
            min: 0,
            max: 50,
            default: 0,
          },
        ],
      };

      vi.mocked(ToolRegistry.get).mockResolvedValue(brushTool);
      vi.mocked(ToolRegistry.getImplementation).mockRejectedValue(
        new Error("No implementation")
      );

      render(<Sidebar.Section />);

      await waitFor(() => {
        expect(screen.getByTestId("sidebar-section")).toBeInTheDocument();
      });

      expect(screen.getByTestId("section-title")).toHaveTextContent(
        "Eraser settings"
      );
      expect(screen.getByTestId("setting-brush-size")).toBeInTheDocument();
      expect(screen.getByTestId("setting-brush-blur")).toBeInTheDocument();
    });

    it("calls ToolRegistry.get with active tool id", async () => {
      mockActiveTool.mockReturnValue(["select", vi.fn()]);

      const selectTool: CanvasInteractionTool = {
        id: "select",
        name: "Select",
        description: "Select area",
        icon: "Select",
        category: "canvas-interaction",
        cursor: "default",
        settings: [],
      };

      vi.mocked(ToolRegistry.get).mockResolvedValue(selectTool);
      vi.mocked(ToolRegistry.getImplementation).mockRejectedValue(
        new Error("No implementation")
      );

      render(<Sidebar.Section />);

      await waitFor(() => {
        expect(ToolRegistry.get).toHaveBeenCalledWith("select");
      });
    });

    it("renders all settings in order", async () => {
      const toolWithSettings: CanvasInteractionTool = {
        id: "brush",
        name: "Brush",
        description: "Paint tool",
        icon: "Brush",
        category: "canvas-interaction",
        cursor: "custom",
        settings: [
          {
            id: "size",
            type: "slider",
            label: "Size",
            min: 1,
            max: 100,
            default: 20,
          },
          {
            id: "strength",
            type: "slider",
            label: "Strength",
            min: 0,
            max: 1,
            default: 1,
          },
          {
            id: "blur",
            type: "slider",
            label: "Blur",
            min: 0,
            max: 50,
            default: 0,
          },
        ],
      };

      vi.mocked(ToolRegistry.get).mockResolvedValue(toolWithSettings);
      vi.mocked(ToolRegistry.getImplementation).mockRejectedValue(
        new Error("No implementation")
      );

      render(<Sidebar.Section />);

      await waitFor(() => {
        expect(screen.getByTestId("setting-brush-size")).toBeInTheDocument();
        expect(screen.getByTestId("setting-brush-strength")).toBeInTheDocument();
        expect(screen.getByTestId("setting-brush-blur")).toBeInTheDocument();
      });
    });
  });

  describe("Tool with no settings", () => {
    it("returns null when tool has no settings and no custom panel", async () => {
      const toolWithoutSettings: CanvasInteractionTool = {
        id: "select",
        name: "Select",
        description: "Select area",
        icon: "Select",
        category: "canvas-interaction",
        cursor: "default",
        settings: [],
      };

      vi.mocked(ToolRegistry.get).mockResolvedValue(toolWithoutSettings);
      vi.mocked(ToolRegistry.getImplementation).mockRejectedValue(
        new Error("No implementation")
      );

      const { container } = render(<Sidebar.Section />);

      await waitFor(() => {
        expect(ToolRegistry.get).toHaveBeenCalled();
      });

      expect(container.firstChild).toBeNull();
    });

    it("returns null when tool has empty settings array", async () => {
      const toolWithEmptySettings: CanvasInteractionTool = {
        id: "hand",
        name: "Hand",
        description: "Pan canvas",
        icon: "Hand",
        category: "canvas-interaction",
        cursor: "default",
        settings: [],
      };

      vi.mocked(ToolRegistry.get).mockResolvedValue(toolWithEmptySettings);
      vi.mocked(ToolRegistry.getImplementation).mockRejectedValue(
        new Error("No implementation")
      );

      const { container } = render(<Sidebar.Section />);

      await waitFor(() => {
        expect(ToolRegistry.get).toHaveBeenCalled();
      });

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Tool with custom SettingsPanel", () => {
    it("renders custom SettingsPanel when implementation provides it", async () => {
      const CustomPanel = () => <div data-testid="custom-panel">Custom UI</div>;

      const toolWithCustomPanel: CanvasInteractionTool = {
        id: "generate",
        name: "Generate",
        description: "Generate images",
        icon: "Generate",
        category: "canvas-interaction",
        cursor: "default",
        settings: [],
      };

      const implementation: ToolImplementation = {
        SettingsPanel: CustomPanel,
      };

      vi.mocked(ToolRegistry.get).mockResolvedValue(toolWithCustomPanel);
      vi.mocked(ToolRegistry.getImplementation).mockResolvedValue(
        implementation
      );

      render(<Sidebar.Section />);

      await waitFor(() => {
        expect(screen.getByTestId("custom-panel")).toBeInTheDocument();
      });

      expect(screen.getByText("Custom UI")).toBeInTheDocument();
    });

    it("prefers custom SettingsPanel over settings array", async () => {
      const CustomPanel = () => (
        <div data-testid="custom-panel">Custom Panel</div>
      );

      const toolWithBoth: CanvasInteractionTool = {
        id: "brush",
        name: "Brush",
        description: "Paint tool",
        icon: "Brush",
        category: "canvas-interaction",
        cursor: "custom",
        settings: [
          {
            id: "size",
            type: "slider",
            label: "Size",
            min: 1,
            max: 100,
            default: 20,
          },
        ],
      };

      const implementation: ToolImplementation = {
        SettingsPanel: CustomPanel,
      };

      vi.mocked(ToolRegistry.get).mockResolvedValue(toolWithBoth);
      vi.mocked(ToolRegistry.getImplementation).mockResolvedValue(
        implementation
      );

      render(<Sidebar.Section />);

      await waitFor(() => {
        expect(screen.getByTestId("custom-panel")).toBeInTheDocument();
      });

      // Should NOT render the settings-based panel
      expect(screen.queryByTestId("sidebar-section")).not.toBeInTheDocument();
    });
  });

  describe("Loading and error states", () => {
    it("renders null while loading tool definition", () => {
      vi.mocked(ToolRegistry.get).mockReturnValue(
        new Promise(() => {}) // Never resolves
      );

      const { container } = render(<Sidebar.Section />);

      expect(container.firstChild).toBeNull();
    });

    it("returns null when tool definition not found", async () => {
      vi.mocked(ToolRegistry.get).mockResolvedValue(null);

      const { container } = render(<Sidebar.Section />);

      await waitFor(() => {
        expect(ToolRegistry.get).toHaveBeenCalled();
      });

      expect(container.firstChild).toBeNull();
    });

    it("falls back to settings array when implementation loading fails", async () => {
      const toolWithSettings: CanvasInteractionTool = {
        id: "brush",
        name: "Brush",
        description: "Paint tool",
        icon: "Brush",
        category: "canvas-interaction",
        cursor: "custom",
        settings: [
          {
            id: "size",
            type: "slider",
            label: "Size",
            min: 1,
            max: 100,
            default: 20,
          },
        ],
      };

      vi.mocked(ToolRegistry.get).mockResolvedValue(toolWithSettings);
      vi.mocked(ToolRegistry.getImplementation).mockRejectedValue(
        new Error("Implementation not found")
      );

      render(<Sidebar.Section />);

      await waitFor(() => {
        expect(screen.getByTestId("sidebar-section")).toBeInTheDocument();
      });

      expect(screen.getByTestId("setting-brush-size")).toBeInTheDocument();
    });
  });

  describe("Tool title formatting", () => {
    it('formats title as "{toolName} settings"', async () => {
      const tool: CanvasInteractionTool = {
        id: "brush",
        name: "Magic Eraser",
        description: "Erase tool",
        icon: "Eraser",
        category: "canvas-interaction",
        cursor: "custom",
        settings: [
          {
            id: "size",
            type: "slider",
            label: "Size",
            min: 1,
            max: 100,
            default: 20,
          },
        ],
      };

      vi.mocked(ToolRegistry.get).mockResolvedValue(tool);
      vi.mocked(ToolRegistry.getImplementation).mockRejectedValue(
        new Error("No implementation")
      );

      render(<Sidebar.Section />);

      await waitFor(() => {
        expect(screen.getByTestId("section-title")).toHaveTextContent(
          "Magic Eraser settings"
        );
      });
    });
  });
});
