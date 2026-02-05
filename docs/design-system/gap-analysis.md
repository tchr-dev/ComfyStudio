# Frontend Redesign - Gap Analysis

**Date**: 2026-01-29
**Purpose**: Identify missing specifications, unclear details, and edge cases
**Status**: Review in Progress

---

## Critical Gaps (Must Address)

### 1. Responsive Design Strategy

**Gap**: No specifications for tablet/mobile layouts

**Questions**:
- What happens on screens <1280px?
- Do floating panels become fixed on mobile?
- Does tool palette become a bottom bar?
- Is the thumbnail strip hidden or stacked?
- What's the minimum supported screen size?

**Impact**: High - affects ~30% of potential users
**Recommendation**: Define breakpoints and responsive behavior

---

### 2. Multi-Image Canvas Workflow

**Gap**: Canvas specifications assume single image editing

**Questions**:
- Can users have multiple images on canvas simultaneously?
- How do layers work across multiple images?
- Can you compare generation results side-by-side?
- How does Select tool work with multiple images?
- What's the z-index/stacking order?

**Impact**: High - core workflow unclear
**Recommendation**: Define multi-image interaction model

---

### 3. Panel State Persistence

**Gap**: What state persists between sessions?

**Questions**:
- Do panel positions save per-user or per-project?
- Does tool selection persist?
- Do parameter values persist (prompt, settings)?
- Is there a "reset layout" option?
- What about workspace presets (save/load custom layouts)?

**Impact**: Medium - affects daily workflow
**Recommendation**: Define state persistence model

---

### 4. Keyboard Shortcuts Complete Mapping

**Gap**: Only tool shortcuts defined (e, g, v, r, b)

**Missing**:
- Panel toggles (hide/show Parameters, Layers, Thumbnails)
- Canvas operations (zoom in/out, fit to view, reset)
- Tool operations (undo, redo, delete, duplicate)
- Navigation (next/previous generation, switch layers)
- Global actions (save, export, settings, command palette)
- Modifier combinations (Shift, Cmd/Ctrl, Alt)

**Impact**: High - keyboard-first users blocked
**Recommendation**: Create complete shortcut reference table

---

### 5. Generation Batch Management

**Gap**: Thumbnail strip grows infinitely

**Questions**:
- What's the limit (memory/performance)?
- Can users delete batches?
- Can users search/filter history?
- Is there pagination or infinite scroll?
- Does history persist between sessions?
- Can users export entire batches?

**Impact**: Medium - becomes unusable after many generations
**Recommendation**: Define history management system

---

## Implementation Details Needed

### 6. Tool Implementation Specifics

**Unclear**:
- **Brush tool**: How does canvas painting actually work? (react-konva implementation details)
- **Eraser tool**: Erase to transparency or background color?
- **Select tool**: Rectangle, lasso, or magic wand? All three?
- **Remove/Replace Background**: One-click action or requires ComfyUI workflow?

**Impact**: Medium - implementers will make inconsistent decisions
**Recommendation**: Add implementation notes to each tool

---

### 7. Docking System Technical Details

**Gap**: High-level behavior specified, but not technical implementation

**Missing**:
- Which docking library to use (react-mosaic, rc-dock, custom)?
- How are dock zones detected (collision detection algorithm)?
- Panel minimum/maximum sizes?
- Resize handles specifications?
- Tab group header design?
- Panel overflow behavior (too many tabs)?

**Impact**: High - core feature, needs detailed spec
**Recommendation**: Add technical implementation section to ADR-0004

---

### 8. Canvas Performance Constraints

**Gap**: No performance requirements specified

**Questions**:
- Maximum canvas size (pixels)?
- Maximum zoom level (in/out)?
- Image file size limits?
- How many layers can be rendered at 60fps?
- Memory budget for canvas operations?

**Impact**: Medium - affects user expectations
**Recommendation**: Define performance targets

---

### 9. Error State Recovery

**Gap**: Error states shown, but not recovery workflows

**Missing**:
- **Connection lost**: How does auto-reconnect work? Retry intervals? Give up after X attempts?
- **Generation failed**: Can users retry with same settings? Edit and retry? See what failed?
- **Invalid state**: If panel state corrupts, how to recover? Reset to default?
- **Memory issues**: If canvas runs out of memory, what happens?

**Impact**: Medium - frustrating when errors occur
**Recommendation**: Add recovery workflow diagrams

---

### 10. Settings Panel Content

**Gap**: Settings panel mentioned but not specified

**Missing**:
- What settings exist? (Theme, hotkeys, ComfyUI connection, plugins - but details?)
- How are settings organized (tabs, sections, search)?
- Are settings global or per-workspace?
- Can users import/export settings?
- What are the default values?

**Impact**: Medium - needed for implementation
**Recommendation**: Create settings panel specification

---

## Edge Cases Not Covered

### 11. Tool Switching Mid-Action

**Scenario**: User is drawing with Brush, then presses 'g' for Generate

**Questions**:
- Does brush stroke get committed or cancelled?
- What if they're mid-drag on canvas?
- What if a generation is in progress?

**Recommendation**: Define tool interruption behavior

---

### 12. Panel Collision/Overlap

**Scenario**: User drags a floating panel over another floating panel

**Questions**:
- Which panel is on top?
- Does overlap trigger magnetic snap?
- Can panels fully overlap, or do they auto-adjust?
- What's the z-index order of floating panels?

**Recommendation**: Add panel collision rules to docking spec

---

### 13. Modal Stack Behavior

**Scenario**: Modal opens, then another modal tries to open

**Questions**:
- Can modals stack?
- Does second modal wait for first to close?
- What if both are critical errors?
- What's the Escape key behavior (close topmost only)?

**Recommendation**: Add modal stacking rules to Section 11

---

### 14. Empty Canvas + No Generations

**Scenario**: User opens app for first time (empty state)

**Questions**:
- What does the thumbnail strip show? (Hidden? "No generations yet" message?)
- What does the Layers panel show? (Hidden? Empty state?)
- What does the Parameters panel show? (Select tool has minimal settings)
- Is there an onboarding flow?

**Recommendation**: Design first-run experience

---

### 15. Thumbnail Click While Generating

**Scenario**: User clicks thumbnail from previous batch while new batch is generating

**Questions**:
- Does it load onto canvas immediately?
- Does it cancel current generation?
- Can multiple images be on canvas?
- What visual feedback indicates loading?

**Recommendation**: Define canvas image loading behavior

---

### 16. Canvas Image Deletion

**Scenario**: User has an image on canvas and wants to remove it

**Questions**:
- Is there a delete button?
- Keyboard shortcut (Delete key)?
- Right-click menu option?
- What happens to the associated layer?

**Recommendation**: Add canvas image management operations

---

### 17. Parameters Panel Width on Small Screens

**Scenario**: 280px panel on 1024px screen = 27% of width

**Questions**:
- Does it shrink?
- Does it become a modal on small screens?
- Can users resize it?
- What's the minimum width?

**Recommendation**: Add responsive panel sizing

---

### 18. Tool Hotkeys While Typing

**Scenario**: User is typing in Prompt field, presses 'g'

**Questions**:
- Does 'g' get typed, or does it switch to Generate tool?
- How do we detect "user is typing"?
- What about other shortcuts while focused in inputs?

**Recommendation**: Define input focus and shortcut precedence

---

### 19. Connection Status During Generation

**Scenario**: ComfyUI disconnects mid-generation

**Questions**:
- Do loading spinners turn to error state?
- Is generation auto-retried when reconnected?
- Are partial results shown?
- Can user manually retry?

**Recommendation**: Add disconnection-during-generation flow

---

### 20. Layer Panel Without Canvas Images

**Scenario**: No images on canvas (empty state)

**Questions**:
- Does Layers panel show anything?
- Is there a default background layer?
- Can users create empty layers?
- What's the relationship between thumbnail images and layers?

**Recommendation**: Clarify layers vs canvas images relationship

---

## Inconsistencies Found

### 21. Tool Selection State

**Inconsistency**: ADR-0006 shows tool palette with 5 tools, but design doc Section 2 doesn't specify default selected tool

**Issue**: On app launch, which tool is active?
**Recommendation**: Specify "Select" as default active tool

---

### 22. Panel Docking "Tab Groups"

**Inconsistency**: Section describing tab groups, but no visual specification

**Issue**: What do tabbed panels look like? Where are tabs? How to switch?
**Recommendation**: Add tab group visual design to docking section

---

### 23. Toast Stacking Direction

**Inconsistency**: "Max 3 visible" but not clear if newest on top or bottom

**Issue**: Does stack grow up or down from bottom-right?
**Recommendation**: Specify toasts stack upward (newest on top)

---

### 24. Thumbnail Strip Batch Separator

**Inconsistency**: "Vertical line between batches" but no styling specified

**Issue**: What color, width, height, opacity?
**Recommendation**: Add separator styling to design system tokens

---

### 25. Modal Backdrop Click Behavior

**Inconsistency**: "Dismisses non-critical modals" - what defines "non-critical"?

**Issue**: Confirmation modals are critical, but do they dismiss on backdrop click?
**Recommendation**: Define critical vs non-critical modal taxonomy

---

## Missing Component Specifications

### 26. Buttons

**Missing**:
- Primary button (Generate, Delete All, etc.)
- Secondary button (Cancel, etc.)
- Tertiary button (text-only links)
- Icon button (close, settings, etc.)
- Button states (default, hover, active, disabled, loading)
- Button sizes (small, medium, large)

**Recommendation**: Create button component specification

---

### 27. Form Inputs

**Missing**:
- Text input (single-line)
- Textarea (multi-line)
- Dropdown/Select
- Slider
- Checkbox
- Radio buttons
- Color picker
- Number input (with +/- buttons?)

**Recommendation**: Create form components specification

---

### 28. Loading States

**Missing**:
- Spinner (when to use?)
- Shimmer/Skeleton (when to use?)
- Progress bar (when to use?)
- Indeterminate vs determinate

**Recommendation**: Add loading patterns to states section

---

### 29. Empty States

**Specified for**:
- Canvas empty
- Layers empty
- Thumbnails empty

**Missing for**:
- Parameters panel (tool with no settings)
- Search results empty
- History filtered to zero results

**Recommendation**: Create empty state patterns document

---

### 30. Context Menus

**Mentioned but not specified**:
- What options appear on canvas right-click?
- What options on thumbnail right-click?
- What options on layer right-click?
- Menu item design (icon + label + shortcut)?
- Submenu behavior?

**Recommendation**: Specify context menu patterns

---

## Architecture Decisions Needed

### 31. State Management Strategy

**Gap**: Using Zustand, but not clear how state is organized

**Questions**:
- One global store or multiple stores?
- How is tool state isolated?
- How is panel layout state stored?
- Is canvas state in Zustand or react-konva manages it?
- What about undo/redo state?

**Recommendation**: Create state architecture document

---

### 32. Canvas Rendering Strategy

**Gap**: "react-konva" mentioned, but not detailed

**Questions**:
- One Konva stage per image or one global stage?
- How are layers rendered?
- What about canvas transformations (zoom, pan)?
- Performance optimization strategy (virtualization, culling)?

**Recommendation**: Create canvas architecture document

---

### 33. Theme System

**Gap**: Dark theme specified, light theme mentioned as open question

**Questions**:
- Are we building theme switching from day 1?
- If not, are tokens named semantically (--color-background) or literally (--color-dark-bg)?
- What about user-uploaded custom themes?

**Recommendation**: Decide theme strategy before implementation

---

### 34. Plugin Integration

**Gap**: Open question - how do plugins integrate?

**Questions**:
- Can plugins add tools to the tool palette?
- Can plugins add panels?
- Can plugins modify the Parameters panel?
- Do plugins follow the same design system?

**Recommendation**: Create plugin integration specification

---

### 35. Accessibility Implementation

**Gap**: Principles stated, but not implementation details

**Missing**:
- Focus management implementation (who maintains focus trap?)
- Screen reader announcements (aria-live regions where?)
- Keyboard navigation order (defined in code or generated?)
- Skip links (where to place?)
- ARIA attributes (which components need which attributes?)

**Recommendation**: Create accessibility implementation guide

---

## Priority Recommendations

### P0 (Must Have Before Implementation)
1. **Responsive design strategy** (Gap #1)
2. **Keyboard shortcuts complete mapping** (Gap #4)
3. **Multi-image canvas workflow** (Gap #2)
4. **Docking system technical details** (Gap #7)
5. **Tool implementation specifics** (Gap #6)

### P1 (Should Have in V1)
6. **Panel state persistence** (Gap #3)
7. **Generation batch management** (Gap #5)
8. **Settings panel content** (Gap #10)
9. **Button component spec** (Gap #26)
10. **Form inputs spec** (Gap #27)

### P2 (Can Defer to V2)
11. **Canvas performance constraints** (Gap #8)
12. **Error state recovery** (Gap #9)
13. **Theme system** (Gap #33)
14. **Plugin integration** (Gap #34)
15. **Context menus** (Gap #30)

---

## Next Steps

1. **Address P0 gaps** - Add specifications to design doc
2. **Resolve inconsistencies** - Update conflicting sections
3. **Define edge cases** - Add edge case handling rules
4. **Create component library** - Spec all UI components
5. **Architecture decisions** - Make and document arch decisions

---

**Analysis Complete**: 35 gaps identified
**Critical Issues**: 5 P0, 5 P1, 5 P2
**Status**: Ready for gap-filling iteration
