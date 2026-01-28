# Project Status

**Last Updated:** 2026-01-28 18:30 UTC
**Active Branch:** `main`
**Active Agent:** Claude Sonnet 4.5

---

## Current Goal

**Implement declarative tool system for ComfyStudio**

Enable tools to be defined through TypeScript configuration files with automatic discovery, making it easy to add new tools (native editing tools + ComfyUI workflow tools).

---

## Active Work

**Phase:** Planning Complete → Ready for Implementation

**Current Step:** Awaiting user decision on execution approach:
- Option 1: Subagent-driven in this session (task-by-task with review)
- Option 2: Parallel session with executing-plans skill (batch execution)

---

## Recent Progress

1. ✅ **Brainstorming session completed** - Defined declarative tool system architecture
2. ✅ **Design document written** - `docs/plans/2026-01-28-declarative-tool-system-design.md`
3. ✅ **Implementation plan created** - 18 tasks with TDD approach in `.ai/plans/2026-01-28-declarative-tool-system-implementation.md`
4. ✅ **Multi-agent handover docs created** - AI_README.md, AGENTS.md, and .ai/ folder structure
5. ✅ **Documentation organized** - AI docs in .ai/, human docs in docs/
6. ✅ **All planning committed to git** - Main branch up to date

**Commits:**
- `e959e38` - Design document
- `0a68b97` - Implementation plan
- Latest: Multi-agent handover docs (uncommitted)

---

## What's Working

- ✅ Existing tool system (stub Registry, ToolsPanel, EditorToolPanel)
- ✅ Dock-based UI layout
- ✅ ComfyUI backend integration
- ✅ Domain-driven design architecture
- ✅ Test infrastructure (Vitest)
- ✅ Development workflow (yarn dev, test, build)

---

## What's Broken / At Risk

**Nothing broken** - all existing functionality intact.

**Risks:**
1. **Tool migration complexity** - Need to carefully wrap existing Editor.Brush and Editor.Selection without breaking functionality
2. **Workflow implementation** - Remove BG and Replace BG require ComfyUI workflow building (stubs only in plan)
3. **Settings initialization** - Need to ensure default values load correctly on first use

---

## Next Steps

**Immediate (waiting for user):**
1. User chooses execution approach (subagent-driven vs parallel session)
2. If subagent-driven: Start with Task 1 (Core Type Definitions)
3. If parallel session: User opens new session and loads executing-plans skill

**Implementation sequence (from plan):**
1. Tasks 1-3: Core infrastructure (Types, State, Registry)
2. Tasks 4-8: Tool definitions (brush, select, generate, remove-bg, replace-bg)
3. Tasks 9-11: UI integration (SettingRenderer, EditorToolPanel, ToolsPanel)
4. Tasks 12-15: Tool implementations (wrappers initially)
5. Tasks 16-18: Integration testing, docs, manual verification

**Success criteria:**
- All 5 tools appear in ToolsPanel with icons/descriptions
- EditorToolPanel auto-renders settings from schema
- Brush tool settings functional (size, strength, blur sliders)
- Generate tool shows all settings (prompt, sampler, steps, etc.)
- Tests pass, types compile, manual verification complete

---

## Dependencies / Blockers

**No blockers** - ready to proceed.

**Dependencies:**
- ComfyUI backend running (for workflow tools later)
- Existing Editor.Brush, Editor.Selection code (will wrap initially)
- Theme.Icon components for tool icons
- GlobalState for state management

---

## Commands for Reproduction

```bash
# Verify current state
git status
git log --oneline -5

# Start dev server
yarn dev

# Run all UI tests
yarn comfystudio-ui test

# Type check
yarn comfystudio-ui build:types

# Run specific test file
yarn comfystudio-ui test Registry.test.ts
```

---

## Notes for Next Agent

- Design is fully approved - no architectural questions remain
- Implementation plan uses TDD (test first, then implement)
- Wrapper pattern for existing tools means no breaking changes
- Tool definitions and implementations in separate directories
- Convention-based: tool id must match filename
- Three tool categories (discriminated union): canvas-interaction, workflow, selection

**If implementing:**
1. Follow plan tasks sequentially (they build on each other)
2. Run tests after each task
3. Commit after each task with co-author tag
4. Update this STATUS.md when switching tasks or hitting blockers
5. Update HANDOFF.md when completing a session or hitting stopping point
