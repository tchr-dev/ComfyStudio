# ComfyStudio Frontend Redesign

**Date**: 2026-01-29
**Status**: Design Phase - Awaiting Implementation
**Design Philosophy**: Clean, professional, Figma-inspired interface with canvas-centric workflow

---

## Executive Summary

This document specifies a complete frontend redesign of ComfyStudio to address:
- **Inconsistent tool styling** (some tools show icons, some show hotkeys, some show neither)
- **Visual confusion** (unclear information hierarchy, cluttered layout)
- **Lack of modern aesthetic** (not professional/beautiful enough)

The redesign creates a **canvas-centric workspace** with **floating/dockable panels**, **consistent tool design**, and a **professional dark theme** inspired by Figma, Linear, and modern creative tools.

---

## Design Principles

### 1. Canvas-Centric
The canvas is the star. Everything else supports it. No competition for attention.

### 2. Clean & Minimal
Simplicity over density. ComfyUI workflows provide the density - the UI should be calm.

### 3. Professional Grade
Studio-quality aesthetic. This is a serious creative tool, not a toy.

### 4. Consistent & Predictable
Every tool follows the same pattern. Every panel behaves the same way. No surprises.

### 5. Flexible Workspace
Figma-style docking - panels can float, dock, tab together, or hide completely.

---

## Overall Layout Structure

### Default Layout (First Launch)

```
┌────────────────────────────────────────────────────────────────┐
│  [Logo]    [Connection Status]         [⌘K] [⚙] [👤]          │ Top Bar (48px)
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────┐                                          ┌───────────┐ │
│  │🔧 │                                          │Parameters │ │
│  │🎨 │                                          │           │ │
│  │🖼️ │         CANVAS AREA                     │ [Tool     │ │
│  │🔄 │         (Main focus)                     │  Settings]│ │
│  │✨ │                                          │           │ │
│  └────┘                                          ├───────────┤ │
│  Tools                                           │Layers     │ │
│  Palette                                         │           │ │
│  (floating)                                      │ [Layer 1] │ │
│                                                  │ [Layer 2] │ │
│                                                  └───────────┘ │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ [img][img][img][img] | [img][img][img][img]          │   │ Thumbnail
│  │ "cat..." 2m ago      | "dragon..." now               │   │ Strip
│  └────────────────────────────────────────────────────────┘   │ (floating)
└────────────────────────────────────────────────────────────────┘
```

### Layout Specifications

- **Canvas**: Occupies ~70% of screen width, full height (minus top bar)
- **Tool Palette**: Floating, top-right corner by default, 60px wide
- **Parameters Panel**: Docked to right sidebar, 280px wide
- **Layers Panel**: Docked below Parameters, 280px wide
- **Thumbnail Strip**: Floating bottom center, 120px tall × ~80% canvas width
- **Top Bar**: Fixed, 48px tall, spans full width

### Visual Hierarchy

- Canvas has subtle 1px border (#404040) to define boundaries
- Panels have soft shadows (2-4px blur) to float above canvas
- Background: Dark (#1E1E1E) for professional feel
- Panels: Slightly lighter (#2C2C2C) to create depth

### Flexibility

- All panels can be dragged anywhere
- Panels can dock together as tabbed groups (Figma-style)
- Panels can be hidden entirely (keyboard shortcuts to toggle)
- Layout state persists between sessions

---

## Tool Palette Design

### Problem Solved
Current tools have inconsistent styling:
- Eraser: icon + hotkey ✓
- Replace Background: icon only
- Generate: hotkey only
- Remove Background: neither icon nor hotkey
- Select: inconsistent with others

### Solution: Unified Tool Design

Every tool gets identical treatment:

**Visual Specs:**
- Size: 44×44px square (comfortable click target)
- Icon: 20×20px, centered, lucide-react style
- Hotkey badge: 12px height pill, bottom-right corner, semi-transparent
- Spacing: 4px between buttons
- Panel padding: 8px
- Border radius: 6px (medium)

**States:**
- Default: Icon in text-secondary (#A0A0A0), no background
- Hover: Background rgba(255,255,255,0.05), icon scales 1.05×, 150ms ease
- Active: 2px purple border (#7C3AED), icon in white
- Disabled: Icon in text-tertiary (#666666), no interaction

**Visual Layout:**
```
┌─────────┐
│ 🔧  e   │  ← Eraser
│ ✨  g   │  ← Generate
│ 🖼️  r   │  ← Remove BG
│ 🔄  b   │  ← Replace BG
│ ↖️  v   │  ← Select
└─────────┘
```

**Interaction:**
- Click to select tool
- Keyboard shortcut activates tool
- Tooltip on hover: full name + description
- Panel draggable from any point

---

## Parameters Panel (Context-Aware)

### Concept
Single panel that adapts to show settings for the currently selected tool.

**Benefits:**
- One consistent location for all tool controls
- No panel clutter (only show what's relevant)
- Predictable user experience
- Flexible docking/positioning

### Panel Structure

- **Header**: Tool name + icon (e.g., "Generate ✨")
- **Body**: Scrollable, tool-specific controls
- **Width**: 280px (consistent with Layers panel)
- **Background**: #2C2C2C with subtle inner shadow

### Tool-Specific Content

**Generate Tool:**
```
┌── Generate ──────────────── ✨ ┐
│                               │
│ Prompt                    🎲  │
│ ┌─────────────────────────┐  │
│ │ What do you want to see?│  │
│ └─────────────────────────┘  │
│                               │
│ Negative prompt           🎲  │
│ ┌─────────────────────────┐  │
│ │ What to avoid...        │  │
│ └─────────────────────────┘  │
│                               │
│ Model                         │
│ [Stable Diffusion XL    ▼]   │
│                               │
│ Steps                    20   │
│ ├──────●──────────────────┤  │
│                               │
│ CFG Scale               7.5   │
│ ├──────────●────────────┤    │
│                               │
│ Seed                 [Random] │
│                               │
│ ┌─────────────────────────┐  │
│ │      Generate           │  │ ← Primary CTA
│ └─────────────────────────┘  │
└───────────────────────────────┘
```

**Brush Tool:**
```
┌── Brush ────────────────── 🖌️ ┐
│                               │
│ Size                     20   │
│ ├──────●──────────────────┤  │
│                               │
│ Opacity                 100%  │
│ ├──────────────────────●─┤   │
│                               │
│ Hardness                 50%  │
│ ├────────●────────────────┤  │
│                               │
│ Blend Mode                    │
│ [Normal              ▼]      │
└───────────────────────────────┘
```

**Select Tool:**
```
┌── Select ───────────────── ↖️ ┐
│                               │
│ Mode: [Rectangle ▼]          │
│                               │
│ Tolerance               32    │
│ ├──────●──────────────────┤  │
│                               │
│ Feather                  2px  │
│ ├●────────────────────────┤  │
└───────────────────────────────┘
```

**Remove Background Tool:**
```
┌── Remove Background ──── 🖼️ ┐
│                               │
│ Quality                       │
│ [High              ▼]        │
│                               │
│ ┌─────────────────────────┐  │
│ │   Remove Background     │  │
│ └─────────────────────────┘  │
└───────────────────────────────┘
```

### Special Elements

**🎲 Random Prompt Generator:**
- Position: Top-right of Prompt/Negative Prompt textareas
- Size: 20×20px
- Function: Generates random prompt/negative prompt
- Future: Links to style presets (dramatic, photorealistic, etc.)
- Hover: Brightens, shows tooltip "Generate random prompt"

---

## Canvas Area Design

### Visual Design

- **Background**: Checkerboard pattern (16×16px squares, light/dark gray)
- **Canvas bounds**: Infinite panning (Figma-style)
- **Border**: 1px subtle (#404040) separates canvas from UI
- **Viewport controls**: Bottom-left corner, zoom level display + ±buttons

### Image Display

- **Initial placement**: Centered, fit-to-view zoom
- **Image frame**: 1px border to define edges
- **Selection handles**: 8 resize handles when Select tool active
- **Transform mode**: Bounding box + rotation handle
- **Drop shadow**: Soft 4px shadow for depth

### Canvas Interactions

- **Space + drag**: Pan canvas
- **Scroll/pinch**: Zoom in/out
- **Double-click empty**: Reset view to fit all content
- **Right-click**: Context menu (paste, import, reset view)

### Empty State

- **Visual**: Large subtle icon + text
- **Text**: "Drop an image or generate one to get started"
- **Actions**: "Import from file" button + "Generate" button
- **Animation**: Gentle fade-in, single pulse on icon (not infinite)

### Grid & Guides (Toggleable)

- Pixel grid at high zoom (>400%)
- Rulers on top/left edges
- Toggle via keyboard shortcuts

---

## Generation Results Thumbnail Strip

### Design

- **Type**: Floating filmstrip panel
- **Default position**: Bottom center, hovering above canvas
- **Dimensions**: 120px tall × 80% canvas width
- **Background**: Semi-transparent (#2C2C2CE6) with backdrop blur
- **Border radius**: 8px top corners only (anchored feel)

### Thumbnail Organization

**Batch Grouping:**
```
┌────────────────────────────────────────────┐
│ "a cute cat..." • 2 mins ago              │
│ [img] [img] [img] [img]  │  "dragon..." • now │
│                          [img] [img] [img] [img] │
└────────────────────────────────────────────┘
```

**Individual Thumbnails:**
- Size: 96×96px square
- Hover: Scale 1.05×, metadata overlay, 150ms ease
- Click: Load image onto canvas
- Right-click: Context menu (delete, export, variations)
- Selected: 2px purple border if image is on canvas
- Loading: Shimmer animation (low contrast, 2s loop)

**Batch Organization:**
- Batch header: Truncated prompt + timestamp
- Separator: Vertical line between batches
- Scroll: Horizontal, newest batches on right
- Overflow: Smooth scroll with fade indicators

### Panel Controls

- **Left**: Collapse/expand button (hide thumbnails)
- **Right**: Clear history button (trash icon)

---

## Layers Panel

### Panel Structure

- **Header**: "Layers" title + action buttons (new, delete)
- **Width**: 280px (matches Parameters panel)
- **Docking**: Below or above Parameters, or tabbed with it
- **Background**: #2C2C2C

### Layer Item Design

```
┌─────────────────────────────────┐
│ 👁️  🔒  [thumb] Layer name      │
└─────────────────────────────────┘
```

**Elements:**
- Thumbnail: 32×32px preview
- Eye icon: Toggle visibility
- Lock icon: Toggle lock (prevent edits)
- Name: Editable, truncates with ellipsis
- Height: 40px
- Selected: Purple/blue highlight background

### Layer Types

- **Image layers**: Thumbnail + name
- **Generated image**: Sparkles icon indicator
- **Background layer**: Special styling, can't delete
- **Groups**: Folder icon, collapsible (future)

### Interactions

- Click: Select layer
- Double-click name: Rename
- Drag: Reorder (vertical)
- Right-click: Context menu (duplicate, merge, export, delete)
- Opacity slider: Below selected layer

### Empty State

- "No layers yet" message
- "+" button to create first layer

---

## Top Bar / Header

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ [Logo]          [Connection Status]      [⌘K] [⚙] [👤] │
└─────────────────────────────────────────────────────────┘
```

### Specifications

- **Height**: 48px
- **Background**: #1E1E1E with 1px bottom border (#404040)

### Left Section: Branding

- **Logo**: ComfyStudio mark (32×32px) + text
- **Click**: Opens app menu (New, Open, Save, Export, Preferences)
- **Hover**: Subtle background highlight
- **No tagline**: Keep clean, credits in About

### Center Section: Connection Status

**Adaptive visibility:**
- **Connected**: Green dot + "ComfyUI Connected" (fades after 2s to just dot)
- **Connecting**: Yellow dot + "Connecting..." (stays visible)
- **Disconnected**: Red dot + "Disconnected" + click to retry (stays visible)
- **Position**: Center-left, text-secondary color
- **Hover on dot**: Expand to show full status text

### Right Section: Global Actions

**1. Shortcuts (⌘K)**
- Icon: Keyboard symbol (20×20px)
- Click: Opens command palette
- Badge: "⌘K" on hover

**2. Settings (⚙)**
- Icon: Gear/cog (20×20px)
- Click: Opens dockable settings panel
- Sections: Appearance, Hotkeys, ComfyUI Connection, Plugins

**3. Profile (👤)** *(Optional)*
- Icon: User avatar or initial (20×20px)
- Click: Account menu (logout, workspace)

**Visual Treatment:**
- Icons: 20×20px, text-secondary (#A0A0A0)
- Hover: Brighten + background rgba(255,255,255,0.05)
- Active: Purple accent (#7C3AED)
- Spacing: 8px between icons, 12px padding each

---

## Design System

### Color Palette

**Base Colors (Dark Theme):**
```css
--background: #1E1E1E;          /* Main app background */
--surface: #2C2C2C;             /* Panels, cards */
--surface-elevated: #363636;    /* Hover states, active */
--border: #404040;              /* Subtle dividers */

--accent-primary: #7C3AED;      /* Purple - primary actions, active states */
--accent-secondary: #3B82F6;    /* Blue - links, secondary actions */

--text-primary: #FFFFFF;        /* Main text */
--text-secondary: #A0A0A0;      /* Muted text, placeholders */
--text-tertiary: #666666;       /* Disabled states */
```

**Semantic Colors:**
```css
--success: #10B981;             /* Green */
--warning: #F59E0B;             /* Amber */
--error: #EF4444;               /* Red */
```

**Overlays:**
```css
--hover-overlay: rgba(255,255,255,0.05);
--active-overlay: rgba(124,58,237,0.1);
```

### Typography

**Font Family:**
```css
--font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Font Sizes:**
```css
--text-heading: 16px;           /* Headings, semi-bold */
--text-body: 14px;              /* Body text, regular */
--text-small: 12px;             /* Labels, captions */
--text-tiny: 11px;              /* Hotkey badges, timestamps */
```

**Font Weights:**
```css
--weight-regular: 400;
--weight-medium: 500;
--weight-semibold: 600;
```

**Line Height & Spacing:**
```css
--line-height: 1.5;
--letter-spacing: -0.01em;      /* Slightly tighter */
```

### Spacing Scale (8px base)

```css
--space-xs: 4px;                /* Tight gaps */
--space-sm: 8px;                /* Default spacing */
--space-md: 16px;               /* Section spacing */
--space-lg: 24px;               /* Panel padding */
--space-xl: 32px;               /* Large gaps */
```

### Border Radius

```css
--radius-sm: 4px;               /* Buttons, inputs */
--radius-md: 6px;               /* Cards, tool buttons */
--radius-lg: 8px;               /* Panels, modals */
```

### Shadows

```css
--shadow-panel: 0 2px 8px rgba(0,0,0,0.2);
--shadow-elevated: 0 4px 16px rgba(0,0,0,0.3);
--shadow-modal: 0 8px 32px rgba(0,0,0,0.4);
```

---

## Animation System

### Animation Principles

- **Duration**: 150-200ms (quick but not jarring)
- **Easing**: cubic-bezier(0.4, 0, 0.2, 1) - smooth deceleration
- **Philosophy**: Animate only what changed, not the whole UI
- **Motion reduction**: Respect OS "reduce motion" setting

### Specific Animations

**Tool Selection:**
- Border animates in: 150ms ease
- Icon scales: 1.05× briefly, 150ms ease
- Parameters panel: Crossfade content, 200ms ease

**Panel Docking:**
- Drag: Follows cursor with slight lag (feels physical)
- Dock zones: Highlight blue outline, 150ms fade-in
- Snap: Magnetic pull at 20px distance
- Release: Ease-into-place, 200ms ease-out
- Optional: 1-2px overshoot then settle (physical weight)

**Canvas:**
- Image load: Fade 0.8 → 1.0 opacity, 300ms ease
- Zoom: Smooth scale transform
- Pan: Direct manipulation, no delay

**Thumbnail Strip:**
- Generation: Shimmer left-to-right sweep, 2s loop, low contrast
- New thumbnail: Slide in from right, 300ms ease-out
- Hover: Scale 1.05× + lift shadow, 150ms ease

---

## States System

### Empty States

**Canvas Empty:**
- Large subtle icon (upload cloud or sparkles)
- Primary: "Drop an image or generate one to get started"
- Actions: "Import from file" + "Generate" buttons
- Animation: Fade-in + single pulse (not infinite)

**Thumbnail Strip Empty:**
- Minimal thin bar: "No generations yet"

**Layers Panel Empty:**
- "No layers" + "+" button
- Compact: ~60px height

### Loading States

**Generation in Progress:**
- Thumbnail: Shimmer effect (45° diagonal sweep, 2s loop)
- Canvas: Ghost outline with shimmer if placing
- Parameters: Generate button → "Generating..." with spinner, disabled
- Progress: Optional bar if ComfyUI provides percentage

**Panel Loading:**
- Skeleton screens (not spinners)
- Surface + lighter rectangles
- Preserves layout, avoids jumps

### Error States

**Generation Failed:**
- Thumbnail: Red border + error icon overlay
- Click: Modal with error details + "Retry" button
- Toast: "Generation failed - click for details"
- Modal: Copyable error details for debugging

**Connection Lost:**
- Top banner (amber): "Connection to ComfyUI lost - Reconnecting..."
- Auto-retry every 5s
- Dismissable but returns if unresolved
- Hover dot: Shows reconnection attempts

**Invalid Input:**
- Form validation: Red border + error text below field
- Error icon in field (right side)
- Specific message: "Prompt is required" not "Invalid input"

### Success States

**Generation Complete:**
- Subtle green flash on thumbnail border (300ms)
- No intrusive modals

**Action Confirmed:**
- Toast (bottom-right): "Image exported" with checkmark
- Auto-dismiss after 3s
- Stack limit: Max 3 visible
- Consistent width for orderly stacking

---

## Docking System (Figma-Style)

### Behavior

**Drag Interaction:**
1. Click and hold panel header to initiate drag
2. Panel follows cursor with slight lag (feels physical)
3. Dock zones highlight when panel is near (blue outline, 150ms)
4. Magnetic snap when within 20px of valid dock zone
5. Release to place, smooth ease animation (200ms)

**Docking Targets:**
- Screen edges (top, right, bottom, left)
- Existing panel edges (snap alongside)
- Panel headers (tab grouping)

**Tab Groups:**
- Multiple panels can dock to same location
- Tabs appear in panel header
- Click tab to switch active panel
- Drag tab out to undock from group

**Floating Panels:**
- Can position anywhere on canvas
- Always above canvas (z-index hierarchy)
- Drag from any point on header
- Remember last position per session

### Default Dock Layout

- **Parameters**: Docked right
- **Layers**: Docked right, below Parameters
- **Tool Palette**: Floating top-right
- **Thumbnail Strip**: Floating bottom-center

---

## Implementation Notes

### Technology Stack
- React + TypeScript
- Tailwind CSS (primary styling)
- Emotion CSS (raw CSS when needed)
- Zustand (state management)
- react-konva (canvas rendering)
- Vite (build tool)

### Key Files to Create/Modify
- `src/Theme/Colors.ts` - Design system colors
- `src/Theme/Typography.ts` - Font system
- `src/Theme/Spacing.ts` - Spacing scale
- `src/App/TopBar/` - New top bar component
- `src/Tools/Palette/` - New floating tool palette
- `src/Canvas/` - Canvas area redesign
- `src/Dock/` - Enhanced docking system
- `src/Generation/ThumbnailStrip/` - New thumbnail strip

### Migration Strategy
1. Implement design system tokens first
2. Build new components in isolation
3. Feature flag new UI (toggle between old/new)
4. Gradual rollout per section
5. Collect feedback, iterate
6. Remove old UI once stable

---

## Open Questions

1. **Keyboard shortcuts**: Define complete shortcut mapping
2. **Mobile/tablet**: Responsive design considerations?
3. **Accessibility**: WCAG compliance checklist
4. **Themes**: Support light theme variant?
5. **Plugins**: How do plugins integrate with new UI?

---

## Next Steps

1. **Create ADRs** for key architectural decisions
2. **Design system documentation** in code-ready format
3. **Component specifications** for implementation
4. **Prototype** key interactions (docking, tool selection)
5. **User testing** with mockups/prototype
6. **Implementation plan** with milestones

---

**Document Status**: Complete, ready for ADR creation and implementation planning
