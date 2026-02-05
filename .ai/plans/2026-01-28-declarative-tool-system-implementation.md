# Declarative Tool System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a TypeScript-based declarative tool system that allows tools to be defined through configuration files with automatic discovery, type-safe settings, and easy extensibility.

**Architecture:** Convention-based tool loading using Vite's glob imports. Tools consist of two files: a definition (metadata + settings schema) and an implementation (behavioral hooks). Three tool categories (canvas-interaction, workflow, selection) use discriminated unions for type safety.

**Tech Stack:** TypeScript, React, Zustand (via GlobalState), Vite glob imports, Vitest

---

## Task 1: Core Type Definitions

**Files:**
- Modify: `packages/comfystudio-ui/src/Tools/Types.ts`
- Test: `packages/comfystudio-ui/src/Tools/Types.test.ts`

**Step 1: Write the failing test**

Create test file to validate type exports:

```typescript
// packages/comfystudio-ui/src/Tools/Types.test.ts
import { describe, expect, it } from "vitest";

import type {
  BaseToolSetting,
  CanvasInteractionTool,
  CheckboxSetting,
  CustomSetting,
  DropdownSetting,
  SelectionTool,
  SliderSetting,
  TextSetting,
  ToolDefinition,
  ToolImplementation,
  ToolSetting,
  WorkflowTool,
} from "./Types";

describe("Tool Types", () => {
  it("exports all required types", () => {
    // Type-only test - if this compiles, types exist
    const _slider: SliderSetting = {
      id: "test",
      label: "Test",
      type: "slider",
      min: 0,
      max: 100,
      default: 50,
    };

    const _brush: CanvasInteractionTool = {
      id: "brush",
      name: "Brush",
      icon: "Brush",
      category: "canvas-interaction",
    };

    expect(true).toBe(true);
  });

  it("enforces discriminated union for tool categories", () => {
    const workflow: WorkflowTool = {
      id: "test",
      name: "Test",
      icon: "Test",
      category: "workflow",
      workflow: "test-workflow",
    };

    expect(workflow.category).toBe("workflow");
    expect((workflow as WorkflowTool).workflow).toBe("test-workflow");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `yarn comfystudio-ui test Types.test.ts`

Expected: FAIL with "Cannot find module './Types' or its type declarations"

**Step 3: Write type definitions**

Update `packages/comfystudio-ui/src/Tools/Types.ts`:

```typescript
import { KonvaEventObject } from "konva/lib/Node";
import React from "react";

// Tool Settings Schema
export type BaseToolSetting = {
  id: string;
  label: string;
  description?: string;
};

export type SliderSetting = BaseToolSetting & {
  type: "slider";
  min: number;
  max: number;
  step?: number;
  default: number;
};

export type TextSetting = BaseToolSetting & {
  type: "text" | "textarea";
  default: string;
  placeholder?: string;
  maxLength?: number;
};

export type DropdownSetting = BaseToolSetting & {
  type: "dropdown";
  options: { value: string; label: string }[];
  default: string;
};

export type CheckboxSetting = BaseToolSetting & {
  type: "checkbox";
  default: boolean;
};

export type CustomSetting = BaseToolSetting & {
  type: "custom";
  component: string;
  props?: Record<string, unknown>;
};

export type ToolSetting =
  | SliderSetting
  | TextSetting
  | DropdownSetting
  | CheckboxSetting
  | CustomSetting;

// Base Tool Definition
export type BaseToolDefinition = {
  id: string;
  name: string;
  description?: string;
  icon: string;
  shortcut?: string;
  category: "canvas-interaction" | "workflow" | "selection";
  settings?: ToolSetting[];
};

// Category-Specific Tool Types
export type CanvasInteractionTool = BaseToolDefinition & {
  category: "canvas-interaction";
  cursor?: "crosshair" | "default" | "custom";
  cursorComponent?: string;
};

export type WorkflowTool = BaseToolDefinition & {
  category: "workflow";
  workflow: string;
  inputMapping?: Record<string, string>;
};

export type SelectionTool = BaseToolDefinition & {
  category: "selection";
  multiSelect?: boolean;
};

export type ToolDefinition =
  | CanvasInteractionTool
  | WorkflowTool
  | SelectionTool;

// Tool Implementation Interface
export type ToolImplementation = {
  onActivate?: () => void;
  onDeactivate?: () => void;
  onMouseDown?: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseMove?: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseUp?: (e: KonvaEventObject<MouseEvent>) => void;
  executeWorkflow?: (settings: Record<string, any>) => Promise<void>;
  SettingsPanel?: React.ComponentType;
};

// Keep existing ToolSummary for backward compatibility
export type ToolSummary = {
  id: string;
  name: string;
  description?: string;
};
```

**Step 4: Run test to verify it passes**

Run: `yarn comfystudio-ui test Types.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/comfystudio-ui/src/Tools/Types.ts packages/comfystudio-ui/src/Tools/Types.test.ts
git commit -m "feat(tools): add comprehensive type definitions for declarative tools

- Add tool setting types (slider, text, dropdown, checkbox, custom)
- Add discriminated union for tool categories
- Add tool implementation interface
- Include tests for type validation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Tool State Management

**Files:**
- Create: `packages/comfystudio-ui/src/Tools/State.ts`
- Create: `packages/comfystudio-ui/src/Tools/State.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/comfystudio-ui/src/Tools/State.test.ts
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ToolState } from "./State";

describe("ToolState", () => {
  it("stores and retrieves tool settings", () => {
    const { result } = renderHook(() =>
      ToolState.useToolSetting("brush", "size")
    );

    expect(result.current[0]).toBeUndefined();

    act(() => {
      result.current[1](50);
    });

    expect(result.current[0]).toBe(50);
  });

  it("isolates settings between different tools", () => {
    const { result: brush } = renderHook(() =>
      ToolState.useToolSetting("brush", "size")
    );
    const { result: select } = renderHook(() =>
      ToolState.useToolSetting("select", "size")
    );

    act(() => {
      brush.current[1](50);
    });

    expect(brush.current[0]).toBe(50);
    expect(select.current[0]).toBeUndefined();
  });

  it("initializes tool settings with defaults", async () => {
    const defaults = { size: 20, blur: 5 };
    await ToolState.initializeDefaults("brush", defaults);

    const { result } = renderHook(() =>
      ToolState.useToolSetting("brush", "size")
    );

    expect(result.current[0]).toBe(20);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `yarn comfystudio-ui test State.test.ts`

Expected: FAIL with "Cannot find module './State'"

**Step 3: Write implementation**

```typescript
// packages/comfystudio-ui/src/Tools/State.ts
import { useCallback } from "react";

import { GlobalState } from "~/GlobalState";

type ToolStateStore = {
  settings: Record<string, Record<string, any>>;
  activeTool: string | null;
};

const store = GlobalState.create<ToolStateStore>(() => ({
  settings: {},
  activeTool: null,
}));

export namespace ToolState {
  export const useToolSetting = (
    toolId: string,
    settingId: string
  ): [any, (value: any) => void] => {
    const value = store((state) => state.settings[toolId]?.[settingId]);

    const setValue = useCallback(
      (newValue: any) => {
        store.setState((state) => ({
          settings: {
            ...state.settings,
            [toolId]: {
              ...state.settings[toolId],
              [settingId]: newValue,
            },
          },
        }));
      },
      [toolId, settingId]
    );

    return [value, setValue];
  };

  export const useActiveTool = (): [
    string | null,
    (tool: string | null) => void
  ] => {
    const activeTool = store((state) => state.activeTool);
    const setActiveTool = useCallback((tool: string | null) => {
      store.setState({ activeTool: tool });
    }, []);

    return [activeTool, setActiveTool];
  };

  export const initializeDefaults = async (
    toolId: string,
    defaults: Record<string, any>
  ): Promise<void> => {
    store.setState((state) => {
      const existingSettings = state.settings[toolId] || {};
      const mergedSettings = { ...defaults, ...existingSettings };

      return {
        settings: {
          ...state.settings,
          [toolId]: mergedSettings,
        },
      };
    });
  };

  export const getToolSettings = (toolId: string): Record<string, any> => {
    return store.getState().settings[toolId] || {};
  };
}
```

**Step 4: Run test to verify it passes**

Run: `yarn comfystudio-ui test State.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/comfystudio-ui/src/Tools/State.ts packages/comfystudio-ui/src/Tools/State.test.ts
git commit -m "feat(tools): add tool state management with Zustand

- Store tool settings per tool ID and setting ID
- Support default value initialization
- Isolate settings between different tools
- Add active tool tracking

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Tool Registry with Definition Loading

**Files:**
- Modify: `packages/comfystudio-ui/src/Tools/Registry.ts`
- Modify: `packages/comfystudio-ui/src/Tools/Registry.test.ts`
- Create: `packages/comfystudio-ui/src/Tools/definitions/` (directory)
- Create: `packages/comfystudio-ui/src/Tools/implementations/` (directory)

**Step 1: Write the failing test**

Update test file:

```typescript
// packages/comfystudio-ui/src/Tools/Registry.test.ts
import { describe, expect, it } from "vitest";

import { ToolRegistry } from "./Registry";

describe("ToolRegistry", () => {
  it("loads tool definitions from definitions folder", async () => {
    const tools = await ToolRegistry.list();
    expect(Array.isArray(tools)).toBe(true);
  });

  it("gets a specific tool by ID", async () => {
    // Will test with actual tool once we create definitions
    const tool = await ToolRegistry.get("nonexistent");
    expect(tool).toBeNull();
  });

  it("loads tool implementation by ID", async () => {
    // This will fail until we create implementations
    try {
      await ToolRegistry.getImplementation("nonexistent");
      expect(true).toBe(false); // Should not reach here
    } catch (e) {
      expect(e).toBeDefined();
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `yarn comfystudio-ui test Registry.test.ts`

Expected: FAIL (test structure exists but implementation missing)

**Step 3: Implement Registry**

```typescript
// packages/comfystudio-ui/src/Tools/Registry.ts
import { ToolDefinition, ToolImplementation, ToolSummary } from "./Types";

// Internal: Load all tool definitions
const loadDefinitions = async (): Promise<ToolDefinition[]> => {
  const definitionModules = import.meta.glob<{
    default: ToolDefinition;
  }>("./definitions/*.ts", { eager: false });

  const definitions: ToolDefinition[] = [];

  for (const path in definitionModules) {
    try {
      const module = await definitionModules[path]();
      if (module.default) {
        definitions.push(module.default);
      }
    } catch (error) {
      console.error(`Failed to load tool definition from ${path}:`, error);
    }
  }

  return definitions;
};

export namespace ToolRegistry {
  // Load all tool definitions
  export const list = async (): Promise<ToolDefinition[]> => {
    return await loadDefinitions();
  };

  // Get specific tool by ID
  export const get = async (id: string): Promise<ToolDefinition | null> => {
    const tools = await list();
    return tools.find((tool) => tool.id === id) || null;
  };

  // Load tool implementation by ID (convention-based)
  export const getImplementation = async (
    id: string
  ): Promise<ToolImplementation> => {
    try {
      const module = await import(`./implementations/${id}.ts`);
      return module.default || module;
    } catch (error) {
      throw new Error(
        `Failed to load implementation for tool "${id}": ${error}`
      );
    }
  };

  // Convert to ToolSummary for backward compatibility
  export const listSummaries = async (): Promise<ToolSummary[]> => {
    const tools = await list();
    return tools.map((tool) => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
    }));
  };
}
```

**Step 4: Create directory structure**

```bash
mkdir -p packages/comfystudio-ui/src/Tools/definitions
mkdir -p packages/comfystudio-ui/src/Tools/implementations
touch packages/comfystudio-ui/src/Tools/definitions/.gitkeep
touch packages/comfystudio-ui/src/Tools/implementations/.gitkeep
```

**Step 5: Run test to verify it passes**

Run: `yarn comfystudio-ui test Registry.test.ts`

Expected: PASS (empty arrays for now)

**Step 6: Commit**

```bash
git add packages/comfystudio-ui/src/Tools/Registry.ts packages/comfystudio-ui/src/Tools/Registry.test.ts packages/comfystudio-ui/src/Tools/definitions packages/comfystudio-ui/src/Tools/implementations
git commit -m "feat(tools): implement tool registry with convention-based loading

- Use Vite glob imports for automatic discovery
- Support get by ID and list all tools
- Load implementations by convention (id matches filename)
- Create definitions/ and implementations/ directories

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Brush Tool Definition

**Files:**
- Create: `packages/comfystudio-ui/src/Tools/definitions/brush.ts`
- Update: `packages/comfystudio-ui/src/Tools/Registry.test.ts`

**Step 1: Write the failing test**

Update Registry test to check for brush tool:

```typescript
// Add to packages/comfystudio-ui/src/Tools/Registry.test.ts
it("loads brush tool definition", async () => {
  const tools = await ToolRegistry.list();
  const brush = tools.find((t) => t.id === "brush");

  expect(brush).toBeDefined();
  expect(brush?.name).toBe("Eraser");
  expect(brush?.category).toBe("canvas-interaction");
  expect(brush?.settings).toHaveLength(3);
});

it("retrieves brush tool by ID", async () => {
  const brush = await ToolRegistry.get("brush");

  expect(brush).not.toBeNull();
  expect(brush?.id).toBe("brush");
  expect(brush?.shortcut).toBe("e");
});
```

**Step 2: Run test to verify it fails**

Run: `yarn comfystudio-ui test Registry.test.ts`

Expected: FAIL with brush tool not found

**Step 3: Create brush tool definition**

```typescript
// packages/comfystudio-ui/src/Tools/definitions/brush.ts
import { CanvasInteractionTool } from "../Types";

const brushTool: CanvasInteractionTool = {
  id: "brush",
  name: "Eraser",
  description: "Remove pixels from images by painting over them",
  icon: "Eraser",
  shortcut: "e",
  category: "canvas-interaction",
  cursor: "custom",
  cursorComponent: "BrushCursor",
  settings: [
    {
      id: "size",
      type: "slider",
      label: "Size",
      description: "Brush size in pixels",
      min: 1,
      max: 100,
      step: 1,
      default: 20,
    },
    {
      id: "strength",
      type: "slider",
      label: "Strength",
      description: "Opacity of the eraser stroke",
      min: 0,
      max: 1,
      step: 0.01,
      default: 1,
    },
    {
      id: "blur",
      type: "slider",
      label: "Blur",
      description: "Blur/feather amount for soft edges",
      min: 0,
      max: 50,
      step: 1,
      default: 0,
    },
  ],
};

export default brushTool;
```

**Step 4: Run test to verify it passes**

Run: `yarn comfystudio-ui test Registry.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/comfystudio-ui/src/Tools/definitions/brush.ts packages/comfystudio-ui/src/Tools/Registry.test.ts
git commit -m "feat(tools): add brush tool definition

- Define brush/eraser as canvas-interaction tool
- Include size, strength, and blur settings
- Set 'e' as keyboard shortcut

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Select Tool Definition

**Files:**
- Create: `packages/comfystudio-ui/src/Tools/definitions/select.ts`

**Step 1: Write the failing test**

```typescript
// Add to packages/comfystudio-ui/src/Tools/Registry.test.ts
it("loads select tool definition", async () => {
  const tools = await ToolRegistry.list();
  const select = tools.find((t) => t.id === "select");

  expect(select).toBeDefined();
  expect(select?.name).toBe("Select");
  expect(select?.category).toBe("selection");
});
```

**Step 2: Run test to verify it fails**

Run: `yarn comfystudio-ui test Registry.test.ts`

Expected: FAIL

**Step 3: Create select tool definition**

```typescript
// packages/comfystudio-ui/src/Tools/definitions/select.ts
import { SelectionTool } from "../Types";

const selectTool: SelectionTool = {
  id: "select",
  name: "Select",
  description: "Select and manipulate canvas entities",
  icon: "MousePointer",
  shortcut: "v",
  category: "selection",
  multiSelect: true,
};

export default selectTool;
```

**Step 4: Run test to verify it passes**

Run: `yarn comfystudio-ui test Registry.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/comfystudio-ui/src/Tools/definitions/select.ts packages/comfystudio-ui/src/Tools/Registry.test.ts
git commit -m "feat(tools): add select tool definition

- Define select as selection tool with multi-select enabled
- Set 'v' as keyboard shortcut

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Generate Tool Definition

**Files:**
- Create: `packages/comfystudio-ui/src/Tools/definitions/generate.ts`

**Step 1: Write the failing test**

```typescript
// Add to packages/comfystudio-ui/src/Tools/Registry.test.ts
it("loads generate tool definition", async () => {
  const tools = await ToolRegistry.list();
  const generate = tools.find((t) => t.id === "generate");

  expect(generate).toBeDefined();
  expect(generate?.category).toBe("workflow");
  if (generate?.category === "workflow") {
    expect(generate.workflow).toBe("txt2img");
  }
});
```

**Step 2: Run test to verify it fails**

Run: `yarn comfystudio-ui test Registry.test.ts`

Expected: FAIL

**Step 3: Create generate tool definition**

```typescript
// packages/comfystudio-ui/src/Tools/definitions/generate.ts
import { WorkflowTool } from "../Types";

const generateTool: WorkflowTool = {
  id: "generate",
  name: "Generate",
  description: "Generate images using AI models",
  icon: "Sparkles",
  shortcut: "g",
  category: "workflow",
  workflow: "txt2img",
  settings: [
    {
      id: "prompt",
      type: "textarea",
      label: "Prompt",
      placeholder: "Describe what you want to generate...",
      default: "",
    },
    {
      id: "negativePrompt",
      type: "textarea",
      label: "Negative Prompt",
      placeholder: "What to avoid in the generation...",
      default: "",
    },
    {
      id: "sampler",
      type: "dropdown",
      label: "Sampler",
      options: [
        { value: "euler", label: "Euler" },
        { value: "euler_a", label: "Euler A" },
        { value: "dpmpp_2m", label: "DPM++ 2M" },
        { value: "dpmpp_sde", label: "DPM++ SDE" },
      ],
      default: "euler",
    },
    {
      id: "steps",
      type: "slider",
      label: "Steps",
      description: "Number of sampling steps",
      min: 1,
      max: 150,
      step: 1,
      default: 20,
    },
    {
      id: "cfgScale",
      type: "slider",
      label: "CFG Scale",
      description: "How closely to follow the prompt",
      min: 1,
      max: 30,
      step: 0.5,
      default: 7,
    },
    {
      id: "width",
      type: "slider",
      label: "Width",
      min: 256,
      max: 2048,
      step: 64,
      default: 512,
    },
    {
      id: "height",
      type: "slider",
      label: "Height",
      min: 256,
      max: 2048,
      step: 64,
      default: 512,
    },
  ],
};

export default generateTool;
```

**Step 4: Run test to verify it passes**

Run: `yarn comfystudio-ui test Registry.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/comfystudio-ui/src/Tools/definitions/generate.ts packages/comfystudio-ui/src/Tools/Registry.test.ts
git commit -m "feat(tools): add generate tool definition

- Define generate as workflow tool using txt2img
- Include comprehensive generation settings
- Add prompt, sampler, steps, CFG, dimensions

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Remove Background Tool Definition

**Files:**
- Create: `packages/comfystudio-ui/src/Tools/definitions/remove-background.ts`

**Step 1: Write the failing test**

```typescript
// Add to packages/comfystudio-ui/src/Tools/Registry.test.ts
it("loads remove-background tool definition", async () => {
  const tools = await ToolRegistry.list();
  const removeBg = tools.find((t) => t.id === "remove-background");

  expect(removeBg).toBeDefined();
  expect(removeBg?.category).toBe("workflow");
  if (removeBg?.category === "workflow") {
    expect(removeBg.workflow).toBe("remove-background");
  }
});
```

**Step 2: Run test to verify it fails**

Run: `yarn comfystudio-ui test Registry.test.ts`

Expected: FAIL

**Step 3: Create remove-background tool definition**

```typescript
// packages/comfystudio-ui/src/Tools/definitions/remove-background.ts
import { WorkflowTool } from "../Types";

const removeBackgroundTool: WorkflowTool = {
  id: "remove-background",
  name: "Remove Background",
  description: "Automatically remove background from selected image",
  icon: "Scissors",
  category: "workflow",
  workflow: "remove-background",
  inputMapping: {
    image: "selectedEntity",
  },
};

export default removeBackgroundTool;
```

**Step 4: Run test to verify it passes**

Run: `yarn comfystudio-ui test Registry.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/comfystudio-ui/src/Tools/definitions/remove-background.ts packages/comfystudio-ui/src/Tools/Registry.test.ts
git commit -m "feat(tools): add remove-background tool definition

- Define as workflow tool for background removal
- Map selected entity as input image

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Replace Background Tool Definition

**Files:**
- Create: `packages/comfystudio-ui/src/Tools/definitions/replace-background.ts`

**Step 1: Write the failing test**

```typescript
// Add to packages/comfystudio-ui/src/Tools/Registry.test.ts
it("loads replace-background tool definition", async () => {
  const tools = await ToolRegistry.list();
  const replaceBg = tools.find((t) => t.id === "replace-background");

  expect(replaceBg).toBeDefined();
  expect(replaceBg?.category).toBe("workflow");
});
```

**Step 2: Run test to verify it fails**

Run: `yarn comfystudio-ui test Registry.test.ts`

Expected: FAIL

**Step 3: Create replace-background tool definition**

```typescript
// packages/comfystudio-ui/src/Tools/definitions/replace-background.ts
import { WorkflowTool } from "../Types";

const replaceBackgroundTool: WorkflowTool = {
  id: "replace-background",
  name: "Replace Background",
  description: "Replace the background with AI-generated content",
  icon: "ImagePlus",
  category: "workflow",
  workflow: "replace-background",
  inputMapping: {
    image: "selectedEntity",
  },
  settings: [
    {
      id: "backgroundPrompt",
      type: "textarea",
      label: "Background Prompt",
      placeholder: "Describe the new background...",
      default: "",
    },
    {
      id: "blendStrength",
      type: "slider",
      label: "Blend Strength",
      description: "How much to blend edges",
      min: 0,
      max: 1,
      step: 0.05,
      default: 0.8,
    },
  ],
};

export default replaceBackgroundTool;
```

**Step 4: Run test to verify it passes**

Run: `yarn comfystudio-ui test Registry.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/comfystudio-ui/src/Tools/definitions/replace-background.ts packages/comfystudio-ui/src/Tools/Registry.test.ts
git commit -m "feat(tools): add replace-background tool definition

- Define as workflow tool for background replacement
- Include background prompt and blend strength settings

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Setting Renderer Components

**Files:**
- Create: `packages/comfystudio-ui/src/Tools/SettingRenderer.tsx`
- Create: `packages/comfystudio-ui/src/Tools/SettingRenderer.test.tsx`

**Step 1: Write the failing test**

```typescript
// packages/comfystudio-ui/src/Tools/SettingRenderer.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SettingRenderer } from "./SettingRenderer";
import type { SliderSetting, TextSetting } from "./Types";

describe("SettingRenderer", () => {
  it("renders slider setting", () => {
    const setting: SliderSetting = {
      id: "size",
      label: "Size",
      type: "slider",
      min: 1,
      max: 100,
      default: 20,
    };

    render(<SettingRenderer setting={setting} toolId="brush" />);
    expect(screen.getByText("Size")).toBeInTheDocument();
  });

  it("renders text setting", () => {
    const setting: TextSetting = {
      id: "prompt",
      label: "Prompt",
      type: "text",
      default: "",
    };

    render(<SettingRenderer setting={setting} toolId="generate" />);
    expect(screen.getByText("Prompt")).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `yarn comfystudio-ui test SettingRenderer.test.tsx`

Expected: FAIL with module not found

**Step 3: Implement SettingRenderer**

```typescript
// packages/comfystudio-ui/src/Tools/SettingRenderer.tsx
import { useEffect } from "react";

import { Theme } from "~/Theme";

import { ToolState } from "./State";
import type { ToolSetting } from "./Types";

type SettingRendererProps = {
  setting: ToolSetting;
  toolId: string;
};

export function SettingRenderer({ setting, toolId }: SettingRendererProps) {
  const [value, setValue] = ToolState.useToolSetting(toolId, setting.id);

  // Initialize with default if no value set
  useEffect(() => {
    if (value === undefined) {
      setValue(setting.default);
    }
  }, [value, setting.default, setValue]);

  switch (setting.type) {
    case "slider":
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white">
              {setting.label}
            </label>
            <span className="text-xs text-muted-white">{value ?? setting.default}</span>
          </div>
          {setting.description && (
            <p className="text-xs text-muted-white">{setting.description}</p>
          )}
          <input
            type="range"
            min={setting.min}
            max={setting.max}
            step={setting.step ?? 1}
            value={value ?? setting.default}
            onChange={(e) => setValue(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      );

    case "text":
      return (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-white">
            {setting.label}
          </label>
          {setting.description && (
            <p className="text-xs text-muted-white">{setting.description}</p>
          )}
          <Theme.Input
            value={value ?? setting.default}
            onChange={(e) => setValue(e.target.value)}
            placeholder={setting.placeholder}
            maxLength={setting.maxLength}
          />
        </div>
      );

    case "textarea":
      return (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-white">
            {setting.label}
          </label>
          {setting.description && (
            <p className="text-xs text-muted-white">{setting.description}</p>
          )}
          <Theme.Textarea
            value={value ?? setting.default}
            onChange={(e) => setValue(e.target.value)}
            placeholder={setting.placeholder}
            maxLength={setting.maxLength}
          />
        </div>
      );

    case "dropdown":
      return (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-white">
            {setting.label}
          </label>
          {setting.description && (
            <p className="text-xs text-muted-white">{setting.description}</p>
          )}
          <Theme.Select
            value={value ?? setting.default}
            onChange={(e) => setValue(e.target.value)}
          >
            {setting.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Theme.Select>
        </div>
      );

    case "checkbox":
      return (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`${toolId}-${setting.id}`}
            checked={value ?? setting.default}
            onChange={(e) => setValue(e.target.checked)}
            className="h-4 w-4"
          />
          <label
            htmlFor={`${toolId}-${setting.id}`}
            className="text-sm font-medium text-white"
          >
            {setting.label}
          </label>
          {setting.description && (
            <p className="text-xs text-muted-white">{setting.description}</p>
          )}
        </div>
      );

    case "custom":
      // Custom components would be registered separately
      return (
        <div className="text-sm text-muted-white">
          Custom component: {setting.component}
        </div>
      );

    default:
      return null;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `yarn comfystudio-ui test SettingRenderer.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/comfystudio-ui/src/Tools/SettingRenderer.tsx packages/comfystudio-ui/src/Tools/SettingRenderer.test.tsx
git commit -m "feat(tools): add automatic settings renderer

- Render slider, text, textarea, dropdown, checkbox settings
- Auto-initialize with default values
- Use Theme components for consistent styling

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Update EditorToolPanel

**Files:**
- Modify: `packages/comfystudio-ui/src/Dock/Panels/EditorToolPanel.tsx`
- Create: `packages/comfystudio-ui/src/Dock/Panels/EditorToolPanel.test.tsx`

**Step 1: Write the failing test**

```typescript
// packages/comfystudio-ui/src/Dock/Panels/EditorToolPanel.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ToolRegistry } from "~/Tools/Registry";
import { ToolState } from "~/Tools/State";

import { EditorToolPanel } from "./EditorToolPanel";

vi.mock("~/Tools/Registry");
vi.mock("~/Tools/State");

describe("EditorToolPanel", () => {
  it("shows settings when tool is active", async () => {
    vi.mocked(ToolState.useActiveTool).mockReturnValue([
      "brush",
      vi.fn(),
    ]);

    vi.mocked(ToolRegistry.get).mockResolvedValue({
      id: "brush",
      name: "Eraser",
      category: "canvas-interaction",
      icon: "Eraser",
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
    });

    render(<EditorToolPanel />);

    // Wait for async tool loading
    await screen.findByText("Size");
    expect(screen.getByText("Size")).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `yarn comfystudio-ui test EditorToolPanel.test.tsx`

Expected: FAIL

**Step 3: Update EditorToolPanel implementation**

```typescript
// packages/comfystudio-ui/src/Dock/Panels/EditorToolPanel.tsx
import { useEffect, useState } from "react";

import { ToolRegistry } from "~/Tools/Registry";
import { SettingRenderer } from "~/Tools/SettingRenderer";
import { ToolState } from "~/Tools/State";
import type { ToolDefinition } from "~/Tools/Types";

export function EditorToolPanel() {
  const [activeTool] = ToolState.useActiveTool();
  const [tool, setTool] = useState<ToolDefinition | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeTool) {
      setTool(null);
      return;
    }

    setLoading(true);
    ToolRegistry.get(activeTool)
      .then((loadedTool) => {
        setTool(loadedTool);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load tool:", error);
        setLoading(false);
      });
  }, [activeTool]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <span className="text-sm text-muted-white">Loading...</span>
      </div>
    );
  }

  if (!tool || !tool.settings || tool.settings.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h3 className="text-sm font-semibold text-white">{tool.name} Settings</h3>
      {tool.settings.map((setting) => (
        <SettingRenderer
          key={setting.id}
          setting={setting}
          toolId={tool.id}
        />
      ))}
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `yarn comfystudio-ui test EditorToolPanel.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/comfystudio-ui/src/Dock/Panels/EditorToolPanel.tsx packages/comfystudio-ui/src/Dock/Panels/EditorToolPanel.test.tsx
git commit -m "feat(tools): update EditorToolPanel to use declarative tools

- Load tool definition from Registry
- Automatically render settings from tool schema
- Show loading state during tool loading

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Update ToolsPanel

**Files:**
- Modify: `packages/comfystudio-ui/src/Dock/Panels/ToolsPanel.tsx`
- Update: `packages/comfystudio-ui/src/Dock/Panels/PromptPanel.test.tsx` (if exists)

**Step 1: Write the failing test**

```typescript
// packages/comfystudio-ui/src/Dock/Panels/ToolsPanel.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ToolRegistry } from "~/Tools/Registry";

import { ToolsPanel } from "./ToolsPanel";

vi.mock("~/Tools/Registry");

describe("ToolsPanel", () => {
  it("displays all tools from registry", async () => {
    vi.mocked(ToolRegistry.list).mockResolvedValue([
      {
        id: "brush",
        name: "Eraser",
        category: "canvas-interaction",
        icon: "Eraser",
      },
      {
        id: "select",
        name: "Select",
        category: "selection",
        icon: "MousePointer",
      },
    ]);

    render(<ToolsPanel />);

    await screen.findByText("Eraser");
    expect(screen.getByText("Eraser")).toBeInTheDocument();
    expect(screen.getByText("Select")).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `yarn comfystudio-ui test ToolsPanel.test.tsx`

Expected: FAIL (need to create test file)

**Step 3: Update ToolsPanel to use full definitions**

```typescript
// packages/comfystudio-ui/src/Dock/Panels/ToolsPanel.tsx
import { useEffect, useState } from "react";

import { Theme } from "~/Theme";
import { ToolRegistry } from "~/Tools/Registry";
import { ToolState } from "~/Tools/State";
import type { ToolDefinition } from "~/Tools/Types";

export function ToolsPanel() {
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTool, setActiveTool] = ToolState.useActiveTool();

  useEffect(() => {
    let active = true;
    ToolRegistry.list()
      .then((result) => {
        if (active) {
          setTools(result);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Failed to load tools:", error);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleToolClick = (toolId: string) => {
    setActiveTool(toolId === activeTool ? null : toolId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <span className="text-sm text-muted-white">Loading tools...</span>
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <div className="text-sm text-muted-white">No tools available yet.</div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {tools.map((tool) => {
        const Icon = Theme.Icon[tool.icon as keyof typeof Theme.Icon];
        const isActive = activeTool === tool.id;

        return (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            className={`flex items-center gap-3 rounded border p-3 text-left transition-colors ${
              isActive
                ? "border-blue-500 bg-blue-500/10"
                : "border-zinc-800 hover:border-zinc-700"
            }`}
          >
            {Icon && <Icon className="h-5 w-5 text-white" />}
            <div className="flex-1">
              <div className="text-sm font-medium text-white">{tool.name}</div>
              {tool.description && (
                <div className="text-xs text-muted-white">
                  {tool.description}
                </div>
              )}
              {tool.shortcut && (
                <div className="mt-1 text-xs text-muted-white">
                  Shortcut: {tool.shortcut}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `yarn comfystudio-ui test ToolsPanel.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/comfystudio-ui/src/Dock/Panels/ToolsPanel.tsx packages/comfystudio-ui/src/Dock/Panels/ToolsPanel.test.tsx
git commit -m "feat(tools): enhance ToolsPanel with full tool definitions

- Display tool icon, name, description, and shortcut
- Show active state for selected tool
- Support tool activation on click

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Brush Tool Implementation (Wrapper)

**Files:**
- Create: `packages/comfystudio-ui/src/Tools/implementations/brush.ts`

**Step 1: Examine existing brush implementation**

Read: `packages/comfystudio-ui/src/Editor/Brush/index.tsx`

Identify the key functions we need to wrap.

**Step 2: Write the wrapper implementation**

```typescript
// packages/comfystudio-ui/src/Tools/implementations/brush.ts
import { Editor } from "~/Editor";

import type { ToolImplementation } from "../Types";

// Initial wrapper - delegates to existing Editor.Brush
const brushImplementation: ToolImplementation = {
  onActivate: () => {
    // Existing brush tool uses Editor.Tool.Active
    // This is already handled by the Editor.Brush component
  },

  onDeactivate: () => {
    // Cleanup if needed
  },

  // Canvas interactions are handled by the Editor.Brush component
  // which listens to canvas events via Editor.Canvas hooks
  // No need to duplicate logic here in Phase 1 (wrapper pattern)
};

export default brushImplementation;
```

**Step 3: Test loading implementation**

Create quick test:

```typescript
// Add to packages/comfystudio-ui/src/Tools/Registry.test.ts
it("loads brush implementation", async () => {
  const impl = await ToolRegistry.getImplementation("brush");
  expect(impl).toBeDefined();
});
```

Run: `yarn comfystudio-ui test Registry.test.ts`

Expected: PASS

**Step 4: Commit**

```bash
git add packages/comfystudio-ui/src/Tools/implementations/brush.ts packages/comfystudio-ui/src/Tools/Registry.test.ts
git commit -m "feat(tools): add brush tool implementation wrapper

- Create minimal wrapper for existing Editor.Brush
- Canvas interactions handled by existing component
- Ready for gradual refactoring in Phase 2

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 13: Select Tool Implementation (Wrapper)

**Files:**
- Create: `packages/comfystudio-ui/src/Tools/implementations/select.ts`

**Step 1: Create wrapper implementation**

```typescript
// packages/comfystudio-ui/src/Tools/implementations/select.ts
import { Editor } from "~/Editor";

import type { ToolImplementation } from "../Types";

// Wrapper for existing selection functionality
const selectImplementation: ToolImplementation = {
  onActivate: () => {
    // Selection tool activation
    // Existing Editor.Selection handles selection state
  },

  onDeactivate: () => {
    // Optionally clear selection on deactivate
    // Editor.Selection.useClear()();
  },

  // Selection interactions handled by existing Editor.Selection
};

export default selectImplementation;
```

**Step 2: Test loading**

```typescript
// Add to Registry.test.ts
it("loads select implementation", async () => {
  const impl = await ToolRegistry.getImplementation("select");
  expect(impl).toBeDefined();
});
```

**Step 3: Run test**

Run: `yarn comfystudio-ui test Registry.test.ts`

Expected: PASS

**Step 4: Commit**

```bash
git add packages/comfystudio-ui/src/Tools/implementations/select.ts packages/comfystudio-ui/src/Tools/Registry.test.ts
git commit -m "feat(tools): add select tool implementation wrapper

- Wrap existing Editor.Selection functionality
- Maintain existing selection state management

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 14: Generate Tool Implementation (Stub)

**Files:**
- Create: `packages/comfystudio-ui/src/Tools/implementations/generate.ts`

**Step 1: Create stub implementation**

```typescript
// packages/comfystudio-ui/src/Tools/implementations/generate.ts
import { Plugin } from "~/Plugin";

import type { ToolImplementation } from "../Types";

const generateImplementation: ToolImplementation = {
  executeWorkflow: async (settings) => {
    const plugin = Plugin.use();

    if (!plugin) {
      throw new Error("No plugin configured for image generation");
    }

    // TODO: Call plugin's image generation method
    // This requires understanding the existing Generation.Image API
    console.log("Generate workflow:", settings);

    // Placeholder - will be implemented based on existing Generation.Image
    throw new Error("Generate workflow not yet implemented");
  },
};

export default generateImplementation;
```

**Step 2: Add test**

```typescript
// Add to Registry.test.ts
it("loads generate implementation", async () => {
  const impl = await ToolRegistry.getImplementation("generate");
  expect(impl).toBeDefined();
  expect(impl.executeWorkflow).toBeDefined();
});
```

**Step 3: Run test**

Run: `yarn comfystudio-ui test Registry.test.ts`

Expected: PASS

**Step 4: Commit**

```bash
git add packages/comfystudio-ui/src/Tools/implementations/generate.ts packages/comfystudio-ui/src/Tools/Registry.test.ts
git commit -m "feat(tools): add generate tool implementation stub

- Create stub for workflow-based generation
- TODO: integrate with existing Generation.Image API

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 15: Background Removal Tool Implementations (Stubs)

**Files:**
- Create: `packages/comfystudio-ui/src/Tools/implementations/remove-background.ts`
- Create: `packages/comfystudio-ui/src/Tools/implementations/replace-background.ts`

**Step 1: Create remove-background stub**

```typescript
// packages/comfystudio-ui/src/Tools/implementations/remove-background.ts
import { Editor } from "~/Editor";
import { Plugin } from "~/Plugin";

import type { ToolImplementation } from "../Types";

const removeBackgroundImplementation: ToolImplementation = {
  executeWorkflow: async (settings) => {
    const plugin = Plugin.use();
    const selected = Editor.Selection.use();

    if (selected.size === 0) {
      throw new Error("Please select an image first");
    }

    const selectedId = Array.from(selected)[0];
    const entities = Editor.Entities.useMap();
    const entity = entities.get(selectedId);

    if (!entity || entity.type !== "image") {
      throw new Error("Selected entity must be an image");
    }

    // TODO: Build ComfyUI workflow for background removal
    console.log("Remove background workflow:", { entity, settings });

    throw new Error("Remove background workflow not yet implemented");
  },
};

export default removeBackgroundImplementation;
```

**Step 2: Create replace-background stub**

```typescript
// packages/comfystudio-ui/src/Tools/implementations/replace-background.ts
import { Editor } from "~/Editor";
import { Plugin } from "~/Plugin";

import type { ToolImplementation } from "../Types";

const replaceBackgroundImplementation: ToolImplementation = {
  executeWorkflow: async (settings) => {
    const plugin = Plugin.use();
    const selected = Editor.Selection.use();

    if (selected.size === 0) {
      throw new Error("Please select an image first");
    }

    const selectedId = Array.from(selected)[0];
    const entities = Editor.Entities.useMap();
    const entity = entities.get(selectedId);

    if (!entity || entity.type !== "image") {
      throw new Error("Selected entity must be an image");
    }

    // TODO: Build ComfyUI workflow for background replacement
    console.log("Replace background workflow:", { entity, settings });

    throw new Error("Replace background workflow not yet implemented");
  },
};

export default replaceBackgroundImplementation;
```

**Step 3: Add tests**

```typescript
// Add to Registry.test.ts
it("loads remove-background implementation", async () => {
  const impl = await ToolRegistry.getImplementation("remove-background");
  expect(impl).toBeDefined();
  expect(impl.executeWorkflow).toBeDefined();
});

it("loads replace-background implementation", async () => {
  const impl = await ToolRegistry.getImplementation("replace-background");
  expect(impl).toBeDefined();
  expect(impl.executeWorkflow).toBeDefined();
});
```

**Step 4: Run tests**

Run: `yarn comfystudio-ui test Registry.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add packages/comfystudio-ui/src/Tools/implementations/remove-background.ts packages/comfystudio-ui/src/Tools/implementations/replace-background.ts packages/comfystudio-ui/src/Tools/Registry.test.ts
git commit -m "feat(tools): add background tool implementation stubs

- Create stubs for remove/replace background workflows
- Validate selection before execution
- TODO: implement ComfyUI workflow building

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 16: Integration Testing

**Files:**
- Create: `packages/comfystudio-ui/src/Tools/integration.test.tsx`

**Step 1: Write integration tests**

```typescript
// packages/comfystudio-ui/src/Tools/integration.test.tsx
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ToolRegistry } from "./Registry";
import { ToolState } from "./State";

describe("Tool System Integration", () => {
  it("loads all expected tools", async () => {
    const tools = await ToolRegistry.list();

    const toolIds = tools.map((t) => t.id);
    expect(toolIds).toContain("brush");
    expect(toolIds).toContain("select");
    expect(toolIds).toContain("generate");
    expect(toolIds).toContain("remove-background");
    expect(toolIds).toContain("replace-background");
  });

  it("tool definitions have correct structure", async () => {
    const tools = await ToolRegistry.list();

    tools.forEach((tool) => {
      expect(tool.id).toBeTruthy();
      expect(tool.name).toBeTruthy();
      expect(tool.icon).toBeTruthy();
      expect(tool.category).toMatch(
        /^(canvas-interaction|workflow|selection)$/
      );
    });
  });

  it("initializes tool settings with defaults", async () => {
    const brush = await ToolRegistry.get("brush");
    expect(brush).not.toBeNull();

    if (brush?.settings) {
      const defaults = brush.settings.reduce(
        (acc, setting) => {
          acc[setting.id] = setting.default;
          return acc;
        },
        {} as Record<string, any>
      );

      await ToolState.initializeDefaults("brush", defaults);

      const settings = ToolState.getToolSettings("brush");
      expect(settings.size).toBe(20);
      expect(settings.strength).toBe(1);
      expect(settings.blur).toBe(0);
    }
  });

  it("loads implementations for all tools", async () => {
    const tools = await ToolRegistry.list();

    for (const tool of tools) {
      const impl = await ToolRegistry.getImplementation(tool.id);
      expect(impl).toBeDefined();
    }
  });
});
```

**Step 2: Run integration tests**

Run: `yarn comfystudio-ui test integration.test.tsx`

Expected: PASS

**Step 3: Commit**

```bash
git add packages/comfystudio-ui/src/Tools/integration.test.tsx
git commit -m "test(tools): add integration tests for tool system

- Verify all tools load correctly
- Validate tool definition structure
- Test settings initialization
- Confirm implementations exist for all tools

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 17: Update CLAUDE.md Documentation

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add tool system documentation**

Add new section to CLAUDE.md after the "Critical Domains" section:

```markdown
### Declarative Tool System

Located in `packages/comfystudio-ui/src/Tools/`:

**Convention-Based Architecture:**
- Tool definitions in `definitions/` directory (TypeScript files)
- Tool implementations in `implementations/` directory
- Automatic discovery via Vite glob imports
- Tool `id` matches filename: `definitions/brush.ts` ↔ `implementations/brush.ts`

**Tool Categories (Discriminated Union):**
- `canvas-interaction` - Tools that draw/interact with canvas (Brush)
- `workflow` - Tools that trigger ComfyUI workflows (Generate, Remove BG)
- `selection` - Tools that manage entity selection (Select)

**Adding a New Tool:**
1. Create `definitions/my-tool.ts` with tool metadata and settings schema
2. Create `implementations/my-tool.ts` with behavioral hooks
3. Tool automatically appears in ToolsPanel (no registration needed)

**Tool Settings:**
- Predefined types: `slider`, `text`, `textarea`, `dropdown`, `checkbox`, `custom`
- Settings auto-render in EditorToolPanel
- State managed via `ToolState` (Zustand wrapper)
- Default values initialized automatically

**Key Files:**
- `Types.ts` - Type definitions for tools and settings
- `Registry.ts` - Tool discovery and loading
- `State.ts` - Tool settings state management
- `SettingRenderer.tsx` - Automatic settings UI generation
```

**Step 2: Commit documentation**

```bash
git add CLAUDE.md
git commit -m "docs: add declarative tool system to CLAUDE.md

- Document convention-based architecture
- Explain tool categories and structure
- Add guide for creating new tools

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 18: Manual Testing & Verification

**Files:**
- None (manual testing only)

**Step 1: Start dev server**

Run: `yarn dev`

**Step 2: Verify ToolsPanel**

- Open app at http://localhost:3000
- Check left dock for ToolsPanel
- Verify all 5 tools appear: Brush, Select, Generate, Remove Background, Replace Background
- Check icons, names, descriptions display correctly

**Step 3: Verify EditorToolPanel**

- Click on Brush tool in ToolsPanel
- Verify EditorToolPanel shows "Eraser Settings"
- Check Size, Strength, Blur sliders appear
- Test slider interactions - values should update

**Step 4: Verify Generate tool settings**

- Click Generate tool
- Verify prompt textarea, sampler dropdown, and sliders appear
- Test dropdown selection
- Test prompt input

**Step 5: Document any issues**

Create `docs/plans/2026-01-28-tool-system-verification.md` with:
- Screenshots (if possible)
- List of verified features
- Any bugs or issues found
- Next steps for workflow implementations

**Step 6: Commit verification notes**

```bash
git add docs/plans/2026-01-28-tool-system-verification.md
git commit -m "docs: add tool system verification notes

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Success Criteria

- ✅ All type definitions compile without errors
- ✅ All tests pass (`yarn comfystudio-ui test`)
- ✅ 5 tools defined: brush, select, generate, remove-background, replace-background
- ✅ ToolsPanel displays all tools with icons and descriptions
- ✅ EditorToolPanel renders settings automatically
- ✅ Tool settings can be changed via UI
- ✅ Settings state persists during session
- ✅ Documentation updated in CLAUDE.md

## Next Steps (Not in This Plan)

After this plan completes, the following remain as future work:

1. **Implement Generate workflow** - Connect to existing `Generation.Image` API
2. **Build ComfyUI workflows** - Create remove/replace background workflows
3. **Add keyboard shortcuts** - Register shortcuts from tool definitions
4. **Settings persistence** - Save tool settings to localStorage
5. **Tool activation** - Hook tool activation into existing `Editor.Tool.Active`
6. **Refactor brush implementation** - Move canvas logic from `Editor.Brush` into `implementations/brush.ts`
7. **Add hand tool** - Create hand/pan tool definition and implementation

## Technical Notes

**Testing Strategy:** Each task uses TDD - write test first, watch it fail, implement, watch it pass, commit.

**Vitest Configuration:** Tests use `@testing-library/react` for component testing. The existing setup in `packages/comfystudio-ui/src/test/setup.test.ts` is minimal, so tests include necessary imports.

**Vite Glob Imports:** The `import.meta.glob()` feature requires the path pattern to be a string literal. Dynamic patterns won't work. This is why we use convention-based loading with fixed directories.

**TypeScript Discriminated Unions:** The `category` field acts as the discriminant. TypeScript narrows the type based on this field, giving you type safety for category-specific properties.

**Migration Philosophy:** Phase 1 uses thin wrappers. Existing code (`Editor.Brush`, `Editor.Selection`) continues working as-is. Refactoring to move logic into implementations can happen gradually without breaking functionality.
