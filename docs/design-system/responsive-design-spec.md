# Responsive Design Specification

**Date**: 2026-01-29
**Status**: P0 - Implementation Blocker
**Related**: Frontend Redesign Section 1 (Layout)

---

## Breakpoint Strategy

### Defined Breakpoints

```typescript
export const breakpoints = {
  mobile: 320,      // Min supported width
  tablet: 768,      // iPad portrait
  desktop: 1280,    // Standard desktop
  wide: 1920,       // Wide desktop
} as const;

// Media queries
const media = {
  mobile: `(max-width: ${breakpoints.tablet - 1}px)`,      // 320-767
  tablet: `(min-width: ${breakpoints.tablet}px) and (max-width: ${breakpoints.desktop - 1}px)`, // 768-1279
  desktop: `(min-width: ${breakpoints.desktop}px)`,        // 1280+
  wide: `(min-width: ${breakpoints.wide}px)`,              // 1920+
};
```

---

## Desktop Layout (≥1280px)

**Full Featured - As Designed**

- Floating/dockable panels (Figma-style)
- Tool palette: Floating (60px wide)
- Parameters panel: Dockable (280px wide)
- Layers panel: Dockable (280px wide)
- Thumbnail strip: Floating (120px tall)
- Canvas: ~70% of viewport
- All docking features enabled

**No Compromises**

---

## Tablet Layout (768px - 1279px)

**Constrained Docking**

### Layout Adjustments

**Tool Palette:**
- Becomes horizontal bar at top of canvas
- 44×44px buttons in row
- Sticky to canvas top
- Still shows icon + hotkey

**Parameters Panel:**
- Fixed to right sidebar (cannot float)
- Width: 240px (down from 280px)
- Can be hidden/shown with toggle
- Cannot tab-group (no space)

**Layers Panel:**
- Below Parameters (if both visible)
- OR tabs with Parameters (switch between)
- Width: 240px
- Can be hidden

**Thumbnail Strip:**
- Fixed to bottom (cannot float)
- Height: 100px (down from 120px)
- Thumbnails: 80×80px (down from 96px)
- Can be hidden/collapsed

**Canvas:**
- Takes remaining space
- Min width: ~400px (depends on panels shown)

### Interaction Changes

- **No floating panels** - All panels fixed to edges
- **No magnetic docking** - Panels don't move
- **Panel toggles** - Buttons to show/hide panels (more important)
- **Simpler layout** - Less customization, more predictability

### Panel Visibility Toggles

```
Top bar gains panel toggles:
[☰ Tools] [📊 Parameters] [📑 Layers] [🖼️ Thumbnails]
```

Click to show/hide panels. Hidden panels free up canvas space.

---

## Mobile Layout (<768px)

**Simplified Stacked Layout**

Mobile is **read-only mode** by default:
- View generations
- Browse history
- See generation settings
- Export images

**NOT supported on mobile V1:**
- Canvas editing
- Tool usage
- Layer management
- Advanced settings

### Layout Structure

**Portrait (320px - 767px):**

```
┌─────────────────────┐
│ [☰] ComfyStudio [⚙] │  Top bar (48px)
├─────────────────────┤
│                     │
│   Current Image     │  Full width image view
│   (fit to width)    │
│                     │
├─────────────────────┤
│ ▼ Details           │  Collapsible sections
│   Prompt: "..."     │
│   Model: SD-XL      │
│   Steps: 20         │
├─────────────────────┤
│ ▼ History           │
│ [img][img][img]...  │  Horizontal scroll
├─────────────────────┤
│ [Export] [Delete]   │  Bottom actions
└─────────────────────┘
```

**Key Characteristics:**
- **Stacked vertically** - No sidebars
- **Full-width image** - Canvas takes full width
- **Collapsible sections** - Tap to expand Details, History, etc.
- **Horizontal scroll** - History thumbnails scroll horizontally
- **Bottom actions** - Export, Delete, Share buttons at bottom

### Mobile-Specific Features

**Swipe Navigation:**
- Swipe left/right on image → Previous/Next generation
- Swipe up on image → Open full-screen view
- Swipe down in full-screen → Close

**Touch Optimizations:**
- All buttons min 44×44px touch target
- Spacing between tappable elements: 8px min
- No hover states (use active/pressed)
- Long-press for context menus

**Mobile Top Bar:**
```
[☰ Menu] ComfyStudio [⚙ Settings]
```

Menu opens drawer:
- View Mode (Current/History/All)
- Export
- Settings
- Help

---

## Landscape Mobile (568px × 320px)

**Side-by-side when possible:**

```
┌────────────┬────────────┐
│            │  ▼ Details │
│   Image    │  Prompt... │
│            │            │
│            │  ▼ History │
│            │  [img][img]│
└────────────┴────────────┘
```

- Image on left (60% width)
- Panels on right (40% width)
- Still simplified (no canvas editing)

---

## Wide Desktop (≥1920px)

**Enhanced Layout**

### More Canvas Space

- Tool palette: Can stay floating or dock to far left
- Parameters: 320px width (up from 280px)
- Layers: 320px width
- Thumbnail strip: Can be wider (up to 90% canvas width)
- Canvas: Even more space (~75% viewport)

### Additional Features (Optional)

- **Dual panel areas** - Dock panels to both left and right
- **Larger thumbnails** - 120×120px in strip
- **More visible batch history** - Show 6+ batches at once

---

## Component Responsive Behavior

### Tool Palette

| Breakpoint | Behavior |
|------------|----------|
| Desktop (≥1280px) | Floating vertical panel (60px wide) |
| Tablet (768-1279px) | Horizontal bar at top of canvas |
| Mobile (<768px) | Hidden (not needed in view-only mode) |

### Parameters Panel

| Breakpoint | Behavior |
|------------|----------|
| Desktop (≥1280px) | Dockable, 280px width |
| Tablet (768-1279px) | Fixed right, 240px, can hide |
| Mobile (<768px) | N/A (no editing) |

### Layers Panel

| Breakpoint | Behavior |
|------------|----------|
| Desktop (≥1280px) | Dockable, 280px width |
| Tablet (768-1279px) | Fixed right, 240px, tabs with Parameters |
| Mobile (<768px) | N/A (no editing) |

### Thumbnail Strip

| Breakpoint | Behavior |
|------------|----------|
| Desktop (≥1280px) | Floating bottom, 120px tall, 96×96px thumbs |
| Tablet (768-1279px) | Fixed bottom, 100px tall, 80×80px thumbs |
| Mobile (<768px) | Horizontal scroll section, 64×64px thumbs |

### Canvas

| Breakpoint | Behavior |
|------------|----------|
| Desktop (≥1280px) | ~70% viewport, infinite pan/zoom |
| Tablet (768-1279px) | Remaining space, limited zoom |
| Mobile (<768px) | Full width, fit-to-screen, pinch zoom only |

---

## Responsive Images

### Canvas Images

**Desktop/Tablet:**
- Rendered at actual resolution (or scaled to fit)
- Zoom: 10% to 500%
- Pan: Infinite

**Mobile:**
- Fit to width (always visible)
- Pinch zoom: 100% to 300% (limited)
- Pan: Limited to image bounds

### Thumbnails

**Desktop:**
- 96×96px @ 2x = 192px actual
- High quality

**Tablet:**
- 80×80px @ 2x = 160px actual
- Good quality

**Mobile:**
- 64×64px @ 2x = 128px actual
- Optimized for performance

---

## Typography Scaling

### Desktop (≥1280px)

```css
--font-size-heading: 16px;
--font-size-body: 14px;
--font-size-small: 12px;
--font-size-tiny: 11px;
```

### Tablet (768-1279px)

```css
--font-size-heading: 15px;
--font-size-body: 13px;
--font-size-small: 11px;
--font-size-tiny: 10px;
```

### Mobile (<768px)

```css
--font-size-heading: 16px;  /* Slightly larger for readability */
--font-size-body: 14px;     /* No smaller than desktop */
--font-size-small: 13px;    /* Minimum for touch screens */
--font-size-tiny: 12px;     /* Never below 12px */
```

**Principle**: Never make text smaller on mobile. Make layout simpler instead.

---

## Spacing Adjustments

### Desktop
- Panel padding: 24px
- Section gaps: 16px
- Button spacing: 8px

### Tablet
- Panel padding: 16px
- Section gaps: 12px
- Button spacing: 8px

### Mobile
- Panel padding: 16px
- Section gaps: 16px (more breathing room)
- Button spacing: 12px (easier to tap)

---

## Touch Enhancements (Mobile/Tablet)

### Touch Targets

**Minimum sizes:**
- Buttons: 44×44px (WCAG AAA)
- Tool buttons: 48×48px on mobile (easier)
- Slider handles: 28px diameter (easier to grab)
- Checkbox/radio: 24×24px

### Touch Interactions

**Canvas (mobile):**
- One finger: Pan
- Two fingers: Pinch zoom
- Double-tap: Zoom to fit
- Long-press: Context menu (if editing enabled)

**Thumbnail strip:**
- Tap: Select/view image
- Long-press: Context menu (delete, export, share)
- Swipe: Horizontal scroll

---

## Performance Considerations

### Desktop
- Full resolution rendering
- All animations enabled
- 60fps target

### Tablet
- Reduced resolution for large canvases
- Animations enabled but simplified
- 60fps target

### Mobile
- Optimized image loading (progressive)
- Reduced animations (respect prefers-reduced-motion)
- 30fps acceptable (battery saving)
- Lazy load thumbnails

---

## Orientation Handling

### Portrait (Default)
- Stacked vertical layout
- Full-width canvas
- Collapsible sections

### Landscape
- Side-by-side if space permits
- Otherwise, same as portrait but wider canvas

### Orientation Change
- Save scroll position
- Preserve panel visibility states
- Smooth transition (no flash)

---

## Minimum Supported Resolution

**Absolute minimum:**
- Width: 320px (iPhone SE)
- Height: 568px

**Recommended minimum:**
- Width: 375px (iPhone standard)
- Height: 667px

**Below minimum:**
- Show message: "Screen too small. Please use a larger device or rotate to landscape."

---

## Implementation Strategy

### Phase 1: Desktop First
Build full desktop experience (≥1280px) as specified in main design.

### Phase 2: Tablet Adaptation
Adapt to tablet (768-1279px):
- Convert floating panels to fixed
- Add panel toggles
- Test on iPad

### Phase 3: Mobile View-Only
Build mobile read-only mode (<768px):
- Image viewing
- History browsing
- Export functionality

### Phase 4: Mobile Editing (Future)
Add mobile canvas editing (V2):
- Touch-optimized tools
- Simplified parameters
- Gesture controls

---

## Testing Matrix

| Device | Resolution | Test Cases |
|--------|------------|------------|
| Desktop | 1920×1080 | Full feature set, docking, floating panels |
| Desktop | 1280×720 | Minimum desktop, tight layout |
| iPad Pro | 1024×1366 | Tablet portrait, fixed panels |
| iPad | 768×1024 | Minimum tablet, panel toggles |
| iPhone 14 | 390×844 | Mobile portrait, view-only |
| iPhone SE | 375×667 | Minimum mobile, readability |
| Galaxy S23 | 360×800 | Android mobile, touch targets |

---

## Responsive Design Utilities

### React Hooks

```typescript
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const updateBreakpoint = () => {
      if (window.innerWidth < 768) setBreakpoint('mobile');
      else if (window.innerWidth < 1280) setBreakpoint('tablet');
      else setBreakpoint('desktop');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
}

export function useIsMobile() {
  return useBreakpoint() === 'mobile';
}

export function useIsTablet() {
  return useBreakpoint() === 'tablet';
}

export function useIsDesktop() {
  return useBreakpoint() === 'desktop';
}
```

---

## CSS Media Queries

```css
/* Mobile first (base styles) */
.panel {
  width: 100%;
  position: relative;
}

/* Tablet */
@media (min-width: 768px) {
  .panel {
    width: 240px;
    position: fixed;
  }
}

/* Desktop */
@media (min-width: 1280px) {
  .panel {
    width: 280px;
    position: absolute; /* For floating */
  }
}
```

---

**Status**: P0 Gap Filled
**Next**: Gap B (Multi-Image Canvas Workflow)
