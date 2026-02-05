# ADR-0005: Context-Aware Parameters Panel

**Date**: 2026-01-29
**Status**: Accepted
**Deciders**: Frontend Redesign Team

---

## Context

The current UI has a problem: the Prompt section is always visible in the left sidebar, even when using tools like "Select" or "Eraser" where prompts are irrelevant. This creates confusion:

1. **Irrelevant UI** - Prompt fields visible when using non-generation tools
2. **Wasted space** - Each tool's settings compete for sidebar real estate
3. **Inconsistent UX** - No clear pattern for where tool settings appear
4. **Cognitive load** - Users must mentally filter out irrelevant controls

We need a system where **the UI adapts to show only relevant controls for the active tool**.

---

## Decision

We will implement a **single context-aware Parameters Panel** that:

1. **Displays settings for the currently selected tool only**
2. **Adapts content dynamically** when user switches tools
3. **Uses consistent location** (dockable panel, default: right sidebar)
4. **Transitions smoothly** between tool contexts (crossfade animation)

### Behavior Examples

| Active Tool | Parameters Panel Shows |
|-------------|------------------------|
| Generate | Prompt, negative prompt, model, steps, CFG, seed, Generate button |
| Brush | Size, opacity, hardness, blend mode |
| Eraser | Size, opacity, hardness |
| Select | Mode, tolerance, feather |
| Remove BG | Quality setting, Remove Background button |
| Replace BG | Prompt for new background, Replace Background button |

---

## Rationale

### Information Scent
Users develop a mental model: "Settings for my current tool live in the Parameters panel." This single, predictable location reduces cognitive load compared to scattered controls.

### Context Over Clutter
Showing only relevant controls keeps the UI clean. Users aren't distracted by irrelevant options (e.g., prompt fields when erasing).

### Precedent in Professional Tools
- **Figma**: Right sidebar shows properties for selected object/tool
- **Photoshop**: Options bar changes based on active tool
- **Blender**: Properties panel adapts to selected object type

This pattern is proven and familiar to professional tool users.

### Scalability
Adding new tools doesn't require new UI real estate. New tool settings simply become another context in the Parameters panel.

---

## Consequences

### Positive

✅ **Reduced clutter** - Only show what's relevant right now
✅ **Predictable UX** - One place to look for tool settings
✅ **Scalable** - New tools don't add UI complexity
✅ **Flexible** - Parameters panel can dock anywhere user prefers
✅ **Professional feel** - Matches behavior of industry-leading tools

### Negative

⚠️ **Content jumping** - Panel content changes when switching tools (can be disorienting)
⚠️ **Context loss** - Can't see settings for multiple tools simultaneously
⚠️ **Implementation complexity** - Must manage tool-specific state per tool
⚠️ **Empty states** - Some tools might have minimal/no settings

### Mitigation Strategies

- **Content jumping**: Use smooth crossfade transitions (200ms) instead of instant swaps
- **Context loss**: This is actually a feature - reduces information overload
- **Implementation**: Use tool definitions system (ADR-0002) with per-tool settings schemas
- **Empty states**: Show minimal message ("No settings for this tool") or tool description

---

## Alternatives Considered

### Alternative 1: Persistent Tool Settings (Current Design)
**Pros**: All tool settings always visible, no context switching
**Cons**: Cluttered UI, irrelevant controls, doesn't scale
**Verdict**: Rejected - this is the problem we're solving

### Alternative 2: Separate Panel Per Tool
**Pros**: Can see multiple tool settings simultaneously
**Cons**: Panel explosion (5+ panels), overwhelming, poor space usage
**Verdict**: Rejected - creates more problems than it solves

### Alternative 3: Tool Settings in Floating Palette
**Pros**: Settings close to tool buttons, compact
**Cons**: Space constraints (palette should stay small), hard to show complex controls
**Verdict**: Rejected - tool palette should stay minimal

### Alternative 4: Modal Dialogs for Tool Settings
**Pros**: Maximum canvas space, very simple
**Cons**: Constant modal opening/closing, breaks creative flow
**Verdict**: Rejected - too disruptive

### Alternative 5: Accordion Sections (All Tools in One Panel)
**Pros**: All settings available, no context switching
**Cons**: Requires scrolling, cluttered, hard to find specific tool settings
**Verdict**: Rejected - doesn't solve clutter problem

---

## Technical Implementation

### State Management

Each tool maintains its own settings state:
```typescript
interface ToolState {
  [toolId: string]: {
    [settingId: string]: any; // Setting value
  };
}

// Example:
{
  "generate": {
    "prompt": "a cute cat",
    "negativePrompt": "",
    "model": "sd-xl",
    "steps": 20,
    "cfg": 7.5
  },
  "brush": {
    "size": 20,
    "opacity": 100,
    "hardness": 50
  }
}
```

### Panel Content Rendering

```typescript
function ParametersPanel({ activeTool }: Props) {
  const toolSettings = Tools.Registry.getToolSettings(activeTool);

  return (
    <Panel header={`${activeTool.name} ${activeTool.icon}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTool.id}
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          <SettingRenderer settings={toolSettings} />
        </motion.div>
      </AnimatePresence>
    </Panel>
  );
}
```

### Tool Definition Example

```typescript
const generateTool: WorkflowTool = {
  id: "generate",
  name: "Generate",
  icon: "Sparkles",
  category: "workflow",
  settings: [
    {
      id: "prompt",
      type: "textarea",
      label: "Prompt",
      placeholder: "What do you want to see?",
      default: "",
      randomGeneration: true, // 🎲 button
    },
    {
      id: "negativePrompt",
      type: "textarea",
      label: "Negative Prompt",
      placeholder: "What to avoid...",
      default: "",
      randomGeneration: true,
    },
    // ... more settings
  ],
};
```

---

## Design Considerations

### Header Design
- Show tool name + icon in panel header
- Makes clear which tool's settings are displayed
- Example: "Generate ✨" or "Brush 🖌️"

### Transition Animation
- Crossfade (200ms cubic-bezier(0.4, 0, 0.2, 1))
- Not slide/push (preserves panel dimensions)
- Subtle enough not to distract, clear enough to signal change

### Empty State
For tools with no settings (rare):
```
┌── Select ↖️ ──────────────┐
│                           │
│    No settings for        │
│    this tool.             │
│                           │
│    Use the canvas to      │
│    make selections.       │
│                           │
└───────────────────────────┘
```

### Special Elements
- **🎲 Random generators**: Prompt fields get random generation buttons
- **Primary CTAs**: Important actions (Generate, Remove BG) get prominent button styling
- **Grouped settings**: Related settings can be grouped with subtle dividers

---

## User Experience Benefits

### Reduced Cognitive Load
Users don't have to mentally filter out irrelevant options. If it's visible, it's relevant.

### Faster Tool Switching
No need to hunt for tool-specific settings. Switch tool → settings appear automatically.

### Cleaner Workspace
Less visual noise = better focus on creative work.

### Consistent Mental Model
"Settings are in the Parameters panel" is easier to remember than "Settings for Tool X are here, Tool Y are there..."

---

## Relationship to Other ADRs

- **ADR-0001**: Convention-based tool discovery
- **ADR-0002**: Tool definition structure (settings schemas)
- **ADR-0004**: Canvas-centric layout (Parameters panel is dockable)
- **ADR-0006**: Unified tool button design (tool selection triggers panel update)

---

## References

- Figma properties panel behavior
- Photoshop options bar
- Tool System documentation (`Tools/Types.ts`)

---

**Status**: Accepted
**Last Updated**: 2026-01-29
