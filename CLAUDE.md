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

## Project History Context

- Originally DreamStudio (Vue.js → React rewrite in Dec 2022)
- Forked to ComfyStudio to focus on open-source ComfyUI integration
- Plugin system created to support multiple inference backends
- Recent work focuses on dock-based UI architecture (see `docs/plans/`)
