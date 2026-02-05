# Dockable Supercontrols Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Generate/Edit sidebar tabs with a unified dock system and add a filesystem-backed Tools dock as the primary entry point for tool discovery and execution.

**Architecture:** Introduce a small dock layout framework (layout + column + panel + registry) and refactor existing sidebar sections into dock panels. The dock state (order/open/column) is persisted locally and panels are shown/hidden based on app context.

**Tech Stack:** React + TypeScript, existing UI component library, localStorage.

---

### Task 0: Add minimal test tooling for UI

**Files:**
- Modify: `packages/comfystudio-ui/package.json`
- Create: `packages/comfystudio-ui/vitest.config.ts`
- Create: `packages/comfystudio-ui/src/test/setup.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

describe("test setup", () => {
  it("runs vitest", () => {
    expect(true).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `yarn workspace @comfystudio/ui test --run`
Expected: FAIL with "Unknown command 'test'".

**Step 3: Write minimal implementation**

```json
{
  "scripts": {
    "test": "vitest"
  },
  "devDependencies": {
    "jsdom": "^24.0.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0"
  }
}
```

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

```ts
import "@testing-library/jest-dom";
```

**Step 4: Run test to verify it passes**

Run: `yarn workspace @comfystudio/ui test --run`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/comfystudio-ui/package.json packages/comfystudio-ui/vitest.config.ts packages/comfystudio-ui/src/test/setup.ts
 git commit -m "test(ui): add vitest setup"
```

---

### Task 1: Create dock layout primitives

**Files:**
- Create: `packages/comfystudio-ui/src/Dock/index.tsx`
- Create: `packages/comfystudio-ui/src/Dock/DockLayout.tsx`
- Create: `packages/comfystudio-ui/src/Dock/Column.tsx`
- Create: `packages/comfystudio-ui/src/Dock/Panel.tsx`
- Create: `packages/comfystudio-ui/src/Dock/State.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { DockState } from "~/Dock/State";

describe("DockState", () => {
  it("initializes with default panels", () => {
    const state = DockState.createDefault();
    expect(state.panels.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `yarn workspace @comfystudio/ui test --run`
Expected: FAIL with "test script not found" (will be added in a later task).

**Step 3: Write minimal implementation**

```ts
export type DockPanelState = {
  id: string;
  column: "left" | "right";
  order: number;
  open: boolean;
};

export type DockLayoutState = {
  panels: DockPanelState[];
};

export namespace DockState {
  export const createDefault = (): DockLayoutState => ({
    panels: [],
  });
}
```

**Step 4: Run test to verify it passes**

Run: `yarn workspace @comfystudio/ui test --run`
Expected: Still FAIL until test tooling is added (resolved in Task 0).

**Step 5: Commit**

```bash
git add packages/comfystudio-ui/src/Dock
git commit -m "feat(ui): add dock layout primitives"
```

---

### Task 2: Add dock layout rendering and persistence

**Files:**
- Modify: `packages/comfystudio-ui/src/Dock/State.ts`
- Modify: `packages/comfystudio-ui/src/Dock/DockLayout.tsx`
- Modify: `packages/comfystudio-ui/src/Dock/Panel.tsx`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { DockState } from "~/Dock/State";

describe("DockState persistence", () => {
  it("hydrates from localStorage", () => {
    localStorage.setItem("dock-layout.v1", JSON.stringify({ panels: [{ id: "tools", column: "left", order: 0, open: true }] }));
    const state = DockState.load();
    expect(state.panels[0].id).toBe("tools");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `yarn workspace @comfystudio/ui test --run`
Expected: FAIL until `DockState.load()` is implemented and test tooling exists.

**Step 3: Write minimal implementation**

```ts
const STORAGE_KEY = "dock-layout.v1";

export namespace DockState {
  export const load = (): DockLayoutState => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefault();
    try {
      return JSON.parse(raw) as DockLayoutState;
    } catch {
      return createDefault();
    }
  };

  export const save = (state: DockLayoutState): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };
}
```

**Step 4: Run test to verify it passes**

Run: `yarn workspace @comfystudio/ui test --run`
Expected: Still FAIL until Task 0 adds testing setup.

**Step 5: Commit**

```bash
git add packages/comfystudio-ui/src/Dock/State.ts
git commit -m "feat(ui): persist dock layout state"
```

---

### Task 3: Extract existing sidebar content into dock panels

**Files:**
- Create: `packages/comfystudio-ui/src/Dock/Panels/PromptPanel.tsx`
- Create: `packages/comfystudio-ui/src/Dock/Panels/InputPanel.tsx`
- Create: `packages/comfystudio-ui/src/Dock/Panels/AdvancedPanel.tsx`
- Create: `packages/comfystudio-ui/src/Dock/Panels/EditorToolPanel.tsx`
- Create: `packages/comfystudio-ui/src/Dock/Panels/LayersPanel.tsx`
- Modify: `packages/comfystudio-ui/src/Generation/Image/Sidebar/index.tsx`
- Modify: `packages/comfystudio-ui/src/Editor/Sidebar/index.tsx`

**Step 1: Write the failing test**

```tsx
import React from "react";
import { describe, expect, it } from "vitest";
import { PromptPanel } from "~/Dock/Panels/PromptPanel";

describe("PromptPanel", () => {
  it("returns a React element", () => {
    const element = PromptPanel({ inputId: "test" });
    expect(React.isValidElement(element)).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `yarn workspace @comfystudio/ui test --run`
Expected: FAIL until panel components and testing setup exist.

**Step 3: Write minimal implementation**

```tsx
export function PromptPanel({ inputId }: { inputId: ID }) {
  return <Generation.Image.Prompt.Sidebar.Section id={inputId} />;
}
```

**Step 4: Run test to verify it passes**

Run: `yarn workspace @comfystudio/ui test --run`
Expected: Still FAIL until Task 0 adds testing setup.

**Step 5: Commit**

```bash
git add packages/comfystudio-ui/src/Dock/Panels
 git commit -m "feat(ui): extract sidebar panels for docking"
```

---

### Task 4: Add Tools dock (filesystem-backed list stub)

**Files:**
- Create: `packages/comfystudio-ui/src/Dock/Panels/ToolsPanel.tsx`
- Create: `packages/comfystudio-ui/src/Tools/Registry.ts`
- Create: `packages/comfystudio-ui/src/Tools/Types.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { ToolRegistry } from "~/Tools/Registry";

describe("ToolRegistry", () => {
  it("returns an empty list when no backend is configured", async () => {
    const tools = await ToolRegistry.list();
    expect(tools).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `yarn workspace @comfystudio/ui test --run`
Expected: FAIL until registry exists and test tooling exists.

**Step 3: Write minimal implementation**

```ts
export namespace ToolRegistry {
  export const list = async () => [];
}
```

**Step 4: Run test to verify it passes**

Run: `yarn workspace @comfystudio/ui test --run`
Expected: Still FAIL until Task 0 adds testing setup.

**Step 5: Commit**

```bash
git add packages/comfystudio-ui/src/Tools packages/comfystudio-ui/src/Dock/Panels/ToolsPanel.tsx
 git commit -m "feat(ui): add tools dock stub"
```

---

### Task 5: Replace sidebar tabs with unified dock layout

**Files:**
- Modify: `packages/comfystudio-ui/src/Dock/DockLayout.tsx`
- Modify: `packages/comfystudio-ui/src/App/Sidebar/Sidebars.tsx`
- Modify: `packages/comfystudio-ui/src/App/index.tsx`
- Modify: `packages/comfystudio-ui/src/App/BottomBar/index.tsx`
- Modify: `packages/comfystudio-ui/src/Generation/Image/Sidebar/index.tsx`
- Modify: `packages/comfystudio-ui/src/Editor/Sidebar/index.tsx`

**Step 1: Write the failing test**

```tsx
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { DockLayout } from "~/Dock/DockLayout";

describe("DockLayout", () => {
  it("renders the tools panel", () => {
    const { getByText } = render(<DockLayout />);
    expect(getByText(/tools/i)).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `yarn workspace @comfystudio/ui test --run`
Expected: FAIL until DockLayout is wired and testing setup exists.

**Step 3: Write minimal implementation**

```tsx
export function DockLayout() {
  return (
    <Dock.Column position="left">
      <Dock.Panel title="Tools"><ToolsPanel /></Dock.Panel>
    </Dock.Column>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `yarn workspace @comfystudio/ui test --run`
Expected: Still FAIL until Task 0 adds testing setup.

**Step 5: Commit**

```bash
git add packages/comfystudio-ui/src/Dock packages/comfystudio-ui/src/App
 git commit -m "feat(ui): replace sidebar tabs with dock layout"
```

---

### Task 6: Wire dock panels to context and visibility rules

**Files:**
- Modify: `packages/comfystudio-ui/src/Dock/DockLayout.tsx`
- Modify: `packages/comfystudio-ui/src/Dock/State.ts`
- Modify: `packages/comfystudio-ui/src/Dock/Panels/EditorToolPanel.tsx`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { isPanelVisible } from "~/Dock/State";

describe("Dock visibility", () => {
  it("hides editor tool panel when no brush tool is active", () => {
    const visible = isPanelVisible("editor-tool", { activeTool: "select" });
    expect(visible).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `yarn workspace @comfystudio/ui test --run`
Expected: FAIL until `isPanelVisible` exists and testing setup exists.

**Step 3: Write minimal implementation**

```ts
export const isPanelVisible = (
  panelId: string,
  ctx: { activeTool?: string }
) => {
  if (panelId === "editor-tool") return ctx.activeTool === "brush";
  return true;
};
```

**Step 4: Run test to verify it passes**

Run: `yarn workspace @comfystudio/ui test --run`
Expected: Still FAIL until Task 0 adds testing setup.

**Step 5: Commit**

```bash
git add packages/comfystudio-ui/src/Dock/State.ts
 git commit -m "feat(ui): add dock panel visibility rules"
```

---

### Task 8: Remove sidebar tab wiring and tidy references

**Files:**
- Modify: `packages/comfystudio-ui/src/Generation/Image/Sidebar/index.tsx`
- Modify: `packages/comfystudio-ui/src/Editor/Sidebar/index.tsx`
- Modify: `packages/comfystudio-ui/src/App/Sidebar/Tab/*`
- Modify: `packages/comfystudio-ui/src/App/Sidebar/Sidebars.tsx`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { App } from "~/App";

describe("Dock-only sidebar", () => {
  it("renders without sidebar tabs", () => {
    const { queryByText } = render(<App />);
    expect(queryByText(/Generate/i)).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `yarn workspace @comfystudio/ui test --run`
Expected: FAIL until tab UI is removed/hidden.

**Step 3: Write minimal implementation**

```tsx
export function Sidebars() {
  return <DockLayout />;
}
```

**Step 4: Run test to verify it passes**

Run: `yarn workspace @comfystudio/ui test --run`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/comfystudio-ui/src/App/Sidebar packages/comfystudio-ui/src/Generation/Image/Sidebar packages/comfystudio-ui/src/Editor/Sidebar
 git commit -m "refactor(ui): remove sidebar tabs in favor of docks"
```
