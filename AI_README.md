# AI Agent Documentation

**Single Entry Point for AI Coding Assistants (Claude Code, Codex, Gemini, etc.)**

This file provides the canonical entry point for any AI agent working on ComfyStudio. All agents should read this file first to understand the current project state and where to find detailed information.

## Current Focus

**Implementing Declarative Tool System** - Transitioning from scattered tool code to TypeScript-based declarative tool definitions with automatic discovery and type-safe settings.

**Goals:**
- Define tools through TypeScript configuration files
- Convention-based loading (id matches filename)
- Three tool categories: canvas-interaction, workflow, selection
- Native tools + ComfyUI workflow tools (Remove BG, Replace BG)

**Status:** ✅ Design complete, ✅ Implementation plan ready, 🚧 Ready to implement

## Canonical Documentation

### Current Session Context
- **Handoff Package:** `.ai/` folder
  - `.ai/STATUS.md` - Current state, active work, next steps
  - `.ai/TASKBOARD.md` - Task board with TODO/DOING/DONE
  - `.ai/HANDOFF.md` - Detailed handover information

### Architecture & Design
- **Dock System Plan:** `docs/plans/2026-01-26-dock-supercontrols.md`
- **Tool System Design:** `docs/plans/2026-01-28-declarative-tool-system-design.md`
- **Tool System Implementation Plan:** `.ai/plans/2026-01-28-declarative-tool-system-implementation.md` *(agent-executable)*

### Codebase Guide
- **CLAUDE.md** - Comprehensive codebase guide (architecture, commands, conventions)
- **README.md** - Project overview and quick start

## Definition of Done

A task is considered "done" when:

1. ✅ **Tests pass** - All relevant tests pass (`yarn comfystudio-ui test`)
2. ✅ **Code committed** - Changes committed with descriptive message and co-author tag
3. ✅ **Types compile** - No TypeScript errors (`yarn comfystudio-ui build:types`)
4. ✅ **Manual verification** - Feature works as expected in browser
5. ✅ **Documentation updated** - Relevant docs updated if architecture changed
6. ✅ **Handoff updated** - `.ai/STATUS.md` and `.ai/HANDOFF.md` reflect current state

## Development Commands

```bash
# Start full stack (ComfyUI + ComfyStudio)
yarn start

# Start dev server only
yarn dev

# Run tests
yarn comfystudio-ui test

# Type check
yarn comfystudio-ui build:types

# Lint
yarn comfystudio-ui lint
yarn comfystudio-ui lint:fix

# Build
yarn build
```

## Project Boundaries

**Do NOT change without explicit decision/ADR:**

1. **Monorepo structure** - Yarn workspaces in `packages/`
2. **Domain-driven design** - Fractal domain structure with TypeScript namespaces
3. **Plugin architecture** - Plugins live in separate packages
4. **State management** - Zustand via GlobalState wrapper
5. **Build tooling** - Vite for bundling
6. **Git workflow** - Main branch, feature branches, conventional commits

**Safe to modify:**
- Tool definitions in `packages/comfystudio-ui/src/Tools/definitions/`
- Tool implementations in `packages/comfystudio-ui/src/Tools/implementations/`
- Component styling (Tailwind classes)
- Test files
- Documentation in `docs/`

## Architecture Decision Records

**Coming soon:** `docs/adr/` will contain architectural decisions:
- ADR-0001: Tool registry convention-based loading
- ADR-0002: Dock layout persistence strategy
- ADR-0003: [Future decisions]

## Multi-Agent Protocol

When handing off to another agent:

1. **Update `.ai/STATUS.md`** - Current state and next steps
2. **Update `.ai/HANDOFF.md`** - What you did, open questions, commands to reproduce
3. **Update `.ai/TASKBOARD.md`** - Move tasks to appropriate columns
4. **Commit your work** - Even if incomplete, commit with clear message
5. **Document blockers** - If stuck, explain what's blocking progress

## Agent-Specific Notes

Each AI assistant may have a separate file for tool-specific conventions:
- **CLAUDE.md** - Already exists (comprehensive codebase guide)
- **CODEX.md** - (Create if needed for Codex-specific patterns)
- **GEMINI.md** - (Create if needed for Gemini-specific patterns)

All common information stays in this file (AI_README.md) to avoid divergence.

## Quick Start for New Agent

1. Read this file (AI_README.md)
2. Read `.ai/STATUS.md` for current state
3. Read `.ai/HANDOFF.md` for recent context
4. Check `.ai/TASKBOARD.md` for available tasks
5. Read relevant design doc from `docs/plans/`
6. Start working, update `.ai/` files when done

---

**Last Updated:** 2026-01-28
**Active Branch:** main
**Active Agent:** Claude Sonnet 4.5
