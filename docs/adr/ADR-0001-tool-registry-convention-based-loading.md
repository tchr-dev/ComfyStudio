# ADR-0001: Tool Registry Convention-Based Loading

**Status:** Active

**Date:** 2026-01-28

**Context:**

Tools need to be automatically discovered without manual registration. The system must work across different agents and remain predictable when tools are added or removed.

**Decision:**

Use convention-based loading where:
- Tool `id` field MUST match filename (without extension)
- Tool definitions: `packages/comfystudio-ui/src/Tools/definitions/{id}.ts`
- Tool implementations: `packages/comfystudio-ui/src/Tools/implementations/{id}.ts`
- Discovery via Vite's `import.meta.glob('./definitions/*.ts')`
- Registry builds tool list at startup by loading all definition files

**Consequences:**

**Positive:**
- Zero registration boilerplate - just create two files
- Predictable file structure
- Easy to see all available tools (ls definitions/)
- No import order dependencies

**Negative:**
- Tool id coupled to filename (renaming requires both)
- No runtime tool installation without rebuild
- All tools loaded at startup (no tree-shaking per tool)

**Neutral:**
- Must keep definitions/ and implementations/ in sync
- Glob pattern is string literal (can't be dynamic)

**Alternatives Considered:**

- **Manual registration array** - Rejected: Easy to forget, breaks DRY
- **Decorator-based** - Rejected: Runtime reflection too complex
- **Dynamic imports by ID** - Rejected: Requires pre-known list anyway
- **Plugin-provided tools** - Deferred to Phase 2 (future refactor)

## Implementation Rules

**DO:**
- Create `definitions/{id}.ts` with tool metadata
- Create `implementations/{id}.ts` with matching id
- Export default from both files
- Keep id lowercase-kebab-case

**DON'T:**
- Use dynamic paths in glob imports
- Change id without renaming files
- Skip either definition or implementation
- Use absolute paths for tool loading

## For AI Agents

❌ **Do NOT suggest:**
- "Let's use a central registry file" (defeats auto-discovery)
- "Why not dynamic imports?" (already using them via glob)
- "Tool id could be in package.json" (couples to build system)
- "Let's make paths configurable" (Vite glob needs literals)

✅ **This is intentional:**
- Filename = id is a feature, not a limitation
- Startup loading is acceptable (tools are lightweight)
- Convention over configuration for simplicity
