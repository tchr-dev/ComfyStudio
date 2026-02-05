# ADR Guide for AI Agents

**Purpose:** Understanding when and how to use Architecture Decision Records

---

## What Are ADRs?

**ADRs = Architecture Decision Records**

Short documents (5-20 lines) that **lock intentional design choices** to prevent well-meaning "improvements" that break things.

**Location:** `docs/adr/`

---

## Why ADRs Matter for AI Agents

### The Problem

AI agents naturally want to optimize:
```
Agent: "I see you're using glob imports. Why not a central registry file?"
Agent: "These two files could be merged into one!"
Agent: "Let's make these fields optional for flexibility!"
```

These seem like improvements, but they break intentional architectural decisions.

### The Solution

ADRs say: **"We considered that, here's why we chose differently"**

```
ADR-0001: We use convention-based loading BECAUSE:
- Zero boilerplate (just create files)
- Predictable (id = filename)
- No import order issues

Alternatives considered:
- Central registry → Rejected (easy to forget, not DRY)
- Decorators → Rejected (too complex)
```

---

## Current ADRs (Must Read Before Implementation)

### ADR-0001: Tool Registry Convention-Based Loading

**Locks:**
- Tool `id` must equal filename
- Discovery via `import.meta.glob('./definitions/*.ts')`
- No manual registration

**Forbids:**
- "Let's add a registry file"
- "Use dynamic import paths"
- "Make id configurable"

**Why:** Automatic discovery, zero boilerplate, predictable structure

---

### ADR-0002: Tool Definition Structure

**Locks:**
- Separate `definitions/` and `implementations/` folders
- Definition = data (metadata, settings schema)
- Implementation = behavior (hooks, code)

**Forbids:**
- "Merge into single file"
- "Put settings in implementation"
- "Make definitions JSON"

**Why:** Clear separation of concerns, wrapper pattern support, type safety

---

### ADR-0003: Tool Categories as Discriminated Unions

**Locks:**
- Three categories: canvas-interaction, workflow, selection
- Discriminated union (not single type with optional fields)
- Category field is required

**Forbids:**
- "Make all fields optional"
- "Use single interface"
- "Just use any"

**Why:** Type safety, invalid states unrepresentable, self-documenting

---

### ADR-0004: Dock Layout Persistence

**Locks:**
- localStorage (not IndexedDB)
- Versioned keys (`dock-layout.v1`)
- No migration code (version bump = fresh start)

**Forbids:**
- "Let's add migration logic"
- "Use IndexedDB for better storage"
- "Remove version from key"

**Why:** Simple, works offline, acceptable UX trade-off

---

## Workflow for AI Agents

### Before Changing Architecture

```
1. Check if ADR exists: ls docs/adr/
2. If yes: Read the ADR
3. If ADR forbids the change: STOP (don't do it)
4. If you think ADR is wrong: Ask user (don't change yourself)
```

### During Implementation

**If you want to suggest an improvement:**

❌ **Wrong:**
```
Agent: "I'll refactor these two files into one"
→ Breaks ADR-0002
```

✅ **Right:**
```
Agent: "I noticed definitions/ and implementations/ are separate.
ADR-0002 explains this is intentional for separation of concerns.
I'll keep them separate as designed."
```

### When ADR Doesn't Exist

**If there's no ADR for an area:**
- You CAN make reasonable improvements
- Follow general best practices
- But ask if unsure about major changes

---

## ADR Format (For Reference)

```markdown
# ADR-NNNN: Title

**Status:** Active | Superseded | Deprecated

**Date:** YYYY-MM-DD

**Context:**
Why we needed to decide (1-3 sentences)

**Decision:**
What we chose (1-3 sentences)

**Consequences:**
- Positive: What we gain
- Negative: What we lose
- Neutral: What we maintain

**Alternatives Considered:**
- Option A: Why rejected
- Option B: Why rejected
```

---

## When to Create New ADRs (User Does This)

**Users should create ADR when:**
- A design choice is non-obvious
- Multiple valid alternatives exist
- Future agents might "improve" it incorrectly
- The "why" needs to be remembered

**Agents should NOT create ADRs:**
- Ask user if you think one is needed
- User decides whether to lock a decision

---

## Common Scenarios

### Scenario 1: "This Could Be Simpler"

```
You see: definitions/ and implementations/ folders
You think: "Why two files? Let's merge them"
ADR-0002 says: NO - separation is intentional
Action: Keep them separate
```

### Scenario 2: "This Seems Inflexible"

```
You see: category field is required (not optional)
You think: "Let's make it optional for flexibility"
ADR-0003 says: NO - discriminated union needs it
Action: Keep it required
```

### Scenario 3: "I Can Optimize This"

```
You see: localStorage with version in key
You think: "IndexedDB is better, let's migrate"
ADR-0004 says: NO - localStorage is intentional
Action: Keep using localStorage
```

### Scenario 4: "This Needs a Feature"

```
You see: No migration code for dock layout
You think: "Users will lose state, let's add migrations"
ADR-0004 says: NO - version bump = fresh start is acceptable
Action: Don't add migrations (unless user explicitly requests)
```

---

## Red Flags (When to Check ADRs)

**Check ADRs if you're thinking:**
- "Let's refactor this structure"
- "Why not use [standard pattern]?"
- "This could be more flexible"
- "I'll add this optimization"
- "Let's merge these files"
- "Why not just..."

**These thoughts = Check for ADR first**

---

## ADR Lifecycle

**Active** - Current decision, must follow
**Superseded** - Replaced by newer ADR (links to replacement)
**Deprecated** - No longer applies (with explanation)

**Agents should:**
- Only follow "Active" ADRs
- Read "Superseded" to understand new decision
- Ignore "Deprecated"

---

## Examples of ADR Violations

### Violation 1: Ignoring ADR-0001

```typescript
// ❌ WRONG - Creating central registry
// tools/registry.ts
export const TOOL_REGISTRY = [
  { id: "brush", path: "./definitions/brush" },
  { id: "select", path: "./definitions/select" },
];

// ADR-0001 forbids this - use glob imports
```

### Violation 2: Ignoring ADR-0002

```typescript
// ❌ WRONG - Merging definition and implementation
// tools/brush.ts
export default {
  id: "brush",
  name: "Eraser",
  settings: [...],
  onMouseDown: (e) => { /* behavior */ }, // Behavior in definition!
};

// ADR-0002 forbids this - keep separate
```

### Violation 3: Ignoring ADR-0003

```typescript
// ❌ WRONG - Single type with optional fields
type ToolDefinition = {
  id: string;
  name: string;
  category?: "canvas" | "workflow" | "selection"; // Optional!
  cursor?: string;     // For canvas tools (but on all tools)
  workflow?: string;   // For workflow tools (but on all tools)
};

// ADR-0003 forbids this - use discriminated union
```

### Violation 4: Ignoring ADR-0004

```typescript
// ❌ WRONG - Adding migration code
export const load = (): DockLayoutState => {
  const raw = localStorage.getItem(STORAGE_KEY);
  const v1Data = localStorage.getItem("dock-layout.v1");

  if (v1Data) {
    // Migrate v1 → v2
    return migrateV1toV2(v1Data); // Don't do this!
  }
};

// ADR-0004 forbids this - version bump = fresh start
```

---

## Summary for Agents

**Golden Rule:**
**Before changing architecture, check docs/adr/ first**

**If ADR exists:**
- Follow it (even if you disagree)
- Don't "improve" it without user approval
- ADR overrides general best practices

**If no ADR:**
- Use reasonable judgment
- Follow implementation plan if available
- Ask user if major architectural decision

**Remember:**
- ADRs exist because we already considered the "obvious" improvements
- ADRs save time by preventing architectural churn
- ADRs enable multi-agent coordination (same rules for all)

---

**Last Updated:** 2026-01-28
**For:** All AI coding assistants
**See:** `docs/adr/README.md` for full ADR documentation
