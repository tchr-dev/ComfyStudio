# Declarative Tool System Design

**Date:** 2026-01-28
**Status:** Approved for Implementation

## Overview

This document describes the declarative tool system for ComfyStudio. The goal is to define tools through TypeScript configuration files rather than scattered code, making it easier to add new tools and migrate existing ones to the Dock-based UI.

## Goals

1. **Declarative tool definitions** - Define tool metadata, settings, and configuration in TypeScript files
2. **Convention-based loading** - Tools automatically discovered based on file naming conventions
3. **Type-safe authoring** - Full TypeScript support for tool definitions
4. **Category-based tool types** - Different tool categories (canvas-interaction, workflow, selection) with appropriate type constraints
5. **Flexible settings schema** - Support common UI primitives (slider, text, dropdown) with escape hatch for custom components
6. **Easy migration** - Existing tools can be wrapped initially, then refactored over time

## Architectural Decisions

### Decision 1: Tool Location
**Choice:** All tools in UI package (`packages/comfystudio-ui/src/Tools/`)

**Rationale:** Start simple with plugin-agnostic tools. Plugin-specific tools can be added later with a refactor to support loading tools from plugins.

### Decision 2: Definition Format
**Choice:** TypeScript files with full type safety

**Rationale:** TypeScript provides better authoring experience, IDE support, and type safety. Can reference UI components and types directly.

### Decision 3: Declarative Scope
**Choice:** Metadata + UI configuration declarative, complex behavior stays in code

**Rationale:** Balance between ease of adding tools and flexibility. Define tool shape (metadata, settings schema, shortcuts) declaratively, but keep complex behaviors (canvas interactions, workflow execution) in TypeScript.

### Decision 4: Tool Categories
**Choice:** Discriminated union with three categories

**Rationale:** Tools have different behavioral patterns that warrant different type constraints:
- `canvas-interaction` - Tools that draw/interact with canvas (Brush, Erase)
- `workflow` - Tools that trigger ComfyUI workflows (Generate, Remove BG, Replace BG)
- `selection` - Tools that manage entity selection (Select tool)

### Decision 5: Settings Configuration
**Choice:** Predefined types (slider, text, dropdown, checkbox) with custom component escape hatch

**Rationale:** Covers 90% of cases with standard UI primitives. Custom type available when needed for complex settings UI.

### Decision 6: Definition-to-Implementation Connection
**Choice:** Convention-based matching by `id`

**Rationale:** Simple and predictable. Tool `id: "brush"` automatically matches `definitions/brush.ts` and `implementations/brush.ts`.

## File Structure

```
packages/comfystudio-ui/src/Tools/
├── Types.ts                    # Core type definitions
├── Registry.ts                 # Tool discovery and loading
├── State.ts                    # Tool state management (settings values)
├── SettingRenderer.tsx         # Automatic settings UI rendering
├── definitions/                # Declarative tool definitions
│   ├── brush.ts               # Brush/Eraser tool
│   ├── select.ts              # Selection tool
│   ├── hand.ts                # Hand/pan tool
│   ├── generate.ts            # Generation tool
│   ├── remove-background.ts   # Remove background (workflow)
│   └── replace-background.ts  # Replace background (workflow)
└── implementations/           # Tool behavior implementations
    ├── brush.ts               # Brush canvas interaction logic
    ├── select.ts              # Selection state management
    ├── hand.ts                # Pan behavior
    ├── generate.ts            # Generation workflow trigger
    ├── remove-background.ts   # Remove BG workflow
    └── replace-background.ts  # Replace BG workflow
```

## Type Definitions

### Base Tool Definition

```typescript
type BaseToolDefinition = {
  id: string;                    // Unique identifier (matches implementation filename)
  name: string;                  // Display name in UI
  description?: string;          // Optional description for tooltips
  icon: string;                  // Icon name from Theme.Icon
  shortcut?: string;             // Keyboard shortcut (e.g., "e", "v", "g")
  category: "canvas-interaction" | "workflow" | "selection";
  settings?: ToolSetting[];      // Configurable settings
};
```

### Tool Settings Schema

```typescript
type BaseToolSetting = {
  id: string;
  label: string;
  description?: string;
};

type SliderSetting = BaseToolSetting & {
  type: "slider";
  min: number;
  max: number;
  step?: number;
  default: number;
};

type TextSetting = BaseToolSetting & {
  type: "text" | "textarea";
  default: string;
  placeholder?: string;
};

type DropdownSetting = BaseToolSetting & {
  type: "dropdown";
  options: { value: string; label: string }[];
  default: string;
};

type CheckboxSetting = BaseToolSetting & {
  type: "checkbox";
  default: boolean;
};

type CustomSetting = BaseToolSetting & {
  type: "custom";
  component: string;             // Component name for complex cases
  props?: Record<string, unknown>;
};

type ToolSetting =
  | SliderSetting
  | TextSetting
  | DropdownSetting
  | CheckboxSetting
  | CustomSetting;
```

### Category-Specific Tool Types

```typescript
type CanvasInteractionTool = BaseToolDefinition & {
  category: "canvas-interaction";
  cursor?: "crosshair" | "default" | "custom";
  cursorComponent?: string;      // For custom cursors
};

type WorkflowTool = BaseToolDefinition & {
  category: "workflow";
  workflow: string;              // ComfyUI workflow identifier
  inputMapping?: Record<string, string>; // Map settings to workflow inputs
};

type SelectionTool = BaseToolDefinition & {
  category: "selection";
  multiSelect?: boolean;
};

type ToolDefinition =
  | CanvasInteractionTool
  | WorkflowTool
  | SelectionTool;
```

### Tool Implementation Interface

```typescript
export type ToolImplementation = {
  // Lifecycle
  onActivate?: () => void;
  onDeactivate?: () => void;

  // Canvas interaction (for canvas-interaction category)
  onMouseDown?: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseMove?: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseUp?: (e: KonvaEventObject<MouseEvent>) => void;

  // Workflow execution (for workflow category)
  executeWorkflow?: (settings: Record<string, any>) => Promise<void>;

  // Custom settings panel (optional)
  SettingsPanel?: React.ComponentType;
};
```

## Tool Registry

### Core API

```typescript
export namespace ToolRegistry {
  // Load all tool definitions
  export const list = async (): Promise<ToolDefinition[]> => {
    return await loadDefinitions();
  };

  // Get specific tool by ID
  export const get = async (id: string): Promise<ToolDefinition | null> => {
    const tools = await list();
    return tools.find(tool => tool.id === id) || null;
  };

  // Load tool implementation
  export const getImplementation = async (id: string): Promise<ToolImplementation> => {
    const impl = await import(`./implementations/${id}`);
    return impl.default || impl;
  };
}
```

### Definition Loading

```typescript
const loadDefinitions = async (): Promise<ToolDefinition[]> => {
  // Use Vite's glob import for automatic discovery
  const definitionModules = import.meta.glob('./definitions/*.ts');

  const definitions: ToolDefinition[] = [];
  for (const path in definitionModules) {
    const module = await definitionModules[path]();
    if (module.default) {
      definitions.push(module.default as ToolDefinition);
    }
  }

  return definitions;
};
```

## Settings Rendering

### Automatic UI Generation

```typescript
export function EditorToolPanel() {
  const [activeTool] = Editor.Tool.Active.use();
  const [tool, setTool] = useState<ToolDefinition | null>(null);

  useEffect(() => {
    if (activeTool) {
      ToolRegistry.get(activeTool).then(setTool);
    }
  }, [activeTool]);

  if (!tool || !tool.settings) return null;

  return (
    <div className="flex flex-col gap-4">
      {tool.settings.map(setting => (
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

### Setting Renderer

```typescript
function SettingRenderer({ setting, toolId }: Props) {
  const [value, setValue] = ToolState.useToolSetting(toolId, setting.id);

  switch (setting.type) {
    case "slider":
      return <SliderControl setting={setting} value={value} onChange={setValue} />;
    case "text":
      return <TextControl setting={setting} value={value} onChange={setValue} />;
    case "dropdown":
      return <DropdownControl setting={setting} value={value} onChange={setValue} />;
    case "checkbox":
      return <CheckboxControl setting={setting} value={value} onChange={setValue} />;
    case "custom":
      const Component = customComponents[setting.component];
      return <Component {...setting.props} value={value} onChange={setValue} />;
  }
}
```

## State Management

Tool settings stored in global state, separate from definitions:

```typescript
type ToolState = {
  settings: Record<string, Record<string, any>>; // toolId -> settingId -> value
  activeTool: string | null;
};

export namespace ToolState {
  const store = GlobalState.create<ToolState>((set) => ({
    settings: {},
    activeTool: null,
  }));

  export const useToolSetting = (toolId: string, settingId: string) => {
    const value = store(state => state.settings[toolId]?.[settingId]);
    const setValue = useCallback((newValue: any) => {
      store.setState(state => ({
        settings: {
          ...state.settings,
          [toolId]: {
            ...state.settings[toolId],
            [settingId]: newValue,
          }
        }
      }));
    }, [toolId, settingId]);

    return [value, setValue];
  };
}
```

## Example Tool Definitions

### Brush Tool (Canvas Interaction)

```typescript
// definitions/brush.ts
import { ToolDefinition } from "../Types";

const brushTool: ToolDefinition = {
  id: "brush",
  name: "Eraser",
  description: "Remove pixels from images",
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
      min: 1,
      max: 100,
      step: 1,
      default: 20,
    },
    {
      id: "strength",
      type: "slider",
      label: "Strength",
      min: 0,
      max: 1,
      step: 0.01,
      default: 1,
    },
    {
      id: "blur",
      type: "slider",
      label: "Blur",
      min: 0,
      max: 50,
      step: 1,
      default: 0,
    },
  ],
};

export default brushTool;
```

### Generate Tool (Workflow)

```typescript
// definitions/generate.ts
const generateTool: ToolDefinition = {
  id: "generate",
  name: "Generate",
  description: "Generate images using AI",
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
      id: "sampler",
      type: "dropdown",
      label: "Sampler",
      options: [
        { value: "euler", label: "Euler" },
        { value: "euler_a", label: "Euler A" },
        { value: "dpmpp_2m", label: "DPM++ 2M" },
      ],
      default: "euler",
    },
    {
      id: "steps",
      type: "slider",
      label: "Steps",
      min: 1,
      max: 150,
      step: 1,
      default: 20,
    },
  ],
};

export default generateTool;
```

### Remove Background Tool (Workflow)

```typescript
// definitions/remove-background.ts
const removeBackgroundTool: ToolDefinition = {
  id: "remove-background",
  name: "Remove Background",
  description: "Remove background from selected image",
  icon: "Scissors",
  category: "workflow",
  workflow: "remove-background",
  inputMapping: {
    image: "selectedEntity",
  },
};

export default removeBackgroundTool;
```

### Selection Tool

```typescript
// definitions/select.ts
const selectTool: ToolDefinition = {
  id: "select",
  name: "Select",
  description: "Select and manipulate entities",
  icon: "MousePointer",
  shortcut: "v",
  category: "selection",
  multiSelect: true,
};

export default selectTool;
```

## Tool Implementation Pattern

### Canvas Interaction Implementation

```typescript
// implementations/brush.ts
import { ToolImplementation } from "../Types";
import { Editor } from "~/Editor";

const brushImplementation: ToolImplementation = {
  onActivate: () => {
    Editor.Tool.Active.set("brush");
  },

  onMouseDown: (e) => {
    const maskLine = new MaskLine();
    // ... existing brush mousedown logic from Editor.Brush
  },

  onMouseMove: (e) => {
    // ... existing brush mousemove logic
  },

  onMouseUp: () => {
    // ... apply mask, cleanup
  },

  SettingsPanel: BrushSettingsPanel, // Optional custom UI
};

export default brushImplementation;
```

### Workflow Implementation

```typescript
// implementations/remove-background.ts
import { ToolImplementation } from "../Types";
import { Plugin } from "~/Plugin";
import { Editor } from "~/Editor";

const removeBackgroundImpl: ToolImplementation = {
  executeWorkflow: async (settings) => {
    const plugin = Plugin.use();
    const selectedEntity = Editor.Selection.useSelected()[0];

    if (!selectedEntity || selectedEntity.type !== "image") {
      throw new Error("Please select an image first");
    }

    // Build and execute ComfyUI workflow
    await plugin.executeWorkflow({
      type: "remove-background",
      inputs: {
        image: selectedEntity.element
      },
      settings,
    });
  },
};

export default removeBackgroundImpl;
```

## Migration Strategy

### Phase 1: Wrapper Pattern
Keep existing code intact, create thin wrappers:

```typescript
// implementations/brush.ts (initial)
import { Editor } from "~/Editor";

const brushImplementation: ToolImplementation = {
  onActivate: () => Editor.Brush.onActivate(),
  onMouseDown: (e) => Editor.Brush.onMouseDown(e),
  onMouseMove: (e) => Editor.Brush.onMouseMove(e),
  onMouseUp: () => Editor.Brush.onMouseUp(),
};

export default brushImplementation;
```

### Phase 2: Gradual Refactor
Move logic from `Editor.Brush` into `implementations/brush.ts` over time. No rush - wrappers work fine during transition.

### Phase 3: Deprecation
Once fully migrated, deprecate old `Editor.Brush` code.

## Integration Points

### ToolsPanel
Already consumes `ToolRegistry.list()` - will automatically show new tools.

### EditorToolPanel
Needs update to use `ToolRegistry.get()` and render settings automatically.

### Tool Activation
Existing `Editor.Tool.Active` state remains, implementations hook into it.

### Keyboard Shortcuts
Register shortcuts from tool definitions in `Shortcut` domain.

## Future Enhancements

### Plugin-Specific Tools
When ready to support plugin-provided tools:
1. Extend Registry to load from plugins
2. Plugin manifest includes `tools: ToolDefinition[]`
3. Registry merges UI tools + plugin tools

### Workflow Builder Integration
For workflow tools, enhance to support:
- Visual workflow editor
- Workflow composition/chaining
- Workflow parameter validation

### Settings Persistence
Enhance `ToolState` to persist to localStorage per tool.

### Tool Marketplace
External tool definitions loaded from URLs/marketplace.

## Success Criteria

1. ✅ All native tools (Select, Brush, Hand, Generate) have declarative definitions
2. ✅ Remove Background and Replace Background tools implemented with ComfyUI workflows
3. ✅ ToolsPanel displays all tools from Registry
4. ✅ EditorToolPanel renders settings automatically from schema
5. ✅ Tool settings persist across sessions
6. ✅ Keyboard shortcuts work from definitions
7. ✅ Existing tools migrated without breaking functionality
8. ✅ Easy to add new tools (just create definition + implementation files)

## Open Questions

None - design approved.
