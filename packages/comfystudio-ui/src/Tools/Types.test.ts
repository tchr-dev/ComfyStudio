import { describe, it, expect } from "vitest";
import type {
  ToolDefinition,
  CanvasInteractionTool,
  WorkflowTool,
  SelectionTool,
  ToolSetting,
} from "./Types";

describe("Tool Types", () => {
  it("should define canvas interaction tool correctly", () => {
    const tool: CanvasInteractionTool = {
      id: "brush",
      name: "Brush",
      description: "Paint on canvas",
      icon: "Brush",
      category: "canvas-interaction",
      cursor: "crosshair",
    };
    expect(tool.category).toBe("canvas-interaction");
  });

  it("should define workflow tool correctly", () => {
    const tool: WorkflowTool = {
      id: "generate",
      name: "Generate",
      description: "Generate images",
      icon: "Sparkles",
      category: "workflow",
      workflow: "txt2img",
    };
    expect(tool.category).toBe("workflow");
  });

  it("should define selection tool correctly", () => {
    const tool: SelectionTool = {
      id: "select",
      name: "Select",
      description: "Select objects",
      icon: "Pointer",
      category: "selection",
      multiSelect: true,
    };
    expect(tool.category).toBe("selection");
  });

  it("should support discriminated union", () => {
    const tools: ToolDefinition[] = [
      {
        id: "brush",
        name: "Brush",
        description: "Paint",
        icon: "Brush",
        category: "canvas-interaction",
        cursor: "crosshair",
      },
      {
        id: "generate",
        name: "Generate",
        description: "Generate",
        icon: "Sparkles",
        category: "workflow",
        workflow: "txt2img",
      },
    ];

    expect(tools[0].category).toBe("canvas-interaction");
    expect(tools[1].category).toBe("workflow");
  });

  it("should define all setting types", () => {
    const settings: ToolSetting[] = [
      {
        type: "slider",
        id: "size",
        label: "Size",
        default: 50,
        min: 1,
        max: 100,
      },
      {
        type: "text",
        id: "name",
        label: "Name",
        default: "",
      },
      {
        type: "textarea",
        id: "prompt",
        label: "Prompt",
        default: "",
      },
      {
        type: "dropdown",
        id: "sampler",
        label: "Sampler",
        options: [
          { value: "euler", label: "Euler" },
          { value: "dpm", label: "DPM" },
        ],
        default: "euler",
      },
      {
        type: "checkbox",
        id: "enabled",
        label: "Enabled",
        default: true,
      },
    ];

    expect(settings).toHaveLength(5);
  });
});
