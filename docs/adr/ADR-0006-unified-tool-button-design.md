# ADR-0006: Unified Tool Button Design

**Date**: 2026-01-29
**Status**: Accepted
**Deciders**: Frontend Redesign Team

---

## Context

The current tool buttons have **inconsistent visual design**, creating confusion and an unprofessional appearance:

| Tool | Has Icon? | Has Hotkey? | Visual Style |
|------|-----------|-------------|--------------|
| Eraser | ✅ Yes | ✅ Yes (e) | Icon + hotkey badge |
| Generate | ❌ No | ✅ Yes (g) | Text only |
| Remove Background | ✅ Yes | ❌ No | Icon only |
| Replace Background | ✅ Yes | ❌ No | Icon only |
| Select | ✅ Yes | ✅ Yes (v) | Icon + hotkey badge |

This inconsistency creates problems:
1. **Visual inconsistency** - Tools look different for no functional reason
2. **Discoverability issues** - Users can't tell which tools have hotkeys
3. **Unprofessional appearance** - Feels unfinished or hastily designed
4. **Poor hierarchy** - No clear pattern to understand tool organization

---

## Decision

We will implement a **unified tool button design** where **every tool** follows the exact same visual pattern:

### Standard Tool Button Specification

**Every tool button includes:**
1. **Icon** (20×20px, centered)
2. **Hotkey badge** (12px height, bottom-right corner, semi-transparent)
3. **Consistent sizing** (44×44px square - comfortable touch target)
4. **Consistent states** (default, hover, active, disabled)
5. **Consistent spacing** (4px between buttons)

**No exceptions** - all tools use this pattern.

---

## Visual Specification

### Button Dimensions
```
┌────────────┐
│            │  44px height
│   [icon]   │
│         h  │  ← hotkey badge
└────────────┘
  44px width
```

### Icon
- **Size**: 20×20px
- **Position**: Centered in button
- **Style**: Line icons (lucide-react)
- **Color**:
  - Default: `--text-secondary` (#A0A0A0)
  - Hover: Brightens
  - Active: `--text-primary` (#FFFFFF)
  - Disabled: `--text-tertiary` (#666666)

### Hotkey Badge
- **Size**: 12px height, auto width, min 16px
- **Position**: Bottom-right corner, 4px margin
- **Background**: `rgba(0,0,0,0.3)` with backdrop blur
- **Text**: 11px, white, semibold
- **Border radius**: 2px
- **Content**: Single letter (e, g, v, r, b)

### Button States

**Default:**
```css
background: transparent;
border: 1px solid transparent;
icon-color: var(--text-secondary);
```

**Hover:**
```css
background: rgba(255,255,255,0.05);
border: 1px solid rgba(255,255,255,0.1);
icon-scale: 1.05;
transition: 150ms ease;
```

**Active (selected):**
```css
background: rgba(124,58,237,0.1);
border: 2px solid var(--accent-primary);
icon-color: var(--text-primary);
```

**Disabled:**
```css
background: transparent;
border: 1px solid transparent;
icon-color: var(--text-tertiary);
opacity: 0.5;
cursor: not-allowed;
```

---

## Rationale

### Visual Consistency
When all tools look the same, users develop a clear mental model: "Square buttons with icons are tools." No ambiguity, no exceptions to remember.

### Discoverability
Hotkey badges make keyboard shortcuts discoverable without requiring:
- Memorization
- Documentation lookup
- Tooltip hovering

### Professional Polish
Consistent design signals quality and attention to detail. Inconsistency signals rushed or amateur work.

### Accessibility
- 44×44px targets meet touch accessibility guidelines (min 44×44px)
- Clear visual states support keyboard navigation
- Hotkey badges support keyboard-first users

### Scalability
New tools automatically inherit the same design. No need to decide "should this tool show a hotkey?" - all do.

---

## Consequences

### Positive

✅ **Visual consistency** - All tools instantly recognizable as tools
✅ **Better discoverability** - Hotkeys visible at a glance
✅ **Professional appearance** - No visual inconsistencies
✅ **Scalable** - New tools follow same pattern automatically
✅ **Accessible** - Meets touch target and keyboard navigation standards

### Negative

⚠️ **Hotkey constraints** - Every tool needs a unique single-letter hotkey
⚠️ **Icon design** - Need clear, distinct icons for each tool
⚠️ **Space usage** - Consistent size means some tools might feel too large/small

### Mitigation Strategies

- **Hotkeys**: Use logical mappings (G=Generate, E=Eraser, V=seleçt, R=Remove, B=Background)
- **Icons**: Use proven icon library (lucide-react) with clear, distinct symbols
- **Space**: 44px is optimal for desktop; adjust for mobile/tablet if needed

---

## Alternatives Considered

### Alternative 1: Keep Current Inconsistent Design
**Pros**: No work required, already implemented
**Cons**: Unprofessional, confusing, doesn't solve problem
**Verdict**: Rejected - this is the problem we're solving

### Alternative 2: Icon Only (No Hotkeys)
**Pros**: Cleaner visual, more space for canvas
**Cons**: Poor discoverability, requires tooltip hover to learn shortcuts
**Verdict**: Rejected - discoverability too important

### Alternative 3: Text Labels + Icons
**Pros**: Very explicit, beginner-friendly
**Cons**: Takes too much space, cluttered, not scalable
**Verdict**: Rejected - doesn't match "clean and minimal" design goal

### Alternative 4: Adaptive Design (Icon vs Text based on space)
**Pros**: Responsive to screen size
**Cons**: Inconsistent experience, complex implementation, jarring when resizing
**Verdict**: Rejected - consistency more important than adaptive sizing

### Alternative 5: Separate Tool Categories (Different Styles)
**Pros**: Visual grouping by category
**Cons**: Still inconsistent, harder to learn pattern
**Verdict**: Rejected - uniformity better for this use case

---

## Implementation Details

### Tool Definition Update

Every tool definition must include:
```typescript
interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;         // lucide-react icon name (required)
  shortcut: string;     // Single letter (required)
  category: ToolCategory;
  settings?: Setting[];
}
```

### Tool Button Component

```typescript
function ToolButton({ tool, isActive, onClick }: Props) {
  const Icon = lucideIcons[tool.icon];

  return (
    <button
      className={classes(
        "tool-button",
        isActive && "tool-button--active"
      )}
      onClick={onClick}
      title={`${tool.name} (${tool.shortcut})`}
    >
      <Icon size={20} />
      <span className="hotkey-badge">{tool.shortcut}</span>
    </button>
  );
}
```

### CSS Implementation

```css
.tool-button {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 150ms ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-button:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.1);
}

.tool-button:hover svg {
  transform: scale(1.05);
}

.tool-button--active {
  background: rgba(124,58,237,0.1);
  border: 2px solid var(--accent-primary);
  color: var(--text-primary);
}

.hotkey-badge {
  position: absolute;
  bottom: 4px;
  right: 4px;
  height: 12px;
  min-width: 16px;
  padding: 0 4px;
  background: rgba(0,0,0,0.3);
  backdrop-filter: blur(4px);
  border-radius: 2px;
  font-size: 11px;
  font-weight: 600;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
```

---

## Migration Path

### Phase 1: Update Tool Definitions
Add missing icons and hotkeys to all tool definitions:
- Generate: Add icon (Sparkles ✨)
- Remove Background: Add hotkey (r)
- Replace Background: Add hotkey (b)

### Phase 2: Create Unified ToolButton Component
Build new component following specification.

### Phase 3: Replace Existing Tool Buttons
Swap out current inconsistent buttons for unified component.

### Phase 4: Verify All Tools
Test each tool to ensure:
- Icon is clear and distinct
- Hotkey works correctly
- States (hover, active) render properly
- Tooltip shows correct info

---

## Design System Integration

This ADR establishes tool buttons as a core design system component:

**Location**: `src/Theme/ToolButton/`
**Documentation**: Storybook stories for all states
**Testing**: Visual regression tests for button states
**Reusability**: Any future tool automatically uses this design

---

## User Experience Impact

### Before (Current)
- Users confused by inconsistent tool appearance
- Hotkey discovery requires hovering or documentation
- Visual hierarchy unclear (which is more important?)

### After (This ADR)
- Clear, predictable pattern: "Square buttons = tools"
- Hotkeys visible at a glance
- Professional, polished appearance
- Reduced cognitive load

---

## Relationship to Other ADRs

- **ADR-0001**: Convention-based tool discovery (tools auto-register)
- **ADR-0002**: Tool definition structure (icon + shortcut required)
- **ADR-0005**: Context-aware parameters panel (tool selection shows settings)

---

## References

- lucide-react icon library
- Figma toolbar design
- Photoshop tool panel design
- Web Content Accessibility Guidelines (WCAG 2.1) - Touch target size

---

**Status**: Accepted
**Last Updated**: 2026-01-29
