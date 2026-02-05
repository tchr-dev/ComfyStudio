# Generation Batch Management Specification

**Date**: 2026-01-29
**Status**: P1 - Should Have in V1
**Related**: Thumbnail Strip, Generation Workflow

---

## Problem Statement

Thumbnail strip grows infinitely as users generate more batches:
- Performance degrades with 100+ thumbnails
- Horizontal scrolling becomes unwieldy
- Memory usage increases
- Finding specific generation becomes difficult

**Solution**: Implement batch management with limits, pagination, and cleanup.

---

## Batch Limits

### In-Memory Limit

**Maximum batches in memory**: 25 batches (configurable)

**Reasoning**:
- Average 4 images/batch = 100 thumbnails max
- At 96×96px thumbnails = ~9MB memory (reasonable)
- Horizontal scroll still usable
- Performance remains good

**When limit exceeded**:
- Oldest batch(es) automatically removed from memory
- User can still access via "Show More" or search
- Removed batches persist in localStorage (if space available)

---

## Batch Structure

### Batch Data Model

```typescript
interface GenerationBatch {
  id: string;                        // Unique batch ID
  timestamp: Date;                   // When generated
  prompt: string;                    // User's prompt
  negativePrompt?: string;
  settings: GenerationSettings;      // Model, steps, CFG, etc.
  images: GeneratedImage[];          // Array of images in batch
  status: 'pending' | 'generating' | 'complete' | 'failed';
  progress?: number;                 // 0-100 if generating
  error?: string;                    // Error message if failed
}

interface GeneratedImage {
  id: string;
  url: string;                       // Data URL or blob URL
  thumbnail: string;                 // 96×96px thumbnail
  width: number;
  height: number;
  seed: number;
  selected: boolean;                 // If loaded on canvas
}
```

---

## Thumbnail Strip Display

### Visible Batches

**Default view**: Show last 10 batches

```
┌────────────────────────────────────────────────┐
│ "cat..." 5m ago  | "dragon..." 2m ago | ...    │
│ [🖼️][🖼️][🖼️][🖼️] | [🖼️][🖼️][🖼️][🖼️] | [+10]  │
└────────────────────────────────────────────────┘
                                          ↑
                                    "Show More" button
```

**After "Show More"**: Expand to show next 10 (up to 25 max in memory)

### Batch Header

Each batch shows:
- Truncated prompt (max 20 chars)
- Relative timestamp ("5m ago", "2h ago", "yesterday")
- Batch status icon (if generating/failed)

**Hover**: Shows full prompt in tooltip

---

## Batch Actions

### Per-Batch Actions

**Right-click batch header** opens context menu:

```
┌─────────────────────────┐
│ View Batch Details      │
│ Delete Batch            │
│ Export All Images       │
│ Regenerate with Settings│
│ Copy Settings           │
└─────────────────────────┘
```

**View Batch Details** - Opens modal:
```
┌─────────────────────────────────────┐
│ ╳  Batch Details                    │
├─────────────────────────────────────┤
│ Prompt: "a cute cat wearing..."     │
│ Model: Stable Diffusion XL          │
│ Steps: 20  CFG: 7.5  Seed: 12345   │
│                                     │
│ Generated: 2026-01-29 14:30         │
│ Images: 4                           │
│                                     │
│ [Export All]  [Delete Batch]        │
└─────────────────────────────────────┘
```

---

## Batch Deletion

### Single Batch Delete

**User action**: Right-click batch → "Delete Batch"

**Confirmation**:
```
┌─────────────────────────────────────┐
│ Delete Batch?                       │
├─────────────────────────────────────┤
│ This will delete 4 images.          │
│ This action cannot be undone.       │
│                                     │
│ [Cancel]           [Delete Batch]   │
└─────────────────────────────────────┘
```

**On confirm**:
1. Remove batch from memory
2. Remove from localStorage
3. Revoke blob URLs (free memory)
4. Animate batch sliding out (200ms)
5. Toast: "Batch deleted"

### Bulk Delete

**UI**: Thumbnail strip footer shows "Clear All" button

**On click**: Opens modal with options:
```
┌─────────────────────────────────────┐
│ ╳  Clear Generation History         │
├─────────────────────────────────────┤
│ [ ] Delete all batches              │
│ [ ] Delete batches older than 7 days│
│ [ ] Delete failed batches           │
│ [ ] Keep starred batches            │
│                                     │
│ This will delete XX batches.        │
│                                     │
│ [Cancel]              [Clear]       │
└─────────────────────────────────────┘
```

---

## Batch Starring (Favorites)

### Star Feature

**Purpose**: Protect important batches from auto-cleanup

**UI**: Star icon in batch header (top-right)

**Behavior**:
- Click star → Batch marked as favorite
- Starred batches exempt from auto-deletion
- Starred batches still count toward 25-batch limit
- Can manually delete starred batches

**Visual**:
- Unstarred: Empty star outline (☆)
- Starred: Filled star (⭐)

---

## Batch Persistence

### LocalStorage Strategy

**What persists**:
- Last 25 batches (or until quota exceeded)
- Thumbnails only (96×96px), not full images
- Full images only persist if loaded on canvas

**Storage key**: `comfystudio:generation-history:v1`

**Data structure**:
```typescript
interface PersistedGenerationHistory {
  version: string;
  batches: {
    id: string;
    timestamp: number;
    prompt: string;
    negativePrompt?: string;
    settings: GenerationSettings;
    images: {
      id: string;
      thumbnail: string;             // Base64 data URL
      width: number;
      height: number;
      seed: number;
    }[];
    starred: boolean;
  }[];
}
```

### Quota Management

**LocalStorage quota**: ~5MB per origin

**When quota exceeded**:
1. Try to delete oldest unstarred batches (FIFO)
2. If still over quota, show warning:
   "Storage full. Unable to save new generations. Clear some history."
3. User must manually clear batches

**Quota check**:
```typescript
function checkStorageQuota(): number {
  const usage = calculateLocalStorageUsage();
  const quota = 5 * 1024 * 1024; // 5MB
  return (usage / quota) * 100; // Percentage
}

// Warn at 80%
if (checkStorageQuota() > 80) {
  showToast(
    'Storage is 80% full. Consider clearing old generations.',
    'warning'
  );
}
```

---

## Auto-Cleanup

### Cleanup Strategy

**Trigger**: After each generation completes

**Algorithm**:
1. Count current batches in memory
2. If > 25 batches:
   - Sort by timestamp (oldest first)
   - Filter out starred batches
   - Remove oldest unstarred batch(es) until ≤ 25
3. Update localStorage

**User notification**: None (silent cleanup)

**Exception**: Starred batches never auto-deleted

---

## Batch Search/Filter

### Search Bar (Future/V2)

**Not in V1**, but architecture should support:

```
┌─────────────────────────────────────┐
│ 🔍 Search generations...            │
└─────────────────────────────────────┘
```

**Search by**:
- Prompt text
- Date range
- Model used
- Starred status

**Filter by**:
- Status (complete, failed)
- Model
- Date

---

## Batch Export

### Export All Images

**Per-batch export**:
- Right-click batch → "Export All Images"
- Opens file picker (folder select)
- Saves all images in batch as separate files
- Filenames: `{prompt}_{seed}_{index}.png`

**Settings export** (optional):
- Checkbox: "Include settings.json"
- Saves generation parameters alongside images

### Export Format

```json
{
  "prompt": "a cute cat wearing sunglasses",
  "negativePrompt": "",
  "model": "sd-xl",
  "sampler": "euler",
  "steps": 20,
  "cfg": 7.5,
  "seeds": [12345, 12346, 12347, 12348],
  "width": 1024,
  "height": 1024,
  "generated": "2026-01-29T14:30:00Z"
}
```

---

## Batch Re-Generation

### Regenerate with Settings

**User action**: Right-click batch → "Regenerate with Settings"

**Behavior**:
1. Load batch settings into Parameters panel
2. Switch to Generate tool
3. User can modify settings or click Generate immediately
4. New batch created (old batch unaffected)

**Use case**: "I like these settings, try again with new seeds"

---

## Performance Optimizations

### Lazy Loading

**Thumbnails**:
- Only render visible thumbnails initially
- Load others as user scrolls
- Use IntersectionObserver

```typescript
function ThumbnailStrip({ batches }: Props) {
  const [visibleBatches, setVisibleBatches] = useState(
    batches.slice(0, 10)
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadMoreBatches();
          }
        });
      },
      { rootMargin: '100px' }
    );

    observer.observe(scrollSentinel.current);
    return () => observer.disconnect();
  }, []);

  return <div>...</div>;
}
```

### Virtual Scrolling

**For large history** (25+ batches):
- Use react-virtual or react-window
- Only render visible batches in DOM
- Dramatically improves performance

---

## Batch Metrics

### Generation Stats (Future/V2)

**Settings → "Generation Stats"** shows:
- Total batches generated (all time)
- Total images generated
- Most used model
- Average generation time
- Storage usage

**Not in V1** - defer to V2.

---

## Error States

### Failed Batch

**Visual**:
- Batch header: Red background
- Error icon (⚠️) in batch header
- Thumbnails: Gray placeholder with error icon

**Hover**: Shows error message tooltip

**Actions**:
- Retry (re-queue to ComfyUI)
- Delete batch
- Copy error details

### Partial Batch

**Scenario**: 4 images requested, only 2 completed

**Visual**:
- Show completed images
- Show placeholders for failed images
- Warning icon in batch header

**Actions**:
- Retry failed images only
- Accept partial batch
- Delete entire batch

---

## Memory Management

### Image Lifecycle

**Thumbnail URLs**:
1. Generated → Create blob URL
2. Added to batch → Store blob URL
3. Batch deleted → Revoke blob URL
4. Page unload → Revoke all blob URLs

```typescript
function cleanupBatch(batch: GenerationBatch) {
  // Revoke blob URLs to free memory
  for (const image of batch.images) {
    if (image.url.startsWith('blob:')) {
      URL.revokeObjectURL(image.url);
    }
    if (image.thumbnail.startsWith('blob:')) {
      URL.revokeObjectURL(image.thumbnail);
    }
  }
}

// On page unload
window.addEventListener('beforeunload', () => {
  getAllBatches().forEach(cleanupBatch);
});
```

---

## UI Affordances

### Batch Count Indicator

**Thumbnail strip footer**:
```
Showing 10 of 23 batches  •  [Show More]  •  [Clear All]
```

**Sticky footer** (always visible when scrolling)

### Loading State

**While generating**:
- Batch shows at top with shimmer animation
- Progress bar (if ComfyUI provides progress)
- Cancel button to abort generation

### Empty State

**No batches**:
```
┌────────────────────────────────────┐
│                                    │
│   No generations yet               │
│   Click Generate to create images  │
│                                    │
└────────────────────────────────────┘
```

---

## Accessibility

### Keyboard Navigation

- `Left/Right arrows`: Navigate between batches
- `Enter`: Open batch details
- `Delete`: Delete selected batch (with confirm)
- `Cmd/Ctrl + A`: Select all batches (for multi-delete)

### Screen Reader

**Batch announcement**:
"Generation batch: a cute cat wearing sunglasses, 4 images, generated 5 minutes ago"

**Actions announced**:
"Batch deleted", "Batch starred", "Showing more batches"

---

## Testing

### Test Cases

1. **Auto-cleanup**
   - Generate 30 batches
   - Verify oldest 5 removed automatically
   - Verify starred batches preserved

2. **Delete batch**
   - Delete batch
   - Verify memory freed (blob URLs revoked)
   - Verify localStorage updated

3. **Storage quota**
   - Fill localStorage to 95%
   - Generate new batch
   - Verify warning shown
   - Verify oldest batches deleted to make room

4. **Re-generation**
   - Right-click batch → Regenerate
   - Verify settings loaded correctly
   - Verify new batch creates successfully

---

**Status**: P1 Gap Filled
**Next**: Gap #3 (Settings Panel Content)
