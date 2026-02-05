# Docking System Technical Specification

**Date**: 2026-01-29
**Status**: P0 - Implementation Blocker
**Related**: ADR-0004 (Canvas-Centric Layout), Frontend Redesign Section 1

---

## Library Decision

### Evaluation

| Library | Pros | Cons | Verdict |
|---------|------|------|---------|
| **react-mosaic** | Mature, flexbox-based, good docs | Heavy (40KB), rigid grid | ❌ Too rigid |
| **rc-dock** | Lightweight, flexible, tab support | Less maintained, basic docs | ✅ **CHOSEN** |
| **golden-layout** | Feature-rich, mature | jQuery dependency, old | ❌ Too heavy |
| **react-grid-layout** | Good for dashboards | No true docking, just grid | ❌ Not docking |
| **Custom** | Full control, lightweight | High effort, edge cases | ❌ Too risky for V1 |

### Final Decision: **rc-dock**

**Reasons:**
1. Lightweight (~15KB gzipped)
2. True Figma-style docking (not just grid)
3. Tab groups supported natively
4. No heavy dependencies
5. Active maintenance
6. TypeScript support

**Trade-offs:**
- Less documented than react-mosaic
- Will need custom styling
- Some edge cases to handle ourselves

---

## Docking Architecture

### Panel Types

```typescript
type PanelType = 'tools' | 'parameters' | 'layers' | 'thumbnails' | 'settings';

interface Panel {
  id: string;                    // Unique ID
  type: PanelType;               // Panel type
  title: string;                 // Display name
  icon?: ReactNode;              // Optional icon
  content: ReactNode;            // Panel content
  minWidth?: number;             // Minimum width (px)
  minHeight?: number;            // Minimum height (px)
  defaultWidth?: number;         // Default width
  defaultHeight?: number;        // Default height
  closable?: boolean;            // Can be closed
  floating?: boolean;            // Can float
  dockable?: boolean;            // Can dock
}
```

### Dock Zones

```typescript
type DockZone = 'left' | 'right' | 'top' | 'bottom' | 'center' | 'tab';

interface DockTarget {
  zone: DockZone;
  panelId?: string;              // If docking relative to panel
  bounds: DOMRect;               // Visual bounds for highlighting
}
```

### Layout State

```typescript
interface LayoutState {
  panels: {
    [panelId: string]: PanelState;
  };
  dockLayout: DockLayout;        // rc-dock layout
  floatingPanels: FloatingPanel[];
}

interface PanelState {
  visible: boolean;
  docked: boolean;
  position?: { x: number; y: number };  // If floating
  size?: { width: number; height: number };
  zIndex?: number;               // If floating
  tabGroupId?: string;           // If in tab group
}

interface FloatingPanel {
  panelId: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
}
```

---

## Docking Behavior

### Drag Initiation

**Trigger**: Mouse down on panel header for 100ms

**Visual feedback:**
1. Panel becomes semi-transparent (0.8 opacity)
2. Panel lifts (shadow increases)
3. Cursor changes to "grabbing"
4. Dock zones start detecting

### Dock Zone Detection

**Algorithm**:

```typescript
function detectDockZones(mousePos: Point, panels: Panel[]): DockTarget[] {
  const targets: DockTarget[] = [];

  // 1. Screen edge zones (always available)
  targets.push(...detectScreenEdges(mousePos));

  // 2. Panel edge zones (when near other panels)
  for (const panel of panels) {
    if (isNear(mousePos, panel.bounds, SNAP_DISTANCE)) {
      targets.push(...detectPanelEdges(mousePos, panel));
    }
  }

  // 3. Tab zone (when over panel header)
  const hoveredPanel = getPanelAtPosition(mousePos);
  if (hoveredPanel && isOverHeader(mousePos, hoveredPanel)) {
    targets.push({
      zone: 'tab',
      panelId: hoveredPanel.id,
      bounds: hoveredPanel.headerBounds,
    });
  }

  return targets;
}

const SNAP_DISTANCE = 20; // px - magnetic snap range
```

### Zone Highlighting

**Visual indicators**:

```typescript
function highlightDockZone(target: DockTarget) {
  const overlay = document.getElementById('dock-overlay');

  // Create highlight div
  const highlight = document.createElement('div');
  highlight.className = 'dock-zone-highlight';
  highlight.style.left = `${target.bounds.left}px`;
  highlight.style.top = `${target.bounds.top}px`;
  highlight.style.width = `${target.bounds.width}px`;
  highlight.style.height = `${target.bounds.height}px`;

  overlay.appendChild(highlight);
}
```

**CSS**:
```css
.dock-zone-highlight {
  position: absolute;
  border: 2px solid var(--accent-primary);
  background: rgba(124, 58, 237, 0.1);
  pointer-events: none;
  transition: all 150ms ease-out;
  border-radius: 4px;
}
```

### Magnetic Snap

**Behavior**: When dragging panel within 20px of dock zone, panel "snaps" to that position

**Implementation**:
```typescript
function applyMagneticSnap(
  mousePos: Point,
  panel: Panel,
  targets: DockTarget[]
): Point {
  for (const target of targets) {
    const distance = getDistance(mousePos, target.bounds);

    if (distance < SNAP_DISTANCE) {
      // Snap to zone center
      return {
        x: target.bounds.left + target.bounds.width / 2,
        y: target.bounds.top + target.bounds.height / 2,
      };
    }
  }

  return mousePos; // No snap
}
```

**Visual feedback**:
- Panel position "jumps" to snap position
- Highlight appears immediately
- Slight haptic feedback (if supported)

### Drop Action

**On mouse release**:

```typescript
function handleDrop(panel: Panel, target: DockTarget | null) {
  if (!target) {
    // No valid target - panel stays floating
    return;
  }

  switch (target.zone) {
    case 'left':
    case 'right':
    case 'top':
    case 'bottom':
      dockPanelToEdge(panel, target.zone);
      break;
    case 'tab':
      addPanelToTabGroup(panel, target.panelId!);
      break;
    case 'center':
      placePanelInCenter(panel);
      break;
  }

  // Animate into place
  animatePanelTransition(panel, target, 200); // 200ms

  // Save layout
  saveLayoutState();
}
```

---

## Tab Groups

### Visual Design

**Tab group header**:
```
┌─────────────────────────────────────┐
│ [Parameters] [Layers] [Settings] ╳  │ ← Tabs + close
├─────────────────────────────────────┤
│                                     │
│  Active panel content               │
│                                     │
└─────────────────────────────────────┘
```

**Tab styling**:
```css
.tab {
  padding: 8px 12px;
  background: transparent;
  border-bottom: 2px solid transparent;
  cursor: pointer;
}

.tab:hover {
  background: rgba(255,255,255,0.05);
}

.tab.active {
  border-bottom-color: var(--accent-primary);
  color: var(--text-primary);
}

.tab:not(.active) {
  color: var(--text-secondary);
}
```

### Tab Group State

```typescript
interface TabGroup {
  id: string;
  panelIds: string[];            // Panels in group
  activeIndex: number;           // Currently visible panel
  position: DockPosition;        // Where group is docked
}

interface DockPosition {
  zone: 'left' | 'right' | 'top' | 'bottom';
  size: number;                  // Width or height (px)
  index?: number;                // Order among siblings
}
```

### Adding to Tab Group

**User action**: Drag panel over existing panel header

**Behavior**:
1. Header highlights (blue outline)
2. On drop, panel becomes new tab
3. New tab appears at end of tab list
4. Panel content replaces docked panel content
5. User can switch tabs with click

### Removing from Tab Group

**User action**: Drag tab out of group

**Behavior**:
1. Tab becomes floating panel
2. If last tab in group, group dissolves
3. Remaining tabs adjust size

---

## Panel Sizing

### Resize Handles

**Position**: Between docked panels (divider)

**Visual**: 4px wide hit area, 1px visible divider

**Behavior**:
- Hover: Cursor changes to resize (↔ or ↕)
- Drag: Both panels resize proportionally
- Double-click: Reset to default sizes

**Implementation**:
```typescript
function handleResize(
  panel1: Panel,
  panel2: Panel,
  delta: number  // Mouse movement in px
) {
  const min1 = panel1.minWidth || 200;
  const min2 = panel2.minWidth || 200;

  const newSize1 = Math.max(min1, panel1.width + delta);
  const newSize2 = Math.max(min2, panel2.width - delta);

  panel1.width = newSize1;
  panel2.width = newSize2;

  updateLayout();
}
```

### Min/Max Sizes

```typescript
const PANEL_CONSTRAINTS = {
  tools: {
    minWidth: 60,
    maxWidth: 120,
    minHeight: 200,
  },
  parameters: {
    minWidth: 200,
    maxWidth: 400,
    defaultWidth: 280,
  },
  layers: {
    minWidth: 200,
    maxWidth: 400,
    defaultWidth: 280,
  },
  thumbnails: {
    minHeight: 80,
    maxHeight: 200,
    defaultHeight: 120,
  },
};
```

---

## Default Layout

### Initial State

```typescript
const DEFAULT_LAYOUT: LayoutState = {
  panels: {
    tools: {
      visible: true,
      docked: false,
      position: { x: window.innerWidth - 100, y: 80 }, // Top-right
      size: { width: 60, height: 'auto' },
      zIndex: 100,
    },
    parameters: {
      visible: true,
      docked: true,
      // Docked to right edge
    },
    layers: {
      visible: true,
      docked: true,
      // Docked to right edge, below parameters
    },
    thumbnails: {
      visible: true,
      docked: false,
      position: { x: 200, y: window.innerHeight - 140 }, // Bottom-left
      size: { width: window.innerWidth * 0.8, height: 120 },
      zIndex: 99,
    },
  },
  // ... rc-dock layout config
};
```

### Reset Layout

**User action**: Settings → "Reset Layout" button

**Behavior**:
1. Confirm: "Reset to default layout?"
2. If confirmed:
   - All panels revert to default positions
   - All customizations lost
   - Animation: panels fly to default positions (400ms)

---

## State Persistence

### LocalStorage

```typescript
const LAYOUT_STORAGE_KEY = 'comfystudio-layout-v1';

function saveLayoutState(state: LayoutState) {
  const serialized = JSON.stringify(state);
  localStorage.setItem(LAYOUT_STORAGE_KEY, serialized);
}

function loadLayoutState(): LayoutState | null {
  const serialized = localStorage.getItem(LAYOUT_STORAGE_KEY);
  if (!serialized) return null;

  try {
    return JSON.parse(serialized);
  } catch (e) {
    console.error('Failed to parse layout state:', e);
    return null;
  }
}
```

### Restoration

**On app load**:
1. Try to load layout from localStorage
2. If found and valid → Apply layout
3. If not found or invalid → Use default layout
4. If screen size changed significantly → Adjust positions

**Validation**:
```typescript
function validateLayoutState(state: LayoutState): boolean {
  // Check all required panels exist
  const requiredPanels = ['tools', 'parameters', 'layers', 'thumbnails'];
  for (const panelId of requiredPanels) {
    if (!state.panels[panelId]) return false;
  }

  // Check positions are within viewport
  for (const panel of Object.values(state.panels)) {
    if (panel.position) {
      if (panel.position.x < 0 || panel.position.x > window.innerWidth) {
        return false;
      }
      if (panel.position.y < 0 || panel.position.y > window.innerHeight) {
        return false;
      }
    }
  }

  return true;
}
```

---

## Collision Handling

### Floating Panel Overlap

**Problem**: Multiple floating panels can overlap

**Solution**: Z-index management

```typescript
let currentZIndex = 100;

function bringPanelToFront(panelId: string) {
  const panel = layoutState.panels[panelId];
  if (panel.docked) return; // Docked panels don't have z-index

  panel.zIndex = ++currentZIndex;
  updateLayout();
}
```

**Behavior**:
- Click panel → Brings to front
- Most recently interacted panel is always on top
- Z-index starts at 100, increments
- When exceeding 1000, rebase all z-indices

### Panel Boundaries

**Constraint**: Floating panels can't go offscreen

```typescript
function constrainPanelPosition(
  position: Point,
  size: Size
): Point {
  const padding = 20; // Keep 20px visible at all times

  return {
    x: Math.max(
      padding - size.width,
      Math.min(position.x, window.innerWidth - padding)
    ),
    y: Math.max(
      padding,
      Math.min(position.y, window.innerHeight - padding)
    ),
  };
}
```

---

## Performance Optimizations

### Throttled Updates

```typescript
import { throttle } from 'lodash';

const updateDockZones = throttle(
  (mousePos: Point) => {
    const zones = detectDockZones(mousePos, panels);
    setActiveZones(zones);
  },
  16 // ~60fps
);
```

### Lazy Rendering

```typescript
function PanelContent({ panelId, active }: Props) {
  if (!active) {
    // Don't render inactive tab content
    return null;
  }

  return <ActualPanelContent panelId={panelId} />;
}
```

### Virtual Panels

For tab groups with many tabs:
```typescript
function TabGroup({ tabs }: Props) {
  // Only render active tab content
  const activeTab = tabs[activeIndex];

  return (
    <div>
      <TabBar tabs={tabs} />
      <TabContent>{activeTab.content}</TabContent>
    </div>
  );
}
```

---

## Responsive Behavior

### Desktop (≥1280px)
- Full docking enabled
- All features available

### Tablet (768-1279px)
- Floating disabled (all panels fixed to edges)
- Tab groups still supported
- Simplified drag behavior (dock only)

### Mobile (<768px)
- No docking (N/A in view-only mode)

---

## Accessibility

### Keyboard Navigation

**Dock/Undock panel**:
1. Focus panel (Tab to panel)
2. Press `Cmd/Ctrl + Shift + F` to toggle floating/docked
3. If floating, use arrow keys to move (10px per press)
4. Press Enter to drop in current position

**Switch tabs**:
1. Focus tab group
2. Arrow keys (Left/Right) to switch tabs
3. Enter to activate tab

### Screen Reader

**Announcements**:
```typescript
function announceLayoutChange(action: string) {
  // e.g., "Parameters panel docked to right"
  // e.g., "Layers panel now floating"
  announceToScreenReader(action);
}
```

---

## Error Handling

### Panel Load Failure

**If panel content fails to render**:
```typescript
function PanelErrorBoundary({ children, panelId }: Props) {
  return (
    <ErrorBoundary
      fallback={
        <div className="panel-error">
          <Icon name="AlertTriangle" />
          <p>Failed to load {panelId} panel</p>
          <button onClick={() => reloadPanel(panelId)}>
            Retry
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
```

### Layout Corruption

**If layout state corrupts**:
1. Try to validate on load
2. If invalid → Log error + reset to default
3. Show toast: "Layout reset to default (previous layout was corrupted)"

---

## Testing Strategy

### Unit Tests
- Dock zone detection
- Magnetic snap calculation
- Collision detection
- Layout validation

### Integration Tests
- Drag and drop panels
- Tab group creation/dissolution
- Layout persistence
- Resize interactions

### E2E Tests
- Full docking workflow
- Layout reset
- Panel visibility toggles
- Multi-monitor scenarios (future)

---

**Status**: P0 Gap Filled
**Next**: Gap E (Tool Implementation Specifics)
