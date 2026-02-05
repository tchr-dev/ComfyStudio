# ADR-0002: Tool Definition Structure (Definitions vs Implementations)

**Status:** Active

**Date:** 2026-01-28

**Context:**

Tools have two aspects: declarative configuration (metadata, settings schema) and behavioral implementation (code hooks). These serve different purposes and are consumed differently by the system.

**Decision:**

Separate tool definitions from implementations in two parallel directory structures:

**Definitions** (`Tools/definitions/{id}.ts`):
- Pure data: metadata, settings schema, icon, shortcuts
- TypeScript for type safety during authoring
- Consumed by: UI panels, settings renderer, registry

**Implementations** (`Tools/implementations/{id}.ts`):
- Behavioral hooks: onActivate, onMouseDown, executeWorkflow
- Can import Editor domains, Plugin, state
- Consumed by: Tool execution engine, canvas interactions

Both files export default, loaded by convention (ADR-0001).

**Consequences:**

**Positive:**
- Clear separation of concerns (data vs behavior)
- Settings schema changes don't touch implementation
- Easy to see tool capabilities at a glance (definition)
- Can validate definitions without running implementations
- Supports wrapper pattern (stub implementation, rich definition)

**Negative:**
- Two files per tool (not DRY for simple tools)
- Must keep id in sync between both files
- Can't have behavior in definition (enforced separation)

**Neutral:**
- Implementations can be stubs initially (wrapper pattern)
- Definition format can evolve independently

**Alternatives Considered:**

- **Single file per tool** - Rejected: Mixes data and behavior, harder to parse
- **Definition in JSON** - Rejected: No type safety, can't reference components
- **Implementation includes definition** - Rejected: Circular dependency risk
- **Monorepo packages per tool** - Rejected: Too heavy for simple tools

## File Structure

```
Tools/
├── definitions/          # Declarative (what the tool is)
│   ├── brush.ts         # Metadata, settings, category
│   └── generate.ts
├── implementations/      # Behavioral (what the tool does)
│   ├── brush.ts         # Canvas interactions, lifecycle
│   └── generate.ts
├── Types.ts             # Shared types
├── Registry.ts          # Loads both
└── State.ts             # Runtime state
```

## Definition Format Rules

**Definitions MUST:**
- Export default ToolDefinition
- Have id matching filename
- Include name, category, icon
- Define settings schema if configurable

**Definitions MUST NOT:**
- Import implementations
- Include executable code (beyond type definitions)
- Depend on runtime state

## Implementation Format Rules

**Implementations MUST:**
- Export default ToolImplementation
- Provide hooks appropriate for tool category
- Handle errors gracefully

**Implementations MAY:**
- Be minimal wrappers (Phase 1 migration)
- Import Editor domains, Plugin, etc.
- Have custom SettingsPanel component

## For AI Agents

❌ **Do NOT suggest:**
- "Merge into single file" (separation is intentional)
- "Put settings in implementation" (breaks settings UI generation)
- "Generate definition from implementation" (wrong direction)
- "Make definitions JSON" (loses type safety)

✅ **This is intentional:**
- Two files per tool enables wrapper pattern
- Definition is machine-readable by UI without executing code
- Implementation can evolve (wrapper → full) without changing definition
- Settings schema is data, not code

## Migration Pattern (Phase 1 → Phase 2)

**Phase 1 (Wrapper):**
```typescript
// implementations/brush.ts
export default {
  onActivate: () => Editor.Brush.activate(),
  // Minimal delegation
};
```

**Phase 2 (Refactor):**
```typescript
// implementations/brush.ts
export default {
  onActivate: () => { /* full implementation */ },
  onMouseDown: (e) => { /* canvas logic here */ },
  // Move from Editor.Brush to here
};
```

Definition stays unchanged throughout.
