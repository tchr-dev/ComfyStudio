# Background Tools (Mock UI) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a DreamStudio-style Edit tool rail with Remove BG and Replace BG modes, plus interactive mock actions.

**Architecture:** Introduce an Edit Tool Registry and active tool state in the UI, render tool buttons from the registry, and switch the left sidebar into a dedicated tool mode. Mock actions live in `Editor.Background` and only manipulate editor entities without backend calls.

**Tech Stack:** React, TypeScript, Zustand (GlobalState), Tailwind

---

### Task 1: Add Edit Tool Registry and Active Tool State

**Files:**
- Create: `packages/comfystudio-ui/src/Editor/EditTool/index.tsx`
- Modify: `packages/comfystudio-ui/src/Editor/index.tsx`
- Test: `scripts/test-edit-tool-registry.js`

**Step 1: Write the failing test**

```js
// scripts/test-edit-tool-registry.js
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

require("tsx/cjs");

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request.startsWith("~/")) {
    const resolved = path.join(
      __dirname,
      "..",
      "packages",
      "comfystudio-ui",
      "src",
      request.slice(2)
    );
    return originalResolveFilename.call(this, resolved, parent, isMain, options);
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const { EditTool } = require("../packages/comfystudio-ui/src/Editor/EditTool");

const tools = EditTool.getEnabled();
assert.ok(Array.isArray(tools));
assert.ok(tools.some((tool) => tool.id === "remove-bg"));
assert.ok(tools.some((tool) => tool.id === "replace-bg"));

console.log("ok");
```

**Step 2: Run test to verify it fails**

Run: `node scripts/test-edit-tool-registry.js`
Expected: FAIL with "Cannot find module" or missing export

**Step 3: Write minimal implementation**

```tsx
// packages/comfystudio-ui/src/Editor/EditTool/index.tsx
import { GlobalState } from "~/GlobalState";
import { Theme } from "~/Theme";

export type EditToolDefinition = {
  id: "remove-bg" | "replace-bg";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
};

const registry: EditToolDefinition[] = [
  { id: "remove-bg", label: "Remove BG", icon: Theme.Icon.Eraser, enabled: true },
  { id: "replace-bg", label: "Replace BG", icon: Theme.Icon.Edit, enabled: true },
];

export namespace EditTool {
  export const getEnabled = () => registry.filter((tool) => tool.enabled);

  export type Active = EditToolDefinition["id"] | undefined;
  export const useActive = GlobalState.create<{ active?: Active; setActive: (active?: Active) => void }>((set) => ({
    active: undefined,
    setActive: (active) => set({ active }),
  }));
}
```

**Step 4: Run test to verify it passes**

Run: `node scripts/test-edit-tool-registry.js`
Expected: PASS with "ok"

**Step 5: Commit**

```bash
git add scripts/test-edit-tool-registry.js packages/comfystudio-ui/src/Editor/EditTool/index.tsx packages/comfystudio-ui/src/Editor/index.tsx
git commit -m "feat(ui): add edit tool registry"
```

---

### Task 2: Render the Edit Tool Rail and Active State

**Files:**
- Create: `packages/comfystudio-ui/src/Editor/EditTool/Rail.tsx`
- Modify: `packages/comfystudio-ui/src/Editor/Sidebar/index.tsx`
- Test: Manual

**Step 1: Write the failing test**

Manual expectation: No tool rail exists yet, so no buttons appear.

**Step 2: Run test to verify it fails**

Run the app and confirm the rail is missing in Edit mode.

**Step 3: Write minimal implementation**

```tsx
// packages/comfystudio-ui/src/Editor/EditTool/Rail.tsx
import { Editor } from "~/Editor";
import { Theme } from "~/Theme";

export function Rail() {
  const tools = Editor.EditTool.getEnabled();
  const { active, setActive } = Editor.EditTool.useActive();

  return (
    <div className="flex flex-col gap-2 px-2 py-3">
      {tools.map((tool) => (
        <Theme.Button
          key={tool.id}
          icon={tool.icon}
          active={tool.id === active}
          onClick={() => setActive(tool.id)}
          className="h-10 w-10"
        />
      ))}
    </div>
  );
}
```

Then, in `packages/comfystudio-ui/src/Editor/Sidebar/index.tsx`, render `<Editor.EditTool.Rail />` near the top of the left sidebar tab content for Edit mode.

**Step 4: Run test to verify it passes**

Run the app, go to Edit mode, and confirm the two new rail buttons appear and toggle active state.

**Step 5: Commit**

```bash
git add packages/comfystudio-ui/src/Editor/EditTool/Rail.tsx packages/comfystudio-ui/src/Editor/Sidebar/index.tsx

git commit -m "feat(ui): add edit tool rail"
```

---

### Task 3: Add Tool-Specific Sidebar Modes and Mock Actions

**Files:**
- Create: `packages/comfystudio-ui/src/Editor/Background/index.tsx`
- Modify: `packages/comfystudio-ui/src/Editor/Sidebar/index.tsx`
- Test: Manual

**Step 1: Write the failing test**

Manual expectation: Remove BG/Replace BG actions are missing.

**Step 2: Run test to verify it fails**

Run the app and confirm there is no action block for either tool.

**Step 3: Write minimal implementation**

```tsx
// packages/comfystudio-ui/src/Editor/Background/index.tsx
import { Editor } from "~/Editor";

export namespace Background {
  export const useSelectedImage = () => {
    const selectedID = Editor.Selection.OnlyOne.use();
    const entities = Editor.Entities.use();
    const image = useMemo(
      () =>
        selectedID
          ? (entities.find((entity) => entity.id === selectedID) as
              | Editor.Image
              | undefined)
          : undefined,
      [entities, selectedID]
    );
    return { selectedID, image };
  };

  export const useMockDuplicate = (label: string) => {
    const { selectedID, image } = useSelectedImage();
    const createImage = Editor.Image.Create.useFromURL();

    return useCallback(async () => {
      if (!image || !image.element?.src) return;
      await createImage(image.element.src, {
        ...image,
        id: ID.create(),
        title: `${image.title ?? "Image"} (${label})`,
        x: image.x + 20,
        y: image.y + 20,
      });
    }, [image, createImage, label]);
  };
}
```

In `packages/comfystudio-ui/src/Editor/Sidebar/index.tsx`, use the active edit tool to toggle content:
- For `remove-bg`: hide Prompt/Settings and show a single action block.
- For `replace-bg`: keep Prompt/Settings visible, add a Replace BG action block. When a selected image has no input, fall back to the current session input id for prompt/settings; if no session input exists, hide the prompt/settings tab.

**Step 4: Run test to verify it passes**

- Select a single image, choose Remove BG, click action, see a duplicated layer labeled "(Mock Remove BG)".
- Choose Replace BG, prompt remains visible, action duplicates with "(Mock Replace BG)".

**Step 5: Commit**

```bash
git add packages/comfystudio-ui/src/Editor/Background/index.tsx packages/comfystudio-ui/src/Editor/Sidebar/index.tsx

git commit -m "feat(ui): add mock remove/replace background actions"
```

---

### Task 4: Manual QA Checklist

**Files:**
- No code changes

**Step 1: Run the app**

Run: `yarn dev`

**Step 2: Verify behavior**

- Edit mode shows rail with Remove BG + Replace BG.
- Remove BG hides prompt and shows only action block.
- Replace BG keeps prompt/settings and shows action block.
- Actions require a single selected image.
- Mock results add a new image layer offset from original.

**Step 3: Commit QA notes (optional)**

If documenting results, add a note to `docs/plans/2026-01-26-background-tools-mock.md`.
