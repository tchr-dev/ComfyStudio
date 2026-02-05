# ComfyStudio UI/UX Design Reference

**Date**: 2026-02-04  
**Status**: Reference (Derived from existing specs + ADRs)  
**Audience**: Product/design/engineering  

## Purpose

Create a single "classic" UI/UX reference that consolidates the current design intent, visual language, interaction patterns, and implementation-facing constraints already defined across `docs/design-system/`, `docs/adr/`, and `docs/plans/`.

This document is intended to be:
- A shared reference for future UI work (features, refactors, new tools/panels)
- A consistency checklist for UI/UX decisions ("does this match the design system?")
- A pointer map to the canonical, more detailed specs

## Scope (What This Covers)

- Overall UX principles and interaction hierarchy
- Core layout model (canvas-centric + dockable/floating panels)
- Tool palette / tool button UI contract
- Parameters panel behavior (context-aware)
- Workflow tool execution UX semantics (explicit triggers)
- Responsive behavior expectations (desktop/tablet/mobile)
- Persistence expectations (layout + preferences)
- Keyboard shortcut intent (discoverability + focus-aware behavior)
- Button design (variants, sizes, states) for "classic button docs"

## Non-Goals

- Implementing UI components (belongs in code)
- Replacing ADRs/specs (this doc references them)
- Defining every tool's full behavior in detail (see tool specs + tool system docs)

---

## Design Intent (Guiding Principles)

### Core philosophy
ComfyStudio is a professional creative workstation. Optimize for flow, predictability, and minimal cognitive interruption.

### The three laws
1. **Canvas is king**: UI supports the canvas, never competes.
2. **Context over clutter**: show only what matters for the current mode/tool.
3. **Flexibility over rigidity**: users customize workspace; defaults must be sensible.

### Interaction hierarchy (preferred -> avoided)
Inline actions -> popovers -> toasts -> side panels -> modals (last resort).

**Canonical**: `docs/design-system/ux-principles.md`

---

## Visual Language (Design System Summary)

### Theme
Dark, minimal, "Figma-grade" professional aesthetic.

### Tokens (authoritative)
- Colors: background `#1E1E1E`, surface `#2C2C2C`, accent primary `#7C3AED`
- Typography: Inter, 14px body baseline
- Spacing: 8px base scale (4/8/16/24/32…)
- Motion: 150–200ms ease-out, subtle; avoid gratuitous animation

**Canonical**: `docs/design-system/tokens.md`

---

## Layout Model (Canvas-Centric Workspace)

### Desktop (≥1280px)
- Canvas takes ~70% of the viewport.
- Panels are dockable/floating; users can move/close/tab-group.
- Default layout (subject to implementation): tools floating top-right; parameters + layers docked right; thumbnails floating bottom.

**Canonical**: `docs/design-system/redesign-executive-summary.md`

### Docking
Docking behavior must feel "Figma-like":
- Drag panels by header to move.
- Magnetic snap range around dock zones.
- Tab-group when docking onto an existing panel header/zone.

**Canonical**: `docs/design-system/docking-system-spec.md`  
**Related ADRs**: `docs/adr/ADR-0004-canvas-centric-layout.md`, `docs/adr/ADR-0004-dock-layout-persistence.md`

---

## Tool System UX Contract

### Unified tool button design (no exceptions)
Every tool is represented by the same button pattern:
- **44×44px** square
- Centered **20×20** icon
- **Hotkey badge** at bottom-right
- Consistent visual states (default/hover/active/disabled)

**Canonical**: `docs/adr/ADR-0006-unified-tool-button-design.md`  
**Related**: `docs/design-system/redesign-executive-summary.md` (tool palette section)

### Tool palette behavior
- Buttons always show icon + hotkey badge.
- Active tool clearly indicated (accent border/background).
- Hover feedback is subtle and fast (150–200ms).

### Parameters panel (context-aware)
The parameters panel shows settings for the currently active tool only.
- Switching tools updates the panel content (crossfade/transition preferred).
- Tool settings are the primary "control surface" for that tool.

**Canonical**: `docs/adr/ADR-0005-context-aware-parameters-panel.md`  
**Related tool system docs**: `docs/plans/2026-01-28-declarative-tool-system-design.md`

---

## "Classic Button" Design Doc Template (Reusable)

Use this checklist whenever adding/modifying a button.

### 1) Placement
- Surface: top bar / panel header / parameters panel / canvas overlay / context menu
- Alignment and spacing: use token spacing scale
- Neighboring controls: group logically; avoid clutter near canvas

### 2) Intent
- Primary job-to-be-done (one sentence)
- Preconditions (e.g., "requires selected image")
- Postconditions (state changes, navigation, panel focus)

### 3) Interaction
- Click/tap behavior
- Keyboard behavior (shortcut + focus rules)
- Loading behavior (disable + spinner + progress messaging)
- Error behavior (inline message / toast / retry affordance)
- Cancellation behavior (if long-running)

### 4) Visual spec
- Variant: `primary` / `secondary` / `tertiary` / `destructive`
- Size: `sm` (32px) / `md` (40px) / `lg` (48px)
- Icon: yes/no; if icon-only, **ARIA label required**
- States: default/hover/active/disabled/loading

**Canonical (button component spec)**: `docs/design-system/ui-components-spec.md`

---

## Workflow Tools: Execution UX Semantics

### Principle: explicit intent required
Workflows execute only when the user performs an explicit "Execute/Generate" action. Tool activation, tool switching, and setting changes must not trigger runs.

### Primary triggers
- Parameters panel "Execute"/"Generate" button
- Keyboard shortcut (e.g., `Enter` / `Cmd/Ctrl+Enter`), when focus rules allow

### Non-triggers (must never execute)
- Tool selection
- Tool switching
- Settings changes (slider/text/dropdown)
- App state rehydration

**Canonical**: `docs/adr/ADR-0007-workflow-execution-semantics.md`  
**Related**: `docs/plans/2026-01-29-workflow-execution-contract.md`

---

## Responsive Expectations

### Desktop (≥1280px)
Full-featured layout: floating/dockable panels; tool palette vertical; parameters ~280px; thumbnails ~120px.

### Tablet (768–1279px)
Constrained docking:
- Tool palette becomes horizontal bar (still 44×44 buttons).
- Panels become fixed to edges; toggles become more important.

### Mobile (<768px)
Simplified/read-only first:
- Prioritize browsing history and exporting.
- Avoid canvas editing and heavy panel interactions in V1.

**Canonical**: `docs/design-system/responsive-design-spec.md`

---

## Persistence Expectations

### Layout persistence
Layout/panel state persists via versioned localStorage keys; breaking schema changes bump the version (fresh start is acceptable).

**Canonical ADR**: `docs/adr/ADR-0004-dock-layout-persistence.md`  
**Spec**: `docs/design-system/panel-state-persistence-spec.md`

---

## Keyboard UX Expectations

### Goals
- Discoverable shortcuts (visible in UI where possible)
- Platform conventions respected (Cmd vs Ctrl)
- Focus-aware (typing in inputs disables tool hotkeys)

**Canonical**: `docs/design-system/keyboard-shortcuts-spec.md`

---

## Open Questions / Future Work (Track Here)

This doc is intentionally a reference; unresolved items should remain in their source specs. Typical follow-ups currently called out elsewhere:
- Docking edge cases (collision/overlap, tab overflow)
- Complete keyboard mapping + conflicts
- "First run" empty state + onboarding
- Error recovery flows (connection loss, failed generations)

**Gap tracker**: `docs/design-system/gap-analysis.md`

---

## Source Map (Canonical Docs)

If there's a disagreement, defer to the source listed here:
- UX principles: `docs/design-system/ux-principles.md`
- Tokens: `docs/design-system/tokens.md`
- Tool button design (locked): `docs/adr/ADR-0006-unified-tool-button-design.md`
- Workflow execution semantics (locked): `docs/adr/ADR-0007-workflow-execution-semantics.md`
- Dock persistence (locked): `docs/adr/ADR-0004-dock-layout-persistence.md`
- Docking details: `docs/design-system/docking-system-spec.md`
- Responsive: `docs/design-system/responsive-design-spec.md`
- UI components (buttons/inputs/settings): `docs/design-system/ui-components-spec.md`
- Keyboard: `docs/design-system/keyboard-shortcuts-spec.md`
- Tool system architecture: `docs/plans/2026-01-28-declarative-tool-system-design.md`
