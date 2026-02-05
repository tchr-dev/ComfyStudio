# Multi-Image Canvas Workflow Specification

**Date**: 2026-01-29
**Status**: P0 - Implementation Blocker
**Related**: Frontend Redesign Section 4 (Canvas)

---

## Core Decision: Single Active Image Model

**Architecture**: Canvas displays **one primary image at a time** for editing, with ability to load/switch between images.

**Rationale**:
- Simpler mental model (one focus at a time)
- Matches ComfyUI workflow (operates on single images)
- Avoids complex multi-image selection states
- Layer panel maps 1:1 with active image
- Tools operate on one image context

---

## Canvas States

### State 1: Empty Canvas
- No images loaded
- Shows empty state: "Drop an image or generate one to get started"
- Thumbnail strip may have history, but nothing on canvas

### State 2: Single Image Active
- One image displayed on canvas
- Image is centered, fit-to-view by default
- Layers panel shows layers for this image
- Tools operate on this image
- This is the **primary editing state**

### State 3: Image Switching
- User clicks different thumbnail
- Current image fades out (200ms)
- New image fades in (200ms)
- Layers panel updates to show new image's layers
- Canvas recenters/rezooms to fit new image

---

## Loading Images onto Canvas

### From Thumbnail Strip

**Click thumbnail:**
1. Thumbnail gets selected state (purple border)
2. If canvas empty → Image loads immediately
3. If canvas has image → Current image replaced with new one
4. Canvas resets zoom/pan to fit new image
5. Layers panel updates

**Visual feedback:**
- Loading: Brief fade transition (200ms)
- Success: Image appears, thumbnail stays selected
- Error: Error toast, canvas stays in previous state

### From File Import

**Click "Import from file" or drag-drop:**
1. File picker opens (or file dropped)
2. Image validates (format, size)
3. If valid → Loads onto canvas (replaces current if any)
4. Image does NOT appear in thumbnail strip (not a generation)
5. New layer created in Layers panel

### From Generation

**When generation completes:**
1. New thumbnails appear in strip
2. Canvas unchanged (user might be working on something)
3. User manually clicks thumbnail to load
4. **No auto-load** - respect user's current work

---

## Multi-Image Comparison

**Problem**: Users want to compare multiple generations

**Solution**: **Comparison Mode** (dedicated feature)

### Entering Comparison Mode

**Trigger**: Right-click thumbnail → "Compare with current"

**OR**: Select multiple thumbnails (Cmd/Ctrl+Click) → "Compare" button appears

### Comparison Mode Layout

```
┌─────────────────────────────────────────────┐
│  Exit Comparison   [1/4 selected]           │
├─────────────┬─────────────┬─────────────────┤
│             │             │                 │
│   Image A   │   Image B   │    Image C     │
│   (current) │  (compare)  │   (compare)    │
│             │             │                 │
│  ⭐ [Load]  │   [Load]    │     [Load]     │
└─────────────┴─────────────┴─────────────────┘
```

**Behavior**:
- Canvas splits into grid (2-4 images max)
- Each image shows its thumbnail + prompt below
- Click [Load] to load that image into normal editing mode
- Tools disabled in comparison mode (view-only)
- Can zoom all images together (synchronized) or individually

**Exit**: Click "Exit Comparison" or press Escape

---

## Layers and Multi-Image

### Layers Belong to Images

**Model**: Each image has its own layer stack

```
Image A:
  - Layer 1: Background
  - Layer 2: Brush strokes
  - Layer 3: Generated overlay

Image B:
  - Layer 1: Background
  - Layer 2: Adjustments
```

**Layers panel shows layers for active canvas image only**

### Switching Images Updates Layers

When user loads Image B onto canvas:
1. Layers panel clears
2. Layers panel populates with Image B's layers
3. Previous image (A) and its layers preserved in memory
4. Switch back to A → A's layers restore

### Cross-Image Layer Operations (Future/V2)

Not supported in V1:
- Copy layer from one image to another
- Merge multiple images
- Layer groups spanning images

---

## Canvas Image Management

### Loading Image

```typescript
interface CanvasImage {
  id: string;                    // Unique ID
  sourceType: 'generation' | 'import' | 'edit';
  sourceId?: string;             // Generation batch ID or file path
  data: ImageData;               // Actual image data
  layers: Layer[];               // Associated layers
  transform: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
  metadata: {
    prompt?: string;
    model?: string;
    settings?: GenerationSettings;
    created: Date;
    modified: Date;
  };
}
```

### Active Image State

```typescript
interface CanvasState {
  activeImage: CanvasImage | null;   // Currently displayed
  imageHistory: CanvasImage[];       // Previously loaded (for undo/switch back)
  viewport: {
    zoom: number;                    // Current zoom level
    pan: { x: number; y: number };   // Current pan position
  };
}
```

### Image Operations

**Load Image:**
```typescript
function loadImageToCanvas(image: CanvasImage): void {
  // Save current image to history
  if (canvasState.activeImage) {
    canvasState.imageHistory.push(canvasState.activeImage);
  }

  // Load new image
  canvasState.activeImage = image;

  // Reset viewport
  fitImageToView(image);

  // Update layers panel
  layersPanel.setLayers(image.layers);
}
```

**Clear Canvas:**
```typescript
function clearCanvas(): void {
  if (canvasState.activeImage) {
    // Confirm if unsaved changes
    if (hasUnsavedChanges()) {
      showConfirmModal("Unsaved changes will be lost. Continue?");
    }

    canvasState.activeImage = null;
    layersPanel.clear();
    showEmptyState();
  }
}
```

**Delete Canvas Image:**
- Keyboard: Delete or Backspace
- Context menu: Right-click canvas → "Clear canvas"
- Confirmation if unsaved changes

---

## Image History (Canvas History)

### Recently Loaded Images

Canvas maintains short history of recently loaded images:

```typescript
interface ImageHistory {
  images: CanvasImage[];     // Last 5 loaded images
  currentIndex: number;      // Current position in history
}
```

### Navigation

**Keyboard shortcuts:**
- `Cmd/Ctrl + [` - Previous image in history
- `Cmd/Ctrl + ]` - Next image in history

**UI:**
- Small prev/next arrows in canvas bottom-left (near zoom controls)
- Shows "2 / 5" (current / total in history)

**Behavior:**
- Max 5 images in history
- Oldest drops off when exceeding limit
- Loading same image again doesn't duplicate

---

## Multiple Windows (Future/V2)

**Not in V1**, but architecture should allow:

- Multiple ComfyStudio windows
- Each window has independent canvas
- Each window can load different image
- Useful for multi-monitor setups

**V1 Limitation**: Single window, single canvas, one active image

---

## Thumbnail Selection State

### Visual States

**Thumbnail in strip:**
- **Default**: No border, normal opacity
- **Hovered**: Slight scale (1.05×), elevated shadow
- **Selected** (loaded on canvas): Purple border (2px), 100% opacity
- **In history** (recently loaded): Small dot indicator in corner

### Selection Behavior

- **Single selection**: Only one thumbnail marked as "loaded on canvas"
- **Multi-select** (Cmd/Ctrl+Click): For comparison mode only, different visual (checkmark overlay)
- **Click selected thumbnail again**: No effect (already loaded)

---

## Edge Cases

### Case 1: Loading Image While Editing

**Scenario**: User is painting with brush, clicks different thumbnail

**Behavior**:
1. Show confirmation: "Unsaved changes will be lost. Load new image?"
2. [Cancel] - Stay on current image, continue editing
3. [Load Anyway] - Discard current edits, load new image
4. [Save & Load] - Save current to history, then load new

### Case 2: Generation Completes While Editing

**Scenario**: User editing Image A, generation of Image B completes

**Behavior**:
1. New thumbnails appear in strip (subtle notification)
2. Canvas unchanged (no interruption)
3. User decides when to load new image

### Case 3: Deleting Thumbnail of Loaded Image

**Scenario**: User has Image A on canvas, deletes Image A's thumbnail from strip

**Behavior**:
1. Confirm: "This image is currently loaded on canvas. Delete?"
2. If confirmed:
   - Thumbnail removes from strip
   - Canvas clears (image no longer in history)
   - Show empty state

### Case 4: Multiple Tabs Open

**Scenario**: User has ComfyStudio open in two browser tabs

**Behavior**:
- Each tab has independent canvas state
- Generation history syncs (shared via localStorage or backend)
- Canvas images don't sync (tab-specific)

---

## Comparison Mode Technical Details

### Grid Layout Algorithm

**2 images:**
```
┌─────────┬─────────┐
│ Image A │ Image B │
└─────────┴─────────┘
```

**3 images:**
```
┌─────────┬─────────┐
│ Image A │ Image B │
├─────────┴─────────┤
│     Image C       │
└───────────────────┘
```

**4 images:**
```
┌─────────┬─────────┐
│ Image A │ Image B │
├─────────┼─────────┤
│ Image C │ Image D │
└─────────┴─────────┘
```

**5+ images**: Not supported, show error "Max 4 images for comparison"

### Synchronized Zoom

**Toggle**: "Sync Zoom" checkbox at top

**When enabled:**
- Zooming one image zooms all
- Panning one image pans all (relative to each image's bounds)
- Useful for comparing details at same zoom level

**When disabled:**
- Each image has independent zoom/pan
- Useful for seeing overall vs detail simultaneously

---

## Performance Considerations

### Memory Management

**Active image:**
- Full resolution kept in memory
- All layers rendered

**History images:**
- Thumbnail cached (96×96px)
- Full resolution unloaded (can reload from source)
- Layers serialized to lightweight format

**Comparison mode:**
- Max 4 full-resolution images in memory
- If memory constrained, show warning: "Too many large images. Close some comparisons."

### Canvas Rendering

**Single image:**
- Full react-konva rendering
- 60fps target

**Comparison mode:**
- 4 separate Konva stages
- 30fps acceptable (static comparison, not editing)

---

## Integration with Thumbnail Strip

### Thumbnail Strip Responsibilities

- Shows generation history (batches of thumbnails)
- Indicates which image is loaded on canvas (selected state)
- Provides image source for loading onto canvas
- Supports multi-select for comparison mode

### Canvas Responsibilities

- Displays single active image for editing
- Manages layers for active image
- Provides viewport controls (zoom, pan)
- Handles tool interactions
- Maintains image history (recently loaded)

### Clear Separation

- Thumbnail strip = **History of generations**
- Canvas = **Current workspace**
- They're independent: can have 100 thumbnails but 0 or 1 on canvas

---

## UX Flows

### Flow 1: Generate and Edit

1. User fills prompt, clicks Generate
2. Generation completes → 4 thumbnails appear in strip
3. User clicks one thumbnail → Loads onto canvas
4. User selects Brush tool, paints
5. User clicks another thumbnail → Confirm dialog
6. User chooses [Save & Load] → First image saved to history, second loads

### Flow 2: Compare Generations

1. User generates multiple batches (12 images total)
2. User Cmd+Clicks 3 interesting thumbnails
3. "Compare" button appears above strip
4. User clicks Compare → Enters comparison mode
5. Canvas splits into 3-grid, shows selected images
6. User identifies best one, clicks [Load]
7. Exits comparison mode, best image now on canvas for editing

### Flow 3: Import and Edit

1. User clicks "Import from file"
2. Selects photo from computer
3. Image loads directly to canvas (no thumbnail)
4. User edits with tools
5. User clicks Generate → New thumbnails appear
6. User clicks new thumbnail → Imported image replaced (with confirmation)

---

## Summary

**Key Decisions:**
- ✅ Single active image model (not multi-image canvas)
- ✅ Layers belong to images (1:1 relationship)
- ✅ Thumbnail click loads image (with confirmation if editing)
- ✅ Comparison mode for multi-image viewing (dedicated feature)
- ✅ Image history for quick back/forward navigation
- ✅ No auto-load of generated images (user controls)

**Benefits:**
- Simple mental model
- Clear layer/image relationship
- No ambiguous selection states
- Performant (one image rendered at a time)
- Scales to future features (multi-window, etc.)

---

**Status**: P0 Gap Filled
**Next**: Gap C (Keyboard Shortcuts Complete Mapping)
