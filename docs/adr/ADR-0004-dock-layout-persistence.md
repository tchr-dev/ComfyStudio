# ADR-0004: Dock Layout Persistence Strategy

**Status:** Active

**Date:** 2026-01-28

**Context:**

Dock panels can be opened, closed, reordered, and moved between columns. Users expect their layout to persist across sessions. The state shape may evolve as features are added (new panel types, nested layouts, etc.).

**Decision:**

Use localStorage with versioned keys:

**Storage:**
- Key: `dock-layout.v1` (version in key)
- Format: JSON serialization of DockLayoutState
- Location: Browser localStorage

**State Shape:**
```typescript
type DockLayoutState = {
  panels: Array<{
    id: string;
    column: "left" | "right";
    order: number;
    open: boolean;
  }>;
}
```

**Migration:**
- Version bump in key (v1 → v2) when format changes
- Old key ignored, default state used
- No explicit migration code (fresh start on breaking changes)

**Fallback:**
- Parse error → use createDefault()
- Missing key → use createDefault()
- Invalid panel id → filter out, keep valid panels

**Consequences:**

**Positive:**
- Simple implementation (no migration logic)
- Works offline (localStorage)
- Per-user state (browser-specific)
- Clear versioning via key

**Negative:**
- Breaking changes lose user layout
- No cross-browser sync
- No server-side persistence
- Limited to ~5-10MB storage

**Neutral:**
- Must increment version on breaking schema changes
- State survives page reload but not cache clear
- Test must mock localStorage

**Alternatives Considered:**

- **IndexedDB** - Rejected: Overkill for small state, async complexity
- **URL params** - Rejected: Too long, breaks bookmarks
- **Cookie** - Rejected: Sent with every request (waste)
- **Migration code (v1→v2)** - Rejected: Complexity not worth it for layout
- **Server persistence** - Deferred: Requires authentication, Phase 2

## Versioning Rules

**When to bump version:**
- ✅ Add required fields to DockPanelState
- ✅ Change field types (string → enum)
- ✅ Rename fields
- ✅ Remove fields

**When NOT to bump:**
- ✅ Add optional fields (graceful degradation)
- ✅ Add new panel ids (filtered if unknown)
- ✅ Change default values

**Version format:**
- Pattern: `dock-layout.v{N}` where N is integer
- Start at v1, increment sequentially
- Never reuse version numbers

## Implementation

**File:** `packages/comfystudio-ui/src/Dock/State.ts`

**Load:**
```typescript
export const load = (): DockLayoutState => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createDefault();
  try {
    return JSON.parse(raw) as DockLayoutState;
  } catch {
    return createDefault();
  }
};
```

**Save:**
```typescript
export const save = (state: DockLayoutState): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
```

**Default:**
```typescript
export const createDefault = (): DockLayoutState => ({
  panels: [
    { id: "tools", column: "left", order: 0, open: true },
  ],
});
```

## Panel Visibility Rules

**Dynamic visibility:** Some panels only show when conditions met

```typescript
export const isPanelVisible = (
  panelId: string,
  ctx: { activeTool?: string }
): boolean => {
  if (panelId === "editor-tool") return ctx.activeTool === "brush";
  return true;
};
```

**Rules:**
- Editor-tool panel → only when brush tool active
- Other panels → always visible if registered

This is separate from `open` state (user toggle) vs visibility (system condition).

## For AI Agents

❌ **Do NOT suggest:**
- "Let's add migration code" (not needed, version bump handles it)
- "Use IndexedDB" (localStorage sufficient for this use case)
- "Sync to server" (Phase 2 feature, not now)
- "Remove version from key" (version is critical for safety)

✅ **This is intentional:**
- Version bump = fresh start (acceptable UX trade-off)
- localStorage = simple, works offline, no auth needed
- JSON serialization = easy to debug, no schema drift
- Fallback to default = safe, predictable behavior

## Future Enhancements (Not Now)

**Phase 2 possibilities:**
- Server-side persistence (requires auth)
- Cross-browser sync (requires account)
- Migration helpers (when complexity justifies it)
- Export/import layout (for power users)

**Don't implement until:**
- User explicitly requests
- Complexity cost justified by user value
- Breaking changes happen frequently (then add migrations)

## Testing

**Mock localStorage:**
```typescript
const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, value) => { mockStorage[key] = value; },
  clear: () => { mockStorage = {}; },
};
```

**Test cases:**
- Load with no stored data → default
- Load with valid data → restored
- Load with invalid JSON → default
- Save and load round-trip → equality
- Version mismatch (v2 key, v1 loader) → default
