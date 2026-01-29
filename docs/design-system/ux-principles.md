# ComfyStudio UX Principles

**Last Updated**: 2026-01-29
**Purpose**: One-page reference for design and implementation decisions

---

## Core Philosophy

**Canvas-Centric, Flow-Preserving, Professional**

ComfyStudio is a serious creative workstation, not a toy. Every design decision optimizes for continuity of attention, predictable behavior, and minimum cognitive interruption.

---

## The Three Laws

### 1. Canvas Is King
The canvas is where work happens. Everything else supports it. If a UI element competes with the canvas for attention, it's wrong.

### 2. Context Over Clutter
Show only what's relevant right now. Hide everything else. Users should never need to mentally filter out irrelevant options.

### 3. Flexibility Over Rigidity
Users know their workflow better than we do. Give them tools to customize their workspace, don't force them into ours.

---

## Design Tenets

### Consistency Above All
- All tools look identical (icon + hotkey)
- All panels behave the same (float, dock, tab-group)
- All states follow the same patterns (empty, loading, error, success)
- No exceptions, no special cases

**Why**: Consistency reduces cognitive load. Users learn one pattern, apply it everywhere.

### Inline First, Modal Last
Interaction hierarchy (use in order):
1. **Inline actions** (70-80% of all actions)
2. **Popovers** (lightweight, non-blocking)
3. **Toasts** (brief notifications)
4. **Side panels** (contextual, don't block canvas)
5. **Modals** (last resort only)

**Why**: Modals are interruptions. Every context switch breaks creative flow.

### Progressive Disclosure
Don't show advanced options until needed. Don't explain what's obvious. Don't hide what's essential.

**Why**: Complexity should be opt-in, not opt-out.

### Honest Feedback
- Loading states show real progress, or admit they're indeterminate
- Error messages explain what happened and how to fix it
- Success confirmations are brief and unobtrusive
- No fake "please wait" spinners that don't mean anything

**Why**: Respect user intelligence. Dishonest UI breeds distrust.

### Performance Perceived as Speed
- Optimistic updates (assume success, rollback if needed)
- Skeleton screens (show structure immediately)
- Smooth 60fps animations (or none at all)
- Instant feedback on clicks (<100ms)

**Why**: Perceived performance matters more than actual performance.

---

## Visual Language

### Clean & Minimal
- Dark theme (#1E1E1E background)
- Subtle borders and shadows
- Generous whitespace
- Typography at 14px body (readable for long sessions)

**Not**:
- Neumorphism
- Over-the-top shadows
- Decorative animations
- Gradient backgrounds

### Professional Palette
- **Purple** (#7C3AED) - Primary accent, active states
- **Blue** (#3B82F6) - Secondary accent, links
- **Green** (#10B981) - Success
- **Amber** (#F59E0B) - Warning
- **Red** (#EF4444) - Error/destructive

**Why**: Limited palette maintains visual clarity. Semantic colors are universal.

### Subtle Motion
- Duration: 150-200ms (quick but not jarring)
- Easing: Deceleration curves (ease-out)
- Purpose: Explain what changed, not showboat
- Respect motion preferences (disable if user prefers)

**Why**: Animation should enhance understanding, not demand attention.

---

## Interaction Patterns

### Tool Selection
1. Click tool or press hotkey
2. Tool button shows active state (purple border)
3. Parameters panel crossfades to show tool settings
4. Canvas updates cursor if tool has custom cursor

**Never**:
- Open modal to configure tool
- Show settings in separate window
- Hide tool settings until user asks

### Panel Management
- All panels can float or dock
- Drag from header to reposition
- Magnetic snap to dock zones (20px)
- Tab-group by docking to existing panel
- Escape to close non-essential panels

**Never**:
- Force panels into fixed positions
- Make panels undockable
- Hide panel controls

### Generation Workflow
1. Select Generate tool (or press 'g')
2. Fill prompt in Parameters panel
3. Press Enter or click Generate button
4. Loading spinners appear in thumbnail strip
5. Images appear when ready, subtle success ping
6. Click thumbnail to load onto canvas

**Never**:
- Block entire UI during generation
- Force modal to show settings
- Auto-load images onto canvas (user decides)

---

## Error Handling

### Graceful Degradation
- ComfyUI disconnected? Show banner, keep working on existing images
- Plugin missing? Hide affected features, don't crash
- Invalid input? Show inline error, don't block submission

### Clear Communication
- **Bad**: "Invalid input"
- **Good**: "Prompt is required"

- **Bad**: "Error 500"
- **Good**: "Connection to ComfyUI lost - Reconnecting..."

### Recovery Paths
Every error state must provide:
1. What went wrong (clear, non-technical)
2. Why it might have happened (actionable steps)
3. How to fix it (buttons, links, instructions)
4. How to get help (copy error details, documentation link)

---

## Accessibility Principles

### Keyboard First
- Every action has a keyboard shortcut
- Tab order is logical (left-to-right, top-to-bottom)
- Focus states are clearly visible
- Escape closes/dismisses/cancels

### Screen Reader Friendly
- Semantic HTML (button, nav, main, aside)
- ARIA labels for icon-only buttons
- Live regions for dynamic content
- Focus management in modals

### Visual Clarity
- Color is never the only indicator (use icons + text)
- Contrast ratios meet WCAG AA (4.5:1 for body text)
- Touch targets are 44×44px minimum
- Text is resizable without breaking layout

---

## What We Avoid

### ❌ Anti-Patterns

**Modal Abuse**
- Don't use modals for settings (use side panel)
- Don't use modals for tool options (use Parameters panel)
- Don't block UI unless absolutely necessary

**Notification Spam**
- Don't toast every action ("Layer selected" ❌)
- Don't interrupt with non-critical messages
- Don't use confetti/celebration animations

**Clever UI**
- Don't hide essential actions behind gestures
- Don't use non-standard interaction patterns
- Don't innovate where convention works

**Over-Engineering**
- Don't add features "just in case"
- Don't create abstractions for one-time use
- Don't optimize prematurely

---

## Decision-Making Framework

When designing a new feature, ask:

### 1. Is this essential?
If it's not core to image generation/editing, it probably doesn't belong.

### 2. Where does it live?
- Tool-specific? → Parameters panel
- Global action? → Top bar or command palette
- Contextual? → Right-click menu or hover control
- Rare? → Settings panel

### 3. How do users discover it?
- Keyboard shortcut? → Show in UI
- Hidden feature? → Add to command palette
- Advanced option? → Progressive disclosure

### 4. What's the escape route?
- Can users undo it?
- Can they cancel mid-process?
- Can they dismiss/close/escape?
- What happens if they make a mistake?

### 5. Does it break flow?
- Does it require a modal? (try harder to avoid)
- Does it block other actions? (probably wrong)
- Does it steal focus from canvas? (rethink)

---

## Examples in Practice

### ✅ Good: Tool Selection
- Click tool → Parameters panel updates → Keep working
- No modal, no interruption, everything inline

### ❌ Bad: Tool Selection
- Click tool → Modal opens for settings → Must click "OK" to continue
- Breaks flow, adds friction, frustrates users

### ✅ Good: Layer Rename
- Double-click layer name → Inline edit → Press Enter
- Fast, obvious, no mode switches

### ❌ Bad: Layer Rename
- Click layer → Click "Rename" button → Modal with text field → Click "OK"
- Four clicks for what should be one

### ✅ Good: Generation Error
- Toast: "Generation failed - click for details"
- Click → Modal with error details, retry button, copy button
- Non-blocking by default, details on demand

### ❌ Bad: Generation Error
- Immediate modal: "Error! Check console for details"
- Blocks all work, provides no actionable info, requires developer knowledge

---

## Quotes to Remember

> "Modals are interruptions. Use them sparingly."

> "If a user has to choose between two paths, you haven't designed it yet."

> "Consistency reduces cognitive load. Users learn once, apply everywhere."

> "Canvas is king. Everything else is supporting cast."

> "Show only what's relevant. Hide everything else."

> "Every error state must provide a recovery path."

> "Animation should explain, not entertain."

---

## For Implementers

When building a component:
1. Check this doc first - is there an existing pattern?
2. Use design tokens (colors, spacing, typography)
3. Follow the interaction hierarchy (inline > popover > toast > panel > modal)
4. Add keyboard shortcuts
5. Handle all states (empty, loading, error, success, disabled)
6. Test with keyboard only
7. Test with screen reader
8. Test with reduced motion enabled

---

## For Reviewers

When reviewing a PR:
1. Does it follow existing patterns?
2. Is it consistent with the rest of the UI?
3. Does it optimize for creative flow?
4. Are there escape routes/undo mechanisms?
5. Does it handle all edge cases?
6. Is it accessible?
7. Does it respect user preferences (motion, theme)?

---

**Status**: Living Document
**Maintenance**: Update when adding new patterns or making architectural changes
