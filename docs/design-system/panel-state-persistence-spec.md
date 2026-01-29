# Panel State Persistence Specification

**Date**: 2026-01-29
**Status**: P1 - Should Have in V1
**Related**: Docking System, Layout State

---

## Persistence Strategy

### What Persists

**Panel layout state** (localStorage):
- Panel positions (floating panels)
- Panel sizes (width/height)
- Dock positions (which edge, order)
- Tab groups (which panels are tabbed together)
- Visibility state (shown/hidden)
- Active tab in tab groups

**Does NOT persist**:
- Panel content (e.g., current layer selection)
- Canvas images (separate persistence)
- Generation history (separate persistence)
- Undo/redo stack (session only)

---

## Storage Schema

### LocalStorage Keys

```typescript
const STORAGE_KEYS = {
  LAYOUT: 'comfystudio:layout:v1',
  TOOL_SETTINGS: 'comfystudio:tool-settings:v1',
  USER_PREFS: 'comfystudio:preferences:v1',
  LAST_SESSION: 'comfystudio:last-session:v1',
} as const;
```

### Layout State Schema

```typescript
interface PersistedLayoutState {
  version: string;                    // Schema version (for migrations)
  timestamp: number;                  // Last saved time
  screenSize: { width: number; height: number };  // For validation
  panels: {
    [panelId: string]: {
      visible: boolean;
      docked: boolean;
      dockPosition?: {
        zone: 'left' | 'right' | 'top' | 'bottom';
        index: number;               // Order among docked panels
        size: number;                // Width or height (px or %)
      };
      floatingPosition?: {
        x: number;                   // Pixels from left
        y: number;                   // Pixels from top
        width: number;
        height: number;
        zIndex: number;
      };
      tabGroupId?: string;           // If in tab group
    };
  };
  tabGroups: {
    [groupId: string]: {
      panelIds: string[];
      activeIndex: number;
      dockPosition: {
        zone: 'left' | 'right' | 'top' | 'bottom';
        index: number;
        size: number;
      };
    };
  };
}
```

**Example**:
```json
{
  "version": "1.0.0",
  "timestamp": 1738195200000,
  "screenSize": { "width": 1920, "height": 1080 },
  "panels": {
    "tools": {
      "visible": true,
      "docked": false,
      "floatingPosition": {
        "x": 1820,
        "y": 80,
        "width": 60,
        "height": 280,
        "zIndex": 100
      }
    },
    "parameters": {
      "visible": true,
      "docked": true,
      "dockPosition": {
        "zone": "right",
        "index": 0,
        "size": 280
      },
      "tabGroupId": "right-group-1"
    },
    "layers": {
      "visible": true,
      "docked": true,
      "tabGroupId": "right-group-1"
    }
  },
  "tabGroups": {
    "right-group-1": {
      "panelIds": ["parameters", "layers"],
      "activeIndex": 0,
      "dockPosition": {
        "zone": "right",
        "index": 0,
        "size": 280
      }
    }
  }
}
```

---

## Persistence Logic

### Save Triggers

**Auto-save** (debounced 1000ms):
- Panel moved (drag end)
- Panel resized (resize end)
- Panel docked/undocked
- Panel visibility toggled
- Tab switched
- Tab group created/dissolved

**Manual save**:
- Settings → "Save Layout"
- Not typically needed (auto-save handles it)

### Save Implementation

```typescript
import { debounce } from 'lodash';

const saveLayoutState = debounce((state: LayoutState) => {
  const persisted: PersistedLayoutState = {
    version: '1.0.0',
    timestamp: Date.now(),
    screenSize: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    panels: serializePanels(state.panels),
    tabGroups: serializeTabGroups(state.tabGroups),
  };

  try {
    const json = JSON.stringify(persisted);
    localStorage.setItem(STORAGE_KEYS.LAYOUT, json);
  } catch (e) {
    console.error('Failed to save layout:', e);
    // Handle quota exceeded
    if (e.name === 'QuotaExceededError') {
      showToast('Failed to save layout: Storage quota exceeded', 'error');
    }
  }
}, 1000);

// Call after any layout change
function onLayoutChange(newState: LayoutState) {
  saveLayoutState(newState);
}
```

---

## Load Logic

### Load Sequence

**On app startup**:
1. Try to load layout from localStorage
2. Validate loaded layout
3. Check if screen size changed significantly
4. Apply layout or use defaults

```typescript
function loadLayoutState(): LayoutState {
  try {
    const json = localStorage.getItem(STORAGE_KEYS.LAYOUT);
    if (!json) {
      console.log('No saved layout, using defaults');
      return getDefaultLayout();
    }

    const persisted: PersistedLayoutState = JSON.parse(json);

    // Validate schema version
    if (persisted.version !== '1.0.0') {
      console.warn('Layout version mismatch, using defaults');
      return getDefaultLayout();
    }

    // Check screen size delta
    const currentSize = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    if (shouldAdjustLayout(persisted.screenSize, currentSize)) {
      console.log('Screen size changed, adjusting layout');
      return adjustLayoutForNewScreen(persisted, currentSize);
    }

    // Validate panel positions
    if (!validateLayoutPositions(persisted)) {
      console.warn('Invalid panel positions, using defaults');
      return getDefaultLayout();
    }

    // Deserialize and apply
    return deserializeLayout(persisted);

  } catch (e) {
    console.error('Failed to load layout:', e);
    return getDefaultLayout();
  }
}
```

---

## Validation

### Screen Size Change Detection

```typescript
function shouldAdjustLayout(
  savedSize: { width: number; height: number },
  currentSize: { width: number; height: number }
): boolean {
  const widthDelta = Math.abs(savedSize.width - currentSize.width);
  const heightDelta = Math.abs(savedSize.height - currentSize.height);

  // Adjust if screen size changed by more than 20%
  const widthThreshold = savedSize.width * 0.2;
  const heightThreshold = savedSize.height * 0.2;

  return widthDelta > widthThreshold || heightDelta > heightThreshold;
}
```

### Layout Adjustment

```typescript
function adjustLayoutForNewScreen(
  persisted: PersistedLayoutState,
  newSize: { width: number; height: number }
): LayoutState {
  const scaleX = newSize.width / persisted.screenSize.width;
  const scaleY = newSize.height / persisted.screenSize.height;

  const adjusted = { ...persisted };

  // Scale floating panel positions
  for (const panel of Object.values(adjusted.panels)) {
    if (panel.floatingPosition) {
      panel.floatingPosition.x *= scaleX;
      panel.floatingPosition.y *= scaleY;

      // Constrain to viewport
      panel.floatingPosition.x = Math.max(0, Math.min(
        panel.floatingPosition.x,
        newSize.width - panel.floatingPosition.width
      ));
      panel.floatingPosition.y = Math.max(0, Math.min(
        panel.floatingPosition.y,
        newSize.height - panel.floatingPosition.height
      ));
    }

    // Docked panel sizes (px) should stay absolute
    // Docked panel sizes (%) should stay relative
  }

  return deserializeLayout(adjusted);
}
```

### Position Validation

```typescript
function validateLayoutPositions(persisted: PersistedLayoutState): boolean {
  for (const [panelId, panel] of Object.entries(persisted.panels)) {
    // Floating panels must be within bounds
    if (panel.floatingPosition) {
      const pos = panel.floatingPosition;
      if (
        pos.x < 0 ||
        pos.y < 0 ||
        pos.x > window.innerWidth ||
        pos.y > window.innerHeight
      ) {
        console.warn(`Panel ${panelId} out of bounds`);
        return false;
      }
    }

    // Tab group refs must be valid
    if (panel.tabGroupId && !persisted.tabGroups[panel.tabGroupId]) {
      console.warn(`Panel ${panelId} references invalid tab group`);
      return false;
    }
  }

  // Tab groups must reference valid panels
  for (const [groupId, group] of Object.entries(persisted.tabGroups)) {
    for (const panelId of group.panelIds) {
      if (!persisted.panels[panelId]) {
        console.warn(`Tab group ${groupId} references invalid panel ${panelId}`);
        return false;
      }
    }
  }

  return true;
}
```

---

## Tool Settings Persistence

### Separate from Layout

Tool settings persist independently:

```typescript
interface PersistedToolSettings {
  version: string;
  settings: {
    [toolId: string]: {
      [settingId: string]: any;
    };
  };
}
```

**Example**:
```json
{
  "version": "1.0.0",
  "settings": {
    "brush": {
      "size": 25,
      "opacity": 100,
      "hardness": 50,
      "color": "#FF5733"
    },
    "generate": {
      "model": "sd-xl",
      "steps": 30,
      "cfgScale": 8.0,
      "width": 1024,
      "height": 1024
    }
  }
}
```

**Save trigger**: Debounced 500ms after setting change

---

## User Preferences Persistence

### Global Preferences

```typescript
interface UserPreferences {
  version: string;
  theme: 'dark' | 'light';           // Future
  language: string;                   // Future
  shortcuts: {
    [action: string]: string;         // Custom shortcuts
  };
  comfyui: {
    url: string;
    autoConnect: boolean;
  };
  canvas: {
    checkerboardSize: number;
    snapToGrid: boolean;
    gridSize: number;
  };
  performance: {
    maxHistorySize: number;
    autoSaveInterval: number;        // ms
  };
}
```

**Default values** defined in code, overridden by persisted prefs.

---

## Workspace Presets (Future/V2)

### Named Layouts

Allow users to save/load named workspace layouts:

```typescript
interface WorkspacePreset {
  id: string;
  name: string;
  description?: string;
  created: Date;
  layout: PersistedLayoutState;
}

// API
function saveWorkspacePreset(name: string): void;
function loadWorkspacePreset(id: string): void;
function deleteWorkspacePreset(id: string): void;
function listWorkspacePresets(): WorkspacePreset[];
```

**Use cases**:
- "Editing Mode" - Layers + Parameters visible
- "Generation Mode" - Just Generate tool + Thumbnails
- "Review Mode" - Large canvas, minimal panels

**Not in V1** - defer to V2.

---

## Reset to Defaults

### Clear All Persisted State

**Settings → "Reset Layout to Default"**

```typescript
function resetLayoutToDefault() {
  // Confirm
  if (!confirm('Reset layout to default? This cannot be undone.')) {
    return;
  }

  // Clear localStorage
  localStorage.removeItem(STORAGE_KEYS.LAYOUT);

  // Apply default layout
  const defaultLayout = getDefaultLayout();
  applyLayout(defaultLayout);

  // Animate panels to default positions
  animateLayoutReset(defaultLayout, 400);

  showToast('Layout reset to default');
}
```

**Also available**: "Reset Tool Settings" (separate)

---

## Migration Strategy

### Schema Versioning

When layout schema changes (V1 → V2):

```typescript
function migrateLayoutState(
  persisted: PersistedLayoutState
): PersistedLayoutState {
  const version = persisted.version;

  if (version === '1.0.0') {
    // No migration needed
    return persisted;
  }

  if (version === '0.9.0') {
    // Migrate from beta to 1.0
    return migrate_0_9_to_1_0(persisted);
  }

  // Unknown version, use defaults
  console.warn(`Unknown layout version ${version}, using defaults`);
  return null;
}

function migrate_0_9_to_1_0(old: any): PersistedLayoutState {
  // Example migration logic
  return {
    version: '1.0.0',
    timestamp: Date.now(),
    screenSize: old.screenSize || { width: 1920, height: 1080 },
    panels: migratePanels(old.panels),
    tabGroups: old.tabGroups || {},
  };
}
```

---

## Error Handling

### Storage Quota Exceeded

```typescript
function handleQuotaExceeded() {
  // Calculate current usage
  const usage = calculateLocalStorageUsage();

  if (usage > 4.5 * 1024 * 1024) { // 4.5MB of 5MB quota
    // Clear old data
    clearOldGenerationHistory();

    // Retry save
    saveLayoutState(currentLayout);
  } else {
    // Show error
    showError(
      'Failed to save layout: Storage quota exceeded. ' +
      'Try clearing some generation history.'
    );
  }
}
```

### Corrupted Data

```typescript
function handleCorruptedData(error: Error) {
  console.error('Corrupted layout data:', error);

  // Backup corrupted data (for debugging)
  const corrupted = localStorage.getItem(STORAGE_KEYS.LAYOUT);
  localStorage.setItem(
    `${STORAGE_KEYS.LAYOUT}:corrupted:${Date.now()}`,
    corrupted
  );

  // Clear corrupted data
  localStorage.removeItem(STORAGE_KEYS.LAYOUT);

  // Use defaults
  const defaultLayout = getDefaultLayout();
  applyLayout(defaultLayout);

  showToast(
    'Layout data was corrupted and has been reset to defaults',
    'warning'
  );
}
```

---

## Privacy & Data

### What's Stored

**Locally only** (never sent to server):
- Panel layout state
- Tool settings
- User preferences

**No sensitive data**:
- Prompts stored temporarily (session only)
- Images not stored (in memory only)
- No user credentials

### Clear All Data

**Settings → "Clear All Local Data"**

Removes:
- Layout state
- Tool settings
- User preferences
- Generation history (if implemented)
- Workspace presets (future)

**Confirmation required** - destructive action.

---

## Testing

### Test Cases

1. **Save and Load**
   - Arrange panels in custom layout
   - Refresh page
   - Verify layout restored

2. **Screen Resize**
   - Save layout on 1920×1080
   - Load on 1280×720
   - Verify panels adjusted proportionally

3. **Invalid Data**
   - Corrupt localStorage data
   - Load app
   - Verify defaults used + error shown

4. **Quota Exceeded**
   - Fill localStorage to capacity
   - Attempt to save layout
   - Verify graceful handling

5. **Migration**
   - Save layout in version 0.9
   - Load with version 1.0 code
   - Verify migration successful

---

**Status**: P1 Gap Filled
**Next**: Gap #2 (Generation Batch Management)
