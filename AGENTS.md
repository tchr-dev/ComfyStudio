# AGENTS.md

**AI Agent Operational Guide for ComfyStudio**

This file provides essential operational information for AI coding assistants (Claude, Codex, Gemini, etc.). For comprehensive codebase architecture, see `CLAUDE.md`.

---

## Quick Start

1. **Read this file first** - Essential workflow and commands
2. **Check `.ai/STATUS.md`** - Current project state
3. **Read `.ai/HANDOFF.md`** - Recent session context
4. **Review `.ai/TASKBOARD.md`** - Available tasks
5. **See `AI_README.md`** - Canonical documentation links
6. **Refer to `CLAUDE.md`** - Deep codebase architecture

---

## Project Context

**What:** ComfyStudio - ComfyUI-focused UI with declarative tool system

**Current Focus:** Implementing TypeScript-based declarative tool definitions with automatic discovery (5 tools: Brush, Select, Generate, Remove BG, Replace BG)

**Architecture:** Monorepo (Yarn workspaces), TypeScript, React, Vite, Domain-Driven Design

---

## Essential Commands

### Development Workflow

```bash
# Start dev server (port 3000)
yarn dev

# Run tests (always before committing)
yarn comfystudio-ui test

# Type check (must pass)
yarn comfystudio-ui build:types

# Lint
yarn comfystudio-ui lint

# Start full stack (ComfyUI + frontend)
yarn start
```

### Validation Before Commit

```bash
# Run this sequence before every commit
yarn comfystudio-ui build:types  # Types must compile
yarn comfystudio-ui test          # Tests must pass
yarn comfystudio-ui lint          # Lint must pass
git status                        # Review changes
```

### Working with Workspaces

```bash
# Target specific package
yarn comfystudio-ui <command>
yarn comfystudio-plugin <command>
yarn comfystudio-plugin-comfyui <command>
```

---

## Handover Documentation Workflow

### Before Starting Work

**Read handover docs in this order:**

1. **`.ai/STATUS.md`** - What's the current state? What's next?
2. **`.ai/HANDOFF.md`** - What did the previous agent do? Open questions?
3. **`.ai/TASKBOARD.md`** - What tasks are available? Dependencies?
4. **`.ai/plans/`** - Implementation plans for current work

### While Working

**Update as you go:**

```bash
# When starting a task
# Update .ai/TASKBOARD.md: Move task to DOING

# Hit a blocker?
# Update .ai/STATUS.md: Add to "What's Broken / At Risk"
# Update .ai/HANDOFF.md: Add to "Open Questions"

# Complete a task?
# Update .ai/TASKBOARD.md: Move task to DONE
# Commit with co-author tag
```

### After Completing Work

**Required updates before ending session:**

1. **Update `.ai/STATUS.md`**
   - Move completed items to "Recent Progress"
   - Update "Next Steps" with what should happen next
   - Add any new risks or blockers

2. **Update `.ai/HANDOFF.md`**
   - Add to "What Was Done This Session"
   - Document any open questions or decisions
   - List commands to reproduce your work
   - Note any gotchas or issues encountered

3. **Update `.ai/TASKBOARD.md`**
   - Move completed tasks to DONE
   - Add any new tasks discovered
   - Update blockers if any

4. **Commit everything**
   ```bash
   git add .ai/
   git commit -m "docs(handover): update session state

   [Brief summary of what was done]

   Co-Authored-By: [Your Agent Name] <noreply@[provider].com>"
   ```

---

## Task Execution Protocol

### TDD Workflow (From Implementation Plans)

All implementation follows Test-Driven Development:

1. **Write failing test** - Define expected behavior first
2. **Run test** - Verify it fails (proves test works)
3. **Write minimal implementation** - Just enough to pass
4. **Run test** - Verify it passes
5. **Commit** - With descriptive message and co-author tag

**Example:**
```bash
# Step 1-2: Write and run failing test
yarn comfystudio-ui test NewFeature.test.ts
# Expected: FAIL

# Step 3-4: Implement and verify
# ... write code ...
yarn comfystudio-ui test NewFeature.test.ts
# Expected: PASS

# Step 5: Commit
git add src/NewFeature.ts src/NewFeature.test.ts
git commit -m "feat: add new feature

- Implemented X functionality
- Added tests for Y scenarios

Co-Authored-By: Agent Name <noreply@provider.com>"
```

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

Co-Authored-By: <Agent> <email>
```

**Types:** feat, fix, docs, test, refactor, style, chore

**Example:**
```
feat(tools): add brush tool definition

- Define brush/eraser as canvas-interaction tool
- Include size, strength, and blur settings
- Set 'e' as keyboard shortcut

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## Critical Architecture Patterns

### Domain-Driven Design

**Pattern:** TypeScript declaration merging for fluent APIs

```tsx
export type User = { id: ID };
export function User({ id }: User.Props) { /* component */ }
export namespace User {
  export type Props = { id?: ID };
  export const use = (id: ID) => { /* hook */ };
}

// Usage:
const user: User = { id: "123" };        // As type
const data = User.use(id);               // As namespace hook
return <User id={user.id} />;            // As component
```

**Key Points:**
- Domains compose smaller domains (fractal structure)
- One domain = one folder structure
- Import root domains with `~/` alias
- Singular vs plural domains (User vs Users)

### State Management

**Pattern:** Zustand via GlobalState wrapper

```tsx
export namespace Feature {
  const store = GlobalState.create<State>((set) => ({
    value: 0,
    setValue: (value) => set({ value }),
  }));

  export const use = () => store((state) => state.value);
  export const useSet = () => store((state) => state.setValue);
}
```

**Key Points:**
- Export hooks, not state directly
- Use `GlobalState.shallow` for multiple selections
- State in namespace, not global scope

### Tool System (Current Work)

**Convention-Based Loading:**
- Tool definitions: `Tools/definitions/<id>.ts`
- Tool implementations: `Tools/implementations/<id>.ts`
- Tool `id` must match filename
- Vite glob imports for automatic discovery

**Tool Categories (Discriminated Union):**
- `canvas-interaction` - Draw on canvas (Brush)
- `workflow` - Trigger ComfyUI workflows (Generate, Remove BG)
- `selection` - Manage entity selection (Select)

---

## Definition of Done

Task is "done" when ALL of these pass:

- ✅ Tests pass (`yarn comfystudio-ui test`)
- ✅ Types compile (`yarn comfystudio-ui build:types`)
- ✅ Lint passes (`yarn comfystudio-ui lint`)
- ✅ Code committed with descriptive message
- ✅ Handover docs updated (STATUS, HANDOFF, TASKBOARD)
- ✅ Manual verification (if UI changes)

---

## Project Boundaries (DO NOT CHANGE)

### Architecture Decision Records (ADRs)

**Location:** `docs/adr/` - READ BEFORE CHANGING ARCHITECTURE

**Rule:** If an ADR exists for an area, DO NOT change without explicit user approval.

**Current locked decisions:**
- Tool discovery (ADR-0001): id = filename, glob imports
- Tool structure (ADR-0002): definitions/ vs implementations/
- Type system (ADR-0003): Discriminated unions for categories
- Dock persistence (ADR-0004): localStorage with versioning

**When AI wants to "improve" something:**
1. Check if ADR exists: `ls docs/adr/`
2. If yes, read the ADR
3. If ADR forbids the change, don't do it (even if it seems better)
4. If you think ADR is wrong, ask user (don't change it yourself)

### General Boundaries

**Without explicit ADR or user approval, DO NOT:**

1. Change monorepo structure (Yarn workspaces)
2. Change build tools (Vite, TypeScript, Vitest)
3. Change state management (Zustand wrapper)
4. Modify domain-driven design patterns
5. Change plugin architecture
6. Force push to main/master
7. Amend commits (create new commits instead)
8. **Violate any ADR decision** (even if it seems like an improvement)

**Safe to modify:**
- Tool definitions/implementations
- Component styling (Tailwind)
- Test files
- Documentation in `.ai/` and `docs/`

---

## Common Gotchas

### 1. Vite Glob Imports

```typescript
// ✅ CORRECT - String literal
import.meta.glob('./definitions/*.ts')

// ❌ WRONG - Dynamic paths don't work
import.meta.glob(`./${folder}/*.ts`)
```

### 2. Domain Imports

```typescript
// ✅ CORRECT - Use ~ alias for root domains
import { Editor } from "~/Editor";

// ❌ WRONG - Relative paths
import { Editor } from "../../../../../Editor";
```

### 3. State Management

```typescript
// ✅ CORRECT - Export hooks
export const use = () => store((state) => state.value);

// ❌ WRONG - Export store directly
export const store = GlobalState.create(...);
```

### 4. Test-Driven Development

```typescript
// ✅ CORRECT - Write test first
it("should work", () => {
  expect(feature()).toBe(expected);
});
// Watch it FAIL, then implement

// ❌ WRONG - Implement first, test later
```

---

## File Organization

### Human Documentation (Keep in `docs/`)

- Architecture designs
- Technical specifications
- ADRs (Architecture Decision Records)
- Planning documents for humans

**Example:** `docs/plans/2026-01-28-declarative-tool-system-design.md`

### AI Documentation (Keep in `.ai/`)

- Implementation plans (executable by agents)
- Task boards and status
- Handoff information
- Session logs

**Example:** `.ai/plans/2026-01-28-tool-system-implementation.md`

### Codebase Documentation

- `CLAUDE.md` - Comprehensive codebase guide
- `AGENTS.md` - This file (agent operations)
- `AI_README.md` - Entry point for all agents
- `README.md` - Project overview (for humans)

---

## Multi-Agent Coordination

### When Switching Agents

```bash
# 1. Update handover docs
# Edit .ai/STATUS.md, .ai/HANDOFF.md, .ai/TASKBOARD.md

# 2. Commit your work
git add .
git commit -m "docs(handover): session handoff to [next agent]"

# 3. Push if needed
git push origin main

# 4. Next agent reads:
# - AI_README.md (entry point)
# - .ai/STATUS.md (current state)
# - .ai/HANDOFF.md (session context)
```

### Agent-Specific Files

- **CLAUDE.md** - Comprehensive codebase guide (exists)
- **AGENTS.md** - This file (operations for all agents)
- **CODEX.md** - (Create if Codex-specific patterns needed)
- **GEMINI.md** - (Create if Gemini-specific patterns needed)

**Principle:** Common information in AGENTS.md and AI_README.md, tool-specific differences in separate files.

---

## Quick Reference

### Critical Domains

Located in `packages/comfystudio-ui/src/`:
- `App` - React root, providers
- `Editor` - Canvas, camera, tools
- `Tools` - Tool registry (current work)
- `Dock` - Panel system
- `Plugin` - Backend integration
- `Theme` - Design system
- `GlobalState` - State wrapper
- `Shortcut` - Keyboard shortcuts

### Technology Stack

- TypeScript (strict mode)
- React (hooks, functional components)
- Vite (dev server port 3000)
- Zustand (state management)
- Tailwind CSS (styling)
- Vitest (testing)
- Konva (canvas rendering)

### Test Commands

```bash
# All tests
yarn comfystudio-ui test

# Specific file
yarn comfystudio-ui test Registry.test.ts

# Watch mode
yarn comfystudio-ui test --watch

# Coverage
yarn comfystudio-ui test --coverage
```

---

## Getting Help

### Stuck? Check These in Order:

1. `.ai/STATUS.md` - Known issues and blockers
2. `.ai/HANDOFF.md` - Previous agent's notes
3. `CLAUDE.md` - Architecture patterns
4. `.ai/plans/` - Implementation details
5. `docs/plans/` - Design documents

### Update Blockers:

```bash
# Add to .ai/STATUS.md under "What's Broken / At Risk"
# Add to .ai/HANDOFF.md under "Open Questions"
# Commit and notify user
```

---

## Success Criteria

**Your session is successful if:**

1. ✅ All commits have passing tests
2. ✅ Types compile without errors
3. ✅ Handover docs updated accurately
4. ✅ Next agent can continue seamlessly
5. ✅ No breaking changes to existing functionality

**Even if incomplete:**
- Document what's done and what's next
- Update STATUS with current blocker
- Commit work in progress (WIP: prefix)
- Update HANDOFF with reproduction steps

---

**Last Updated:** 2026-01-28
**For:** All AI coding assistants (Claude, Codex, Gemini, etc.)
**See Also:** `CLAUDE.md` (architecture), `AI_README.md` (entry point)
