# Keyboard Shortcuts Complete Mapping

**Date**: 2026-01-29
**Status**: P0 - Implementation Blocker
**Related**: Frontend Redesign (All Sections)

---

## Shortcut Philosophy

1. **Discoverable** - Shown in UI (tool badges, menu labels, tooltips)
2. **Consistent** - Follow platform conventions (Cmd on Mac, Ctrl on Windows/Linux)
3. **Memorable** - Use first letter or mnemonic when possible
4. **Non-conflicting** - No overlaps with browser/OS shortcuts
5. **Focused-aware** - Some shortcuts disabled when typing in inputs

---

## Modifier Key Notation

```
Mac:     Cmd (⌘)  Option (⌥)  Control (⌃)  Shift (⇧)
Windows: Ctrl     Alt         Ctrl         Shift
Linux:   Ctrl     Alt         Ctrl         Shift
```

**In documentation**: Use Cmd/Ctrl to mean "Cmd on Mac, Ctrl elsewhere"

---

## Global Shortcuts (Always Active)

These work regardless of focus state:

### Application

| Shortcut | Action | Notes |
|----------|--------|-------|
| `Cmd/Ctrl + K` | Open command palette | Primary navigation |
| `Cmd/Ctrl + ,` | Open settings panel | Standard settings shortcut |
| `Cmd/Ctrl + /` | Toggle shortcuts panel | Show help |
| `Escape` | Close modal/panel/menu | Universal cancel |
| `Cmd/Ctrl + Q` | Quit application | Desktop app only |

### File Operations

| Shortcut | Action | Notes |
|----------|--------|-------|
| `Cmd/Ctrl + N` | New canvas/workspace | Clear and start fresh |
| `Cmd/Ctrl + O` | Open/import image | File picker |
| `Cmd/Ctrl + S` | Save current canvas | To file or workspace |
| `Cmd/Ctrl + Shift + S` | Save as | Choose location/format |
| `Cmd/Ctrl + E` | Export image | Quick export |
| `Cmd/Ctrl + Shift + E` | Export with options | Export modal |

### Edit Operations

| Shortcut | Action | Notes |
|----------|--------|-------|
| `Cmd/Ctrl + Z` | Undo | Standard |
| `Cmd/Ctrl + Shift + Z` | Redo | Standard |
| `Cmd/Ctrl + Y` | Redo (Windows) | Alt redo shortcut |
| `Cmd/Ctrl + X` | Cut | If selection exists |
| `Cmd/Ctrl + C` | Copy | If selection exists |
| `Cmd/Ctrl + V` | Paste | Paste image/layer |
| `Cmd/Ctrl + A` | Select all | Select all layers |
| `Cmd/Ctrl + D` | Deselect | Clear selection |

---

## Tool Shortcuts (Focus-Aware)

These work when NOT typing in text inputs:

### Primary Tools

| Key | Tool | Icon | Notes |
|-----|------|------|-------|
| `V` | Select | ↖️ | Default tool |
| `E` | Eraser | 🔧 | Erase to transparency |
| `B` | Brush | 🖌️ | Paint/draw |
| `G` | Generate | ✨ | AI generation |
| `R` | Remove Background | 🖼️ | Remove BG tool |
| `P` | Replace Background | 🔄 | Replace BG tool |

**Cycling**: Press same key again to cycle through tool variants (future)

### Tool Modifiers (While Tool Active)

| Modifier | Effect | Tools |
|----------|--------|-------|
| `Shift` | Constrain (straight line, perfect circle) | Brush, Select |
| `Alt/Option` | Subtract from selection | Select |
| `Cmd/Ctrl` | Add to selection | Select |
| `Space` | Temporarily switch to Hand tool (pan) | All |
| `[` | Decrease brush size | Brush, Eraser |
| `]` | Increase brush size | Brush, Eraser |

---

## Canvas Shortcuts

| Shortcut | Action | Notes |
|----------|--------|-------|
| `Space + Drag` | Pan canvas | Temporary hand tool |
| `Cmd/Ctrl + 0` | Fit to view | Reset zoom/pan |
| `Cmd/Ctrl + 1` | Actual size (100%) | 1:1 pixel ratio |
| `Cmd/Ctrl + +` | Zoom in | Or scroll up |
| `Cmd/Ctrl + -` | Zoom out | Or scroll down |
| `Cmd/Ctrl + =` | Zoom in (alternate) | = is same key as + |
| `Double-click canvas` | Fit to view | Alternative |
| `H` | Toggle hand tool | Pan mode |

---

## Layer Shortcuts

| Shortcut | Action | Notes |
|----------|--------|-------|
| `Cmd/Ctrl + Shift + N` | New layer | Create blank layer |
| `Cmd/Ctrl + J` | Duplicate layer | Duplicate active layer |
| `Delete` or `Backspace` | Delete layer | Delete active layer |
| `Cmd/Ctrl + [` | Move layer down | Reorder layers |
| `Cmd/Ctrl + ]` | Move layer up | Reorder layers |
| `Cmd/Ctrl + G` | Group layers | Future feature |
| `Cmd/Ctrl + Shift + G` | Ungroup layers | Future feature |
| `Cmd/Ctrl + E` | Merge down | Merge with layer below |

### Layer Visibility

| Shortcut | Action | Notes |
|----------|--------|-------|
| `Cmd/Ctrl + ;` | Toggle layer visibility | Show/hide active |
| `Alt + Click eye icon` | Toggle all except this | Solo layer |

---

## Panel Shortcuts

| Shortcut | Action | Notes |
|----------|--------|-------|
| `F1` | Toggle tools palette | Show/hide |
| `F2` | Toggle parameters panel | Show/hide |
| `F3` | Toggle layers panel | Show/hide |
| `F4` | Toggle thumbnail strip | Show/hide |
| `Tab` | Toggle all panels | Full screen canvas |
| `Shift + Tab` | Toggle sidebar panels | Hide right panels only |

---

## Generation Shortcuts

| Shortcut | Action | Notes |
|----------|--------|-------|
| `G` | Switch to Generate tool | Opens parameters |
| `Cmd/Ctrl + Enter` | Generate (when prompt focused) | Submit generation |
| `Shift + Enter` | New line in prompt | Multi-line prompts |
| `Cmd/Ctrl + R` | Re-generate with same settings | Quick regenerate |
| `Cmd/Ctrl + Shift + R` | Regenerate with variations | Seed variations |

---

## Image Navigation

| Shortcut | Action | Notes |
|----------|--------|-------|
| `Left Arrow` | Previous image in history | Canvas history |
| `Right Arrow` | Next image in history | Canvas history |
| `Cmd/Ctrl + Left` | Previous generation batch | Thumbnail strip |
| `Cmd/Ctrl + Right` | Next generation batch | Thumbnail strip |
| `1-9` | Load Nth thumbnail | Quick load (1=first, 9=ninth) |
| `0` | Load last thumbnail | Quick load most recent |

---

## Comparison Mode

| Shortcut | Action | Notes |
|----------|--------|-------|
| `C` | Enter comparison mode | With selected thumbnails |
| `Escape` | Exit comparison mode | Return to normal |
| `Cmd/Ctrl + Click thumbnail` | Multi-select | For comparison |
| `L` | Sync zoom/pan (toggle) | Lock zoom across images |

---

## Text Editing (When Focused in Input)

| Shortcut | Action | Notes |
|----------|--------|-------|
| `Cmd/Ctrl + A` | Select all text | Standard |
| `Cmd/Ctrl + C` | Copy text | Standard |
| `Cmd/Ctrl + X` | Cut text | Standard |
| `Cmd/Ctrl + V` | Paste text | Standard |
| `Escape` | Unfocus input | Return focus to canvas |
| `Tab` | Next field | Form navigation |
| `Shift + Tab` | Previous field | Form navigation |

**Important**: Tool shortcuts (E, G, V, etc.) are **disabled** when typing to avoid accidental tool switches.

---

## Settings/Modal Shortcuts

| Shortcut | Action | Notes |
|----------|--------|-------|
| `Escape` | Close/cancel | Universal |
| `Enter` | Confirm/submit | On primary button |
| `Tab` | Next element | Focus navigation |
| `Shift + Tab` | Previous element | Focus navigation |

---

## Advanced/Power User Shortcuts

| Shortcut | Action | Notes |
|----------|--------|-------|
| `Cmd/Ctrl + Shift + P` | Command palette (alternate) | VS Code style |
| `Cmd/Ctrl + \` | Split view | Future: side-by-side |
| `F11` | Full screen | Browser full screen |
| `Cmd/Ctrl + F` | Find/search | Search thumbnails (future) |
| `Cmd/Ctrl + H` | History panel | Show generation history |

---

## Shortcut Conflicts to Avoid

### Browser Shortcuts (Don't Override)

| Shortcut | Browser Action | Status |
|----------|----------------|--------|
| `Cmd/Ctrl + T` | New tab | ❌ Don't use |
| `Cmd/Ctrl + W` | Close tab | ❌ Don't use |
| `Cmd/Ctrl + R` | Reload page | ⚠️ Use with caution (we override for regenerate) |
| `Cmd/Ctrl + P` | Print | ❌ Don't use |
| `Cmd/Ctrl + N` | New window | ⚠️ Use with caution (we override for new canvas) |
| `Cmd/Ctrl + L` | Address bar | ❌ Don't use |
| `Cmd/Ctrl + Tab` | Switch tabs | ❌ Don't use |

---

## Focus Management

### Focus States

1. **Global** - No input focused, shortcuts work
2. **Text input** - Typing in prompt, parameters, etc. (tool shortcuts disabled)
3. **Modal** - Modal open (only modal shortcuts work)
4. **Panel focused** - Panel has focus (panel-specific shortcuts)

### Focus Detection

```typescript
function isTextInputFocused(): boolean {
  const el = document.activeElement;
  return (
    el?.tagName === 'INPUT' ||
    el?.tagName === 'TEXTAREA' ||
    el?.contentEditable === 'true'
  );
}

function shouldPreventToolShortcut(key: string): boolean {
  // Prevent tool shortcuts when typing
  if (isTextInputFocused()) {
    return true;
  }
  return false;
}
```

### Escape Key Priority

**Escape closes things in this order:**
1. Open modal (highest priority)
2. Open side panel
3. Active popover/dropdown
4. Comparison mode
5. Current selection (deselect)
6. Unfocus text input
7. (Nothing happens if all above are false)

---

## Shortcut Customization (Future)

### V1: Fixed Shortcuts
All shortcuts hardcoded as specified above.

### V2: Customizable Shortcuts
- Settings panel: "Hotkeys" section
- User can rebind any shortcut
- Conflicts highlighted in UI
- Reset to defaults button

---

## Shortcut Reference Sheet

### Quick Reference (In-App)

**Cmd/Ctrl + /** opens shortcuts panel with categorized list:

```
┌─────────────────────────────────────┐
│ ╳  Keyboard Shortcuts               │
├─────────────────────────────────────┤
│ 🔍 Search shortcuts...              │
├─────────────────────────────────────┤
│                                     │
│ ▼ Tools                             │
│   V      Select                     │
│   E      Eraser                     │
│   B      Brush                      │
│   G      Generate                   │
│                                     │
│ ▼ Canvas                            │
│   Cmd+0  Fit to view                │
│   Cmd++  Zoom in                    │
│   Cmd+-  Zoom out                   │
│                                     │
│ ▼ Edit                              │
│   Cmd+Z  Undo                       │
│   Cmd+Y  Redo                       │
│   Cmd+C  Copy                       │
│                                     │
│ [Show All]                          │
└─────────────────────────────────────┘
```

---

## Implementation Notes

### Shortcut Handler

```typescript
interface Shortcut {
  key: string;                      // Single key or combo
  modifiers?: ('cmd' | 'ctrl' | 'alt' | 'shift')[];
  action: () => void;               // What to do
  when?: () => boolean;             // Conditional (focus state, etc.)
  preventDefault?: boolean;         // Prevent browser default
}

const shortcuts: Shortcut[] = [
  {
    key: 'v',
    action: () => selectTool('select'),
    when: () => !isTextInputFocused(),
  },
  {
    key: 'k',
    modifiers: ['cmd'],
    action: () => openCommandPalette(),
    preventDefault: true,
  },
  // ... more shortcuts
];
```

### Global Listener

```typescript
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    const modifiers: string[] = [];
    if (e.metaKey || e.ctrlKey) modifiers.push('cmd');
    if (e.altKey) modifiers.push('alt');
    if (e.shiftKey) modifiers.push('shift');

    const key = e.key.toLowerCase();

    for (const shortcut of shortcuts) {
      // Match key
      if (shortcut.key !== key) continue;

      // Match modifiers
      const requiredMods = shortcut.modifiers || [];
      const hasAllMods = requiredMods.every(mod => modifiers.includes(mod));
      const hasExtraMods = modifiers.some(mod => !requiredMods.includes(mod));

      if (!hasAllMods || hasExtraMods) continue;

      // Check condition
      if (shortcut.when && !shortcut.when()) continue;

      // Execute
      if (shortcut.preventDefault) {
        e.preventDefault();
      }
      shortcut.action();
      break;
    }
  }

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [shortcuts]);
```

---

## Accessibility

### Screen Reader Announcements

When shortcut executes:
```typescript
function announceShortcutAction(action: string) {
  const announcement = document.getElementById('sr-announcements');
  announcement.textContent = action; // e.g., "Tool changed to Brush"
}
```

### Visual Feedback

When shortcut executes:
- Tool button animates (brief flash)
- Toast notification (for file operations)
- Panel highlight (when toggled)

---

## Testing Checklist

- [ ] All tool shortcuts work when canvas focused
- [ ] Tool shortcuts blocked when typing in inputs
- [ ] Cmd/Ctrl + Z/Y undo/redo works
- [ ] Escape closes modals/panels in correct order
- [ ] Zoom shortcuts work (Cmd/Ctrl + +/-)
- [ ] Panel toggle shortcuts work (F1-F4)
- [ ] Generation shortcut works (Cmd/Ctrl + Enter)
- [ ] No conflicts with browser shortcuts
- [ ] Shortcuts respect focus state
- [ ] Screen reader announces actions

---

**Status**: P0 Gap Filled
**Next**: Gap D (Docking System Technical Details)
