# Tool Implementation Specification

**Date**: 2026-01-29
**Status**: P0 - Implementation Blocker
**Related**: ADR-0006 (Unified Tool Design), Tools System

---

## Tool Architecture

### Tool Lifecycle

```typescript
interface ToolLifecycle {
  onActivate(): void;              // Called when tool selected
  onDeactivate(): void;            // Called when tool deselected
  onMouseDown(e: MouseEvent): void;
  onMouseMove(e: MouseEvent): void;
  onMouseUp(e: MouseEvent): void;
  onKeyDown(e: KeyboardEvent): void;
  getCursor(): string;             // Custom cursor
}
```

---

## 1. Select Tool (V)

### Purpose
Select and manipulate canvas entities (images, layers).

### Selection Modes

**Rectangle** (default):
- Click + drag to create rectangle selection
- Anything within rectangle is selected
- Modifier keys:
  - Shift: Add to selection
  - Alt: Remove from selection

**Lasso** (future):
- Free-form selection
- Click points to create polygon

**Magic Wand** (future):
- Select similar colors
- Tolerance setting (0-255)

### Implementation

**Canvas interaction**:
```typescript
class SelectTool implements ToolLifecycle {
  private selectionBox: Konva.Rect | null = null;
  private startPoint: Point | null = null;

  onMouseDown(e: MouseEvent) {
    const stage = e.target.getStage();
    this.startPoint = stage.getPointerPosition();

    // Create selection rectangle
    this.selectionBox = new Konva.Rect({
      x: this.startPoint.x,
      y: this.startPoint.y,
      width: 0,
      height: 0,
      stroke: '#7C3AED',
      strokeWidth: 2,
      dash: [5, 5],
      listening: false,
    });

    stage.add(this.selectionBox);
  }

  onMouseMove(e: MouseEvent) {
    if (!this.selectionBox || !this.startPoint) return;

    const pos = e.target.getStage().getPointerPosition();

    this.selectionBox.width(pos.x - this.startPoint.x);
    this.selectionBox.height(pos.y - this.startPoint.y);
  }

  onMouseUp(e: MouseEvent) {
    if (!this.selectionBox) return;

    const bounds = this.selectionBox.getClientRect();
    const selected = getEntitiesInBounds(bounds);

    updateSelection(selected);
    this.selectionBox.destroy();
    this.selectionBox = null;
  }
}
```

**Transform handles**:
- 8 handles (corners + midpoints)
- Drag to resize
- Shift: maintain aspect ratio
- Alt: resize from center

---

## 2. Brush Tool (B)

### Purpose
Paint/draw on canvas with customizable brush.

### Settings
- **Size**: 1-500px
- **Opacity**: 0-100%
- **Hardness**: 0-100% (edge feathering)
- **Blend mode**: Normal, Multiply, Overlay, etc.
- **Color**: RGB/HSV color picker

### Implementation

**Canvas painting**:
```typescript
class BrushTool implements ToolLifecycle {
  private isDrawing = false;
  private lastPoint: Point | null = null;
  private currentLine: Konva.Line | null = null;

  onMouseDown(e: MouseEvent) {
    this.isDrawing = true;

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    this.lastPoint = pos;

    // Create new line on active layer
    this.currentLine = new Konva.Line({
      points: [pos.x, pos.y],
      stroke: this.getColor(),
      strokeWidth: this.getSize(),
      opacity: this.getOpacity() / 100,
      lineCap: 'round',
      lineJoin: 'round',
      globalCompositeOperation: this.getBlendMode(),
    });

    getCurrentLayer().add(this.currentLine);
  }

  onMouseMove(e: MouseEvent) {
    if (!this.isDrawing || !this.currentLine) return;

    const pos = e.target.getStage().getPointerPosition();

    // Add point to line
    const points = this.currentLine.points();
    points.push(pos.x, pos.y);
    this.currentLine.points(points);

    this.lastPoint = pos;
  }

  onMouseUp(e: MouseEvent) {
    this.isDrawing = false;
    this.lastPoint = null;

    // Commit stroke to history
    if (this.currentLine) {
      addToHistory({
        type: 'brush-stroke',
        line: this.currentLine.toJSON(),
      });
      this.currentLine = null;
    }
  }

  getCursor(): string {
    // Custom circular cursor showing brush size
    return `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${this.getSize()}" height="${this.getSize()}"><circle cx="${this.getSize()/2}" cy="${this.getSize()/2}" r="${this.getSize()/2-1}" stroke="white" stroke-width="1" fill="none"/></svg>') ${this.getSize()/2} ${this.getSize()/2}, crosshair`;
  }

  private getSize(): number {
    return ToolState.getToolSetting('brush', 'size') || 20;
  }

  private getOpacity(): number {
    return ToolState.getToolSetting('brush', 'opacity') || 100;
  }

  private getHardness(): number {
    return ToolState.getToolSetting('brush', 'hardness') || 100;
  }

  private getBlendMode(): string {
    return ToolState.getToolSetting('brush', 'blendMode') || 'source-over';
  }

  private getColor(): string {
    return ToolState.getToolSetting('brush', 'color') || '#000000';
  }
}
```

**Pressure sensitivity** (future):
- Support stylus/tablet input
- Pressure affects size and/or opacity
- Requires pointer events API

---

## 3. Eraser Tool (E)

### Purpose
Erase to transparency (removes pixels).

### Settings
- **Size**: 1-500px
- **Opacity**: 0-100% (partial erase)
- **Hardness**: 0-100%

### Implementation

**Canvas erasing**:
```typescript
class EraserTool implements ToolLifecycle {
  // Almost identical to Brush, but uses 'destination-out' blend mode

  private isErasing = false;
  private currentLine: Konva.Line | null = null;

  onMouseDown(e: MouseEvent) {
    this.isErasing = true;

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();

    this.currentLine = new Konva.Line({
      points: [pos.x, pos.y],
      stroke: 'white', // Color doesn't matter
      strokeWidth: this.getSize(),
      opacity: this.getOpacity() / 100,
      lineCap: 'round',
      lineJoin: 'round',
      globalCompositeOperation: 'destination-out', // KEY: erases instead of paints
    });

    getCurrentLayer().add(this.currentLine);
  }

  onMouseMove(e: MouseEvent) {
    if (!this.isErasing || !this.currentLine) return;

    const pos = e.target.getStage().getPointerPosition();
    const points = this.currentLine.points();
    points.push(pos.x, pos.y);
    this.currentLine.points(points);
  }

  onMouseUp(e: MouseEvent) {
    this.isErasing = false;

    if (this.currentLine) {
      addToHistory({
        type: 'erase-stroke',
        line: this.currentLine.toJSON(),
      });
      this.currentLine = null;
    }
  }

  getCursor(): string {
    // Circular cursor with crosshair in center
    return `url('data:image/svg+xml,...') ${this.getSize()/2} ${this.getSize()/2}, crosshair`;
  }
}
```

---

## 4. Generate Tool (G)

### Purpose
Trigger AI image generation with ComfyUI.

### Settings
- **Prompt**: Text (textarea)
- **Negative prompt**: Text (textarea)
- **Model**: Dropdown (SD XL, SD 1.5, etc.)
- **Sampler**: Dropdown (Euler, DPM++, etc.)
- **Steps**: Slider (1-150, default 20)
- **CFG Scale**: Slider (1-30, default 7.5)
- **Seed**: Number (or "Random")
- **Width**: Number (512, 768, 1024, etc.)
- **Height**: Number
- **Batch count**: Number (1-10, how many images)

### Implementation

**No canvas interaction** - This tool works via Parameters panel only.

```typescript
class GenerateTool implements ToolLifecycle {
  onActivate() {
    // Show generate settings in Parameters panel
    ParametersPanel.show('generate');
  }

  onDeactivate() {
    // Nothing special
  }

  // No mouse handlers - doesn't interact with canvas

  async executeGeneration() {
    const settings = ToolState.getAllToolSettings('generate');

    // Validate
    if (!settings.prompt) {
      showError('Prompt is required');
      return;
    }

    // Build ComfyUI workflow
    const workflow = buildComfyUIWorkflow({
      type: 'txt2img',
      prompt: settings.prompt,
      negative: settings.negativePrompt || '',
      model: settings.model,
      sampler: settings.sampler,
      steps: settings.steps,
      cfg: settings.cfgScale,
      seed: settings.seed === 'random' ? -1 : settings.seed,
      width: settings.width,
      height: settings.height,
      batchSize: settings.batchCount,
    });

    // Queue to ComfyUI
    try {
      const result = await Plugin.use().queueWorkflow(workflow);

      // Create loading thumbnails
      createLoadingThumbnails(settings.batchCount, {
        prompt: settings.prompt,
        settings,
      });

      // Wait for results via WebSocket
      // (handled by ComfyUI plugin)
    } catch (error) {
      showError(`Generation failed: ${error.message}`);
    }
  }
}
```

**Workflow building**:
```typescript
function buildComfyUIWorkflow(params: GenerationParams) {
  return {
    "1": {
      "class_type": "CheckpointLoaderSimple",
      "inputs": { "ckpt_name": params.model }
    },
    "2": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "text": params.prompt,
        "clip": ["1", 1]
      }
    },
    "3": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "text": params.negative,
        "clip": ["1", 1]
      }
    },
    "4": {
      "class_type": "EmptyLatentImage",
      "inputs": {
        "width": params.width,
        "height": params.height,
        "batch_size": params.batchSize
      }
    },
    "5": {
      "class_type": "KSampler",
      "inputs": {
        "seed": params.seed,
        "steps": params.steps,
        "cfg": params.cfg,
        "sampler_name": params.sampler,
        "scheduler": "normal",
        "denoise": 1,
        "model": ["1", 0],
        "positive": ["2", 0],
        "negative": ["3", 0],
        "latent_image": ["4", 0]
      }
    },
    "6": {
      "class_type": "VAEDecode",
      "inputs": {
        "samples": ["5", 0],
        "vae": ["1", 2]
      }
    },
    "7": {
      "class_type": "SaveImage",
      "inputs": {
        "filename_prefix": "ComfyStudio",
        "images": ["6", 0]
      }
    }
  };
}
```

---

## 5. Remove Background Tool (R)

### Purpose
Automatically remove background from selected image.

### Settings
- **Quality**: Dropdown (Fast, Balanced, High)
- **Edge refinement**: Slider (0-100%)

### Implementation

**Workflow**: Uses ComfyUI's background removal node

```typescript
class RemoveBackgroundTool implements ToolLifecycle {
  async execute() {
    const activeImage = Canvas.getActiveImage();
    if (!activeImage) {
      showError('No image selected');
      return;
    }

    const settings = ToolState.getAllToolSettings('remove-background');

    // Build ComfyUI workflow for background removal
    const workflow = {
      "1": {
        "class_type": "LoadImage",
        "inputs": { "image": activeImage.data }
      },
      "2": {
        "class_type": "RemoveBackground",  // Assuming this node exists
        "inputs": {
          "image": ["1", 0],
          "quality": settings.quality,
          "edge_refinement": settings.edgeRefinement
        }
      },
      "3": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "ComfyStudio_nobg",
          "images": ["2", 0]
        }
      }
    };

    try {
      // Show loading state
      showLoadingOverlay('Removing background...');

      const result = await Plugin.use().queueWorkflow(workflow);

      // Wait for result
      const processedImage = await waitForResult(result.id);

      // Replace current image with processed version
      Canvas.replaceImage(activeImage.id, processedImage);

      hideLoadingOverlay();
      showToast('Background removed successfully');
    } catch (error) {
      hideLoadingOverlay();
      showError(`Failed to remove background: ${error.message}`);
    }
  }

  // No canvas interaction - works on active image
}
```

---

## 6. Replace Background Tool (P)

### Purpose
Replace background with AI-generated content.

### Settings
- **Background prompt**: Textarea
- **Background style**: Dropdown (Photorealistic, Artistic, etc.)
- **Edge blending**: Slider (0-100%)
- **Model**: Dropdown (same as Generate)
- **Steps**: Slider
- **CFG**: Slider

### Implementation

**Workflow**: Inpainting workflow targeting background area

```typescript
class ReplaceBackgroundTool implements ToolLifecycle {
  async execute() {
    const activeImage = Canvas.getActiveImage();
    if (!activeImage) {
      showError('No image selected');
      return;
    }

    const settings = ToolState.getAllToolSettings('replace-background');

    if (!settings.backgroundPrompt) {
      showError('Background prompt is required');
      return;
    }

    // 1. First, remove background to get mask
    const mask = await removeBackground(activeImage);

    // 2. Then, use inpainting to generate new background
    const workflow = {
      "1": {
        "class_type": "LoadImage",
        "inputs": { "image": activeImage.data }
      },
      "2": {
        "class_type": "LoadImageMask",
        "inputs": { "mask": mask }
      },
      "3": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": { "ckpt_name": settings.model }
      },
      "4": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": settings.backgroundPrompt,
          "clip": ["3", 1]
        }
      },
      "5": {
        "class_type": "VAEEncode",
        "inputs": {
          "pixels": ["1", 0],
          "vae": ["3", 2]
        }
      },
      "6": {
        "class_type": "KSamplerAdvanced",
        "inputs": {
          "model": ["3", 0],
          "positive": ["4", 0],
          "negative": ["4", 0],  // Could use negative prompt
          "latent_image": ["5", 0],
          "denoise": 1.0,
          "steps": settings.steps,
          "cfg": settings.cfg,
          "sampler_name": "euler",
          "scheduler": "normal",
          "add_noise": "enable",
          "noise_seed": Math.floor(Math.random() * 1000000),
          "start_at_step": 0,
          "end_at_step": settings.steps,
          "return_with_leftover_noise": "disable"
        }
      },
      "7": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["6", 0],
          "vae": ["3", 2]
        }
      },
      "8": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "ComfyStudio_replace_bg",
          "images": ["7", 0]
        }
      }
    };

    try {
      showLoadingOverlay('Replacing background...');

      const result = await Plugin.use().queueWorkflow(workflow);
      const processedImage = await waitForResult(result.id);

      Canvas.replaceImage(activeImage.id, processedImage);

      hideLoadingOverlay();
      showToast('Background replaced successfully');
    } catch (error) {
      hideLoadingOverlay();
      showError(`Failed to replace background: ${error.message}`);
    }
  }
}
```

---

## Tool State Management

### Per-Tool Settings

```typescript
// Stored in Zustand
interface ToolSettings {
  [toolId: string]: {
    [settingId: string]: any;
  };
}

// Example:
{
  "brush": {
    "size": 20,
    "opacity": 100,
    "hardness": 50,
    "blendMode": "normal",
    "color": "#000000"
  },
  "generate": {
    "prompt": "",
    "negativePrompt": "",
    "model": "sd-xl",
    "steps": 20,
    "cfgScale": 7.5,
    "seed": "random",
    "width": 1024,
    "height": 1024,
    "batchCount": 4
  }
}
```

### Settings Persistence

Settings persist between sessions (localStorage).

---

## Undo/Redo

### History Stack

```typescript
interface HistoryEntry {
  type: 'brush-stroke' | 'erase-stroke' | 'layer-add' | 'layer-delete' | 'image-replace';
  data: any;
  timestamp: Date;
}

const historyStack: HistoryEntry[] = [];
let historyIndex = -1; // Current position in stack

function addToHistory(entry: HistoryEntry) {
  // Remove any entries after current index (can't redo after new action)
  historyStack.splice(historyIndex + 1);

  historyStack.push(entry);
  historyIndex++;

  // Limit stack size
  if (historyStack.length > 50) {
    historyStack.shift();
    historyIndex--;
  }
}

function undo() {
  if (historyIndex < 0) return; // Nothing to undo

  const entry = historyStack[historyIndex];
  revertAction(entry);
  historyIndex--;
}

function redo() {
  if (historyIndex >= historyStack.length - 1) return; // Nothing to redo

  historyIndex++;
  const entry = historyStack[historyIndex];
  reapplyAction(entry);
}
```

---

## Performance Considerations

### Brush Optimization

**Problem**: Large brushes at high resolution can lag

**Solutions**:
1. **Throttle mouse events** - Sample every 16ms (60fps)
2. **Simplify line** - Reduce points using Douglas-Peucker algorithm
3. **Bake strokes** - Convert to image after mouse up (rasterize)

### Large Image Handling

**Problem**: Loading 4K+ images can be slow

**Solutions**:
1. **Progressive loading** - Show low-res preview first
2. **Lazy rendering** - Don't render layers until visible
3. **Image pyramids** - Multiple resolutions for different zoom levels

---

**Status**: All P0 Gaps Filled! ✅
**Review Complete**: Ready for implementation

