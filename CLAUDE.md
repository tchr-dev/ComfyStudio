# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ComfyStudio is a ComfyUI-focused fork of StableStudio that provides a polished, DreamStudio-style UI for ComfyUI's powerful node-based backend. It's a monorepo built with TypeScript, React, and Vite, organized as Yarn workspaces with a plugin-based architecture for different inference backends.

## Development Commands

### Starting the Application

```bash
# Start both ComfyUI backend and ComfyStudio frontend together
yarn start
# Requires: comfy-cli (install with: pip install comfy-cli)
# This launches ComfyUI with CORS enabled and the frontend dev server

# Start just the frontend (dev mode for all workspaces)
yarn dev

# Start with alternative plugins
yarn dev:use-example-plugin    # Use example plugin for development
yarn dev:use-webui-plugin       # Use stable-diffusion-webui plugin
yarn dev:use-stability-plugin   # Use Stability API plugin
```

### Building and Testing

```bash
# Build all packages
yarn build

# Lint and fix UI code
yarn comfystudio-ui lint
yarn comfystudio-ui lint:fix

# Run tests
yarn comfystudio-ui test

# Type checking
yarn comfystudio-ui build:types

# Clean everything
yarn clean
```

### Working with Individual Packages

```bash
# Access specific workspace commands
yarn comfystudio-ui <command>
yarn comfystudio-plugin <command>
yarn comfystudio-plugin-comfyui <command>
yarn comfystudio-plugin-example <command>
yarn comfystudio-plugin-stability <command>
yarn comfystudio-plugin-webui <command>
yarn comfystudio-plugin-webgpu <command>
```

## Architecture

### Domain-Driven Design (DDD)

The codebase follows **strict domain-driven design principles**. Code is organized around concepts rather than technical implementation details. This structure is fractal - domains compose smaller domains.

**Key principle**: If you see repeated references to a concept, create a domain for it. Compound words are structuring hints (e.g., `DeviceInformation` → `Device.Information`).

#### Domain Syntax Pattern

Domains use TypeScript declaration merging to create fluent APIs:

```tsx
// Domain can be used as: type, namespace, and component
export type User = { id: ID };
export function User({ id }: User.Props) { /* ... */ }
export namespace User {
  export type Props = { id?: ID };
  export const use = (id: ID) => { /* hook */ };
}
```

This enables usage like:
```tsx
const bob: User = { id: "bob" };           // As type
const user = User.use(id);                 // As namespace
return <User id={user.id} />;              // As component
```

#### Domain File Structure

Domains map one-to-one with file/folder structure:
```
./src/Editor/Camera/
├── Center.tsx
├── Hand.tsx
├── Reset.tsx
├── Shortcut.tsx
├── Zoom.tsx
└── index.tsx
```

Import root domains using `~` alias:
```tsx
import { ExampleDomain } from "~/ExampleDomain";
// Instead of: import { ExampleDomain } from "../../../../../ExampleDomain";
```

#### Plural Domains

Singular domains own individual concepts; plural domains own collections:
- `Generation.Image.Input` - owns what's fed to an image generation
- `Generation.Image.Inputs` - owns state of all inputs collectively
- `Editor.Dream` - owns a single dream concept
- `Editor.Dreams` - owns all dreams collectively

### Critical Domains

Located in `packages/comfystudio-ui/src/`:

- **`App`** - App-level functionality, React root, sidebars, providers
- **`Generation.Image`** - Largest domain, owns all image generation concepts
- **`Generation.Image.Session`** - Manages active image generation session (note: poorly named, grew too large)
- **`Editor`** - All editor functionality including canvas, camera, tools
- **`Plugin`** - Plugin system setup and access; contains critical `Plugin.use` hook
- **`Theme`** - Design system and common components (`Theme.Icon`, `Theme.Button`, etc.)
- **`Shortcut`** - Keyboard shortcut system and menu
- **`GlobalState`** - Wrapper around Zustand for state management
- **`GlobalVariables`** - Auto-imported utilities (`css`, `classes`, `useEffect`, etc.)
- **`Dock`** - Docking panel system for UI layout
- **`Tools`** - Tool registry and tool-related functionality

### Declarative Tool System

ComfyStudio uses a **convention-based, type-safe, declarative tool system** that automatically discovers and loads tools from the `Tools/definitions/` directory. This system separates tool definitions (pure data) from implementations (behavior), enabling tools to be added simply by creating new definition files.

#### Key Benefits

- **Convention-based auto-discovery**: No manual registration required
- **Type-safe**: Full TypeScript support with discriminated unions
- **Auto-rendering UI**: Settings panels generate automatically
- **Isolated state**: Per-tool, per-setting state management
- **Integration-friendly**: Wraps existing code without duplication

See architectural decision records in `docs/adr/` for design rationale:
- **ADR-0001**: Convention-based tool discovery (tool ID = filename)
- **ADR-0002**: Tool definition structure and setting types
- **ADR-0003**: Tool categories using discriminated unions

#### Creating a New Tool

To add a new tool, create a definition file in `Tools/definitions/`:

**Critical convention**: Tool ID must exactly match the filename (kebab-case).

```tsx
// packages/comfystudio-ui/src/Tools/definitions/my-tool.ts
import { CanvasInteractionTool } from "../Types";

const myTool: CanvasInteractionTool = {
  id: "my-tool",  // MUST match filename
  name: "My Tool",
  description: "Tool description shown in UI",
  icon: "IconName",  // From lucide-react icons
  shortcut: "m",     // Optional keyboard shortcut
  category: "canvas-interaction",
  settings: [
    {
      id: "size",
      type: "slider",
      label: "Size",
      description: "Helpful description for users",
      min: 1,
      max: 100,
      step: 1,
      default: 20,
    },
  ],
};

export default myTool;
```

The tool will be automatically discovered and loaded by `Tools/Registry.ts`.

#### Tool Categories

Tools are organized into three categories using TypeScript discriminated unions:

##### Canvas Interaction Tools

Tools that interact with the canvas (drawing, erasing, etc.):

```tsx
import { CanvasInteractionTool } from "../Types";

const brushTool: CanvasInteractionTool = {
  id: "brush",
  name: "Eraser",
  description: "Remove pixels from images by painting over them",
  icon: "Eraser",
  shortcut: "e",
  category: "canvas-interaction",
  cursor: "custom",           // Optional: "crosshair" | "default" | "custom"
  cursorComponent: "BrushCursor",  // Optional: Component name for custom cursor
  settings: [/* ... */],
};

export default brushTool;
```

##### Workflow Tools

Tools that execute ComfyUI workflows:

```tsx
import { WorkflowTool } from "../Types";

const generateTool: WorkflowTool = {
  id: "generate",
  name: "Generate",
  description: "Generate images using AI models",
  icon: "Sparkles",
  shortcut: "g",
  category: "workflow",
  workflow: "txt2img",        // ComfyUI workflow name
  inputMapping: {             // Optional: Map settings to workflow inputs
    "prompt": "positive",
    "negativePrompt": "negative",
  },
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
        { value: "dpmpp_2m", label: "DPM++ 2M" },
      ],
      default: "euler",
    },
  ],
};

export default generateTool;
```

##### Selection Tools

Tools for selecting and manipulating canvas entities:

```tsx
import { SelectionTool } from "../Types";

const selectTool: SelectionTool = {
  id: "select",
  name: "Select",
  description: "Select and manipulate canvas entities",
  icon: "MousePointer",
  shortcut: "v",
  category: "selection",
  multiSelect: true,  // Optional: Enable multi-selection
};

export default selectTool;
```

#### Setting Types

Tools can have five types of settings, all of which auto-render in the UI:

##### Slider

```tsx
{
  id: "size",
  type: "slider",
  label: "Size",
  description: "Optional helpful description",
  min: 1,
  max: 100,
  step: 1,      // Optional: defaults to 1
  default: 20,
}
```

##### Text and Textarea

```tsx
{
  id: "prompt",
  type: "textarea",  // or "text" for single-line
  label: "Prompt",
  placeholder: "Optional placeholder text",
  maxLength: 500,    // Optional
  default: "",
}
```

##### Dropdown

```tsx
{
  id: "sampler",
  type: "dropdown",
  label: "Sampler",
  options: [
    { value: "euler", label: "Euler" },
    { value: "dpmpp_2m", label: "DPM++ 2M" },
  ],
  default: "euler",
}
```

##### Checkbox

```tsx
{
  id: "enabled",
  type: "checkbox",
  label: "Enable Feature",
  description: "Toggle this feature on/off",
  default: false,
}
```

##### Custom

```tsx
{
  id: "advanced",
  type: "custom",
  label: "Advanced Options",
  component: "AdvancedSettings",  // Component name to render
  props: {                        // Optional props for component
    mode: "expert",
  },
}
```

#### Tool Implementation

Create an optional implementation file to provide custom behavior:

```tsx
// packages/comfystudio-ui/src/Tools/implementations/my-tool.ts
import { ToolImplementation } from "../Types";
import { MyToolPanel } from "~/MyFeature/ToolPanel";

const implementation: ToolImplementation = {
  // Optional: Custom settings panel component
  SettingsPanel: MyToolPanel,

  // Optional: Called when tool is activated
  onActivate: () => {
    console.log("Tool activated");
  },

  // Optional: Called when tool is deactivated
  onDeactivate: () => {
    console.log("Tool deactivated");
  },

  // Optional: Canvas event handlers
  onMouseDown: (e) => { /* handle mouse down */ },
  onMouseMove: (e) => { /* handle mouse move */ },
  onMouseUp: (e) => { /* handle mouse up */ },

  // Optional: For workflow tools
  executeWorkflow: async (settings) => {
    // Execute ComfyUI workflow with settings
  },
};

export default implementation;
```

**Integration pattern**: Use implementations to wrap existing functionality rather than duplicating it. See `Tools/implementations/brush.ts` which simply references `Editor.Brush.Sidebar.Section`:

```tsx
import { Editor } from "~/Editor";
import { ToolImplementation } from "../Types";

const brushImplementation: ToolImplementation = {
  SettingsPanel: Editor.Brush.Sidebar.Section,
  // Existing brush handles its own canvas events
};

export default brushImplementation;
```

#### State Management

Tool settings are stored in isolated per-tool, per-setting state using Zustand:

```tsx
import { ToolState } from "~/Tools/State";

function MyComponent() {
  // Get current value for a setting
  const [size, setSize] = ToolState.useToolSetting("my-tool", "size");

  // Use the value
  console.log(size);  // 20 (default value)

  // Update the value
  setSize(50);
}
```

Defaults are automatically initialized from tool definitions when first accessed. State is persisted per-tool, so switching tools maintains their settings.

#### Key Files

- **`Tools/Types.ts`** - Type definitions for all tool types and settings
- **`Tools/Registry.ts`** - Convention-based discovery and loading logic
- **`Tools/State.ts`** - Zustand-based state management
- **`Tools/SettingRenderer.tsx`** - Auto-renders settings UI from definitions
- **`Tools/definitions/`** - Tool definition files (pure data)
- **`Tools/implementations/`** - Tool implementations (behavior)
- **`Tools/integration.test.tsx`** - Integration tests for the tool system

#### Conventions

- **Tool ID = filename**: `my-tool.ts` must export tool with `id: "my-tool"`
- **Definitions are pure data**: No logic, only configuration
- **Implementations contain behavior**: All logic goes in implementation files
- **Settings are isolated**: Each tool's settings don't affect other tools
- **Auto-discovery**: Just create the file, no manual registration needed
- **Type safety**: Use discriminated unions for tool categories

#### Testing

Integration tests verify the entire system in `Tools/integration.test.tsx`:

```bash
yarn comfystudio-ui test Tools/integration.test.tsx
```

Tests cover:
- Tool discovery from definitions
- Setting default initialization
- State isolation between tools
- Setting renderer for all types
- Implementation wrapper integration

### Plugin Architecture

Plugins are experimental and enable different inference backends. Key plugins:

- **`comfystudio-plugin-comfyui`** (default) - Connects to local ComfyUI
- **`comfystudio-plugin-stability`** - Uses Stability AI API
- **`comfystudio-plugin-webui`** - Connects to stable-diffusion-webui
- **`comfystudio-plugin-example`** - Development template with hot reloading

Plugins export JavaScript functions that ComfyStudio calls for core functionality:
- `createStableDiffusionImages`
- `getStableDiffusionStyles`
- `getStableDiffusionDefaultInput`

Functionality degrades gracefully - missing functions just hide related UI.

### State Management

Uses **Zustand** (fast, lightweight) via `GlobalState` wrapper:

```tsx
export namespace Count {
  // Export hooks, not state directly
  export const use = State.use(({ count }) => count);
  export const useSet = () =>
    State.use(({ setCount }) => setCount, GlobalState.shallow);
}

type State = {
  count: number;
  setCount: (count: number) => void;
};

namespace State {
  const store = GlobalState.create<State>((set) => ({
    count: 0,
    setCount: (count) => set({ count }),
  }));
  export const use = store;
}
```

Use `GlobalState.shallow` to limit rerenders when selecting multiple state slices.

### Technology Stack

- **TypeScript** - Strict mode enabled
- **React** - Modern hooks and functional components
- **Vite** - Build tool and dev server (port 3000)
- **Zustand** - State management
- **Tailwind CSS** - Primary styling method
- **Emotion** - Raw CSS when needed (use `css` function)
- **Konva/React-Konva** - Canvas rendering for editor
- **React Query** - Server state management
- **Vitest** - Testing framework

## Code Conventions

### Styling

1. **Prefer Tailwind** - Use Tailwind classes for most styling
2. **Check Theme domain** - Look for pre-made components before creating new ones
3. **Use `classes` helper** - For conditional or complex class names:
   ```tsx
   className={classes(
     "bg-gray-100",
     isEmphasized && "bg-red-500 text-4xl font-bold",
     isDisabled && "text-xs opacity-50"
   )}
   ```
4. **Break glass with `css`** - Only when Tailwind can't handle it:
   ```tsx
   css={css`::-webkit-scrollbar { display: none; }`}
   ```

### Code Quality

- Unused variables/args: Prefix with `_` to suppress linting errors
- React hooks rules: Disabled (`react-hooks/rules-of-hooks: off`)
- Emotion `css` prop: Allowed on all elements
- Import ordering: Enforced alphabetically with groups (builtin, external, parent, sibling)
- TypeScript namespaces: Allowed (non-standard but core to DDD pattern)

### Anti-Patterns to Avoid

- ❌ Don't create domains for every single concept - only when there's repeated reference
- ❌ Don't break the fractal structure - keep related domains together
- ❌ Don't export state directly - export hooks that access state
- ❌ Don't use `../` imports for root domains - use `~/` alias
- ❌ Don't create new files when functionality fits in existing domains

## ComfyUI Integration

### Requirements

- ComfyUI must run with CORS enabled: `python main.py --enable-cors-header`
- Default ComfyUI URL: `http://127.0.0.1:8188`
- Uses REST API for workflow queueing and WebSocket for progress updates

### Workflow Types

Plugin builds ComfyUI workflow graphs for:
- **txt2img**: Text prompt to image
- **img2img**: Image transformation with prompt
- **inpainting**: Masked region editing

Common nodes: `CheckpointLoader`, `CLIPTextEncode`, `KSampler`, `VAEDecode`, `SaveImage`

## Testing

Test files use Vitest and are colocated with source:
```bash
# Run all tests
yarn comfystudio-ui test

# Test files named: *.test.ts or *.test.tsx
```

## Environment Variables

Set via Vite environment variables (prefix with `VITE_`):
- `VITE_USE_EXAMPLE_PLUGIN` - Load example plugin
- `VITE_USE_WEBUI_PLUGIN` - Load webui plugin
- `VITE_USE_STABILITY_PLUGIN` - Load Stability plugin
- `VITE_GIT_HASH` - Auto-injected git commit hash

## Workflow Execution System

ComfyStudio has a production-grade workflow execution system in `src/execution/` with **306 comprehensive tests**. This system manages the full lifecycle of ComfyUI workflow executions from canvas interaction to completion.

### Architecture Principles

1. **Files-as-Truth**: History Store is the single source of truth. All execution state is persisted to JSONL files (`executions/{toolId}.jsonl`). UI can restart and fully rehydrate from history.

2. **Observation Boundary**: UI never mutates execution state directly. Uses Event → Command pattern:
   - UI dispatches commands (intent): `startExecution()`, `cancelExecution()`
   - Runner owns truth (state transitions): Validates, submits, polls, records
   - UI observes outcome: Via snapshots and events

3. **Deterministic State Machine**: 7-state FSM with unidirectional flow:
   ```
   idle → armed → queued → executing → (completed | failed | cancelled)
   ```

4. **Pure Functions**: Core logic has no side effects:
   - Adapter: Pure mapping (execution → ComfyUI prompt)
   - State transitions: Pure FSM (no I/O)
   - Spatial capture: Pure coordinate transforms

### Module Structure

```
src/execution/
├── types/              # Contract types (discriminated unions)
├── state/              # Pure FSM + queue policies + revision tracking
├── history/            # JSONL persistence (crash-resistant, atomic writes)
├── adapters/comfyui/   # Pure ComfyUI adapter (deterministic mapping)
├── runner/             # Runner lifecycle (submit → poll → terminal)
├── spatial/            # Spatial input capture (normalized coordinates)
├── service.ts          # Service orchestration layer
└── ui/                 # React hooks + visualization + progress
```

### Usage Patterns

**Initialize service** (once on app startup):
```typescript
import { createExecutionService, setExecutionService } from "~/execution";

const service = createExecutionService(runner, history, config);
setExecutionService(service);
await service.rehydrate(); // Restore state from history
```

**Use in components**:
```typescript
import { useExecutionCommands, useExecutionState, useExecutionOverlays } from "~/execution/ui";

function MyComponent() {
  const { startExecution, cancelExecution } = useExecutionCommands();
  const state = useExecutionState(); // Read-only
  const overlays = useExecutionOverlays(); // Visual state for canvas

  const handleStart = async () => {
    const result = await startExecution({
      id: "exec-123",
      toolId: "generate",
      state: "idle",
      settings: { prompt: "A landscape" },
      workflow: "txt2img",
    });
  };
}
```

**Capture spatial input**:
```typescript
import { capturePoint, captureSelection } from "~/execution/spatial";

// Captures canvas interaction and normalizes to 0-1 range
const result = capturePoint({ x: 500, y: 400 }, {
  toolId: "inpaint",
  reason: "explicit",
  currentRevision: 0,
  transform: { position, scale, dimensions },
});

if (result.ok) {
  // result.snapshot.data: { type: "point", data: { x: 0.26, y: 0.37 } }
}
```

### Key Features

- **Crash-Resistant History**: JSONL with atomic writes, fsync, temp files
- **Spatial Input Capture**: Normalized coordinates (0-1 range), pan/zoom invariant
- **Revision Tracking**: Interaction tools always increment, explicit tools only on data change
- **Visualization Overlays**: Canvas overlays with bounds, colors, progress
- **Progress Indicators**: Deterministic progress from timestamps (no estimations)
- **Cancellation**: Best-effort with terminal immutability (first terminal state wins)
- **Recovery**: N consecutive missing job confirmations before failing

### Testing

```bash
# Run all execution tests (306 tests)
yarn test src/execution --run

# Specific test suites
yarn test src/execution/state       # FSM, policies, revisions (67 tests)
yarn test src/execution/history     # JSONL, replay, prune (65 tests)
yarn test src/execution/runner      # Lifecycle, cancel, recovery (61 tests)
yarn test src/execution/spatial     # Coordinate capture (35 tests)
yarn test src/execution/ui          # Hooks, visualization, progress (70 tests)
```

### Integration Notes

The execution system is **ready for integration** but not yet wired into the existing UI. Integration work needed:

1. Initialize service on app startup
2. Wire tool triggers to `startExecution()`
3. Capture spatial input from canvas interactions
4. Render execution overlays on canvas
5. Display progress indicators in UI
6. Handle execution events (toasts, notifications)

See `src/execution/README.md` for comprehensive documentation.

## Project History Context

- Originally DreamStudio (Vue.js → React rewrite in Dec 2022)
- Forked to ComfyStudio to focus on open-source ComfyUI integration
- Plugin system created to support multiple inference backends
- Recent work focuses on dock-based UI architecture (see `docs/plans/`)
- **2026-01**: Production-grade workflow execution system (M0-M4, 306 tests)
