# ADR-0004: Canvas-Centric Layout with Floating/Dockable Panels

**Date**: 2026-01-29
**Status**: Accepted
**Deciders**: Frontend Redesign Team

---

## Context

The current ComfyStudio layout uses a three-column design with fixed sidebars containing tools, prompts, and settings on the left, canvas in the center, and layers/dreams on the right. This creates several problems:

1. **Limited canvas space** - Fixed sidebars consume significant screen real estate
2. **Inflexible workflow** - Users cannot customize layout to their preferences
3. **Visual clutter** - All UI elements compete for attention with the canvas
4. **Poor scalability** - Adding new panels further reduces canvas space

Users need maximum canvas space for viewing and editing images, with supporting UI that adapts to their workflow rather than constraining it.

---

## Decision

We will adopt a **canvas-centric layout** where:

1. **Canvas is the primary focus** - Occupies majority of screen (~70% width, full height)
2. **All panels are floating/dockable** - Tool palette, parameters, layers, thumbnails
3. **Panels use Figma-style docking** - Can float, dock to edges, or tab-group together
4. **Canvas has infinite panning** - Like Figma, canvas can scroll infinitely
5. **Layout persists** - User's panel arrangement saved between sessions

---

## Rationale

### Canvas as Star
The canvas is where creative work happens. Everything else is supporting cast. By making the canvas the largest, most prominent element, we respect the user's attention and workflow.

### Flexibility Over Rigidity
Different users have different workflows:
- Some prefer vertical monitor layouts
- Some use dual monitors
- Some need parameters panel always visible
- Some prefer minimal UI during editing

Floating/dockable panels enable all these workflows without forcing compromises.

### Professional Tool Precedent
Industry-leading creative tools (Figma, Photoshop, DaVinci Resolve, Blender) all use flexible panel systems. Users expect this level of customization in professional tools.

### Reduced Visual Clutter
When panels float, they're visually separated from the canvas (via shadows, depth). This creates clear hierarchy and reduces cognitive load compared to everything being tightly packed.

---

## Consequences

### Positive

✅ **Maximum canvas space** - Users can work on images at comfortable sizes
✅ **Workflow flexibility** - Users customize layout to their needs
✅ **Professional appearance** - Matches expectations from other creative tools
✅ **Scalability** - New panels can be added without further constraining layout
✅ **Multi-monitor friendly** - Panels can be positioned on secondary displays

### Negative

⚠️ **Implementation complexity** - Docking system is non-trivial to build
⚠️ **Learning curve** - Users need to understand docking behavior
⚠️ **State management** - Must persist panel positions, sizes, dock states
⚠️ **Mobile/tablet challenges** - Floating panels don't translate well to small screens

### Mitigation Strategies

- **Complexity**: Use proven docking library (react-mosaic, rc-dock) or build incrementally
- **Learning curve**: Provide sensible defaults + optional tutorial on first launch
- **State management**: Use Zustand for layout state, localStorage for persistence
- **Mobile**: Provide separate responsive layout for small screens (fixed panels, stacked)

---

## Alternatives Considered

### Alternative 1: Keep Fixed Sidebar Layout
**Pros**: Simple, predictable, no docking complexity
**Cons**: Doesn't solve core problems (limited canvas space, inflexibility)
**Verdict**: Rejected - doesn't meet user needs

### Alternative 2: Collapsible Sidebars Only
**Pros**: Simpler than full docking, adds some flexibility
**Cons**: Still rigid (panels can only collapse, not reposition), limited improvement
**Verdict**: Rejected - half measure that doesn't fully solve problems

### Alternative 3: Full Modal Workflow (Panels as Modals)
**Pros**: Maximum canvas space when working, very simple implementation
**Cons**: Context switching cost (open/close modals constantly), breaks flow
**Verdict**: Rejected - too disruptive to creative workflow

### Alternative 4: VS Code Style Side Panel + Bottom Panel
**Pros**: Simpler than full floating, still flexible
**Cons**: Less flexible than Figma-style, panels compete for edge space
**Verdict**: Considered but rejected - Figma style is superior for visual tools

---

## Implementation Notes

### Default Layout (First Launch)
- Tool palette: Floating, top-right corner
- Parameters: Docked right edge
- Layers: Docked right edge, below parameters
- Thumbnails: Floating bottom-center

### Docking Behavior
- Magnetic snap within 20px of dock zones
- Visual indicators (blue outline) when hovering over dock zones
- Tab grouping when docking to existing panel headers
- Smooth animations (200ms ease-out)

### State Persistence
```typescript
interface LayoutState {
  panels: {
    [panelId: string]: {
      position: { x: number; y: number } | null; // null if docked
      size: { width: number; height: number };
      docked: 'left' | 'right' | 'top' | 'bottom' | null;
      tabGroup?: string; // ID of tab group if grouped
      visible: boolean;
    };
  };
}
```

### Responsive Breakpoints
- **Desktop** (>1280px): Full floating/docking system
- **Tablet** (768-1280px): Limited docking, some panels stacked
- **Mobile** (<768px): Fixed stacked layout, no floating

---

## References

- Figma workspace documentation
- Photoshop panel system
- react-mosaic library
- ADR-0005: Context-Aware Parameters Panel (related)

---

**Status**: Accepted
**Last Updated**: 2026-01-29
