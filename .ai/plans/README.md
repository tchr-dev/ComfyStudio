# AI Implementation Plans

This directory contains **agent-executable implementation plans** - step-by-step task lists with TDD approach for AI agents.

## What Goes Here

**Agent-executable plans:**
- Step-by-step implementation tasks
- Test-first (TDD) workflows
- File paths and code examples
- Expected test outputs
- Commit message templates

**Format:** Markdown files with structure:
- Task breakdown (numbered steps)
- Files to create/modify
- Test code before implementation code
- Validation commands
- Commit instructions

## What Doesn't Go Here

**Human-readable docs go to `docs/`:**
- Architecture designs
- Technical specifications
- Feature proposals
- ADRs (Architecture Decision Records)

## Current Plans

- `2026-01-28-declarative-tool-system-implementation.md` - Tool system implementation (18 tasks, TDD approach)

## Usage

AI agents should:
1. Read plan from start to finish
2. Execute tasks sequentially (they build on each other)
3. Follow TDD workflow: test → fail → implement → pass → commit
4. Update `.ai/TASKBOARD.md` as tasks complete
5. Update `.ai/STATUS.md` if hitting blockers

## Creating New Plans

When creating implementation plans:
- Target AI agents as audience
- Include exact file paths
- Provide complete code examples
- Specify test expectations
- Add validation commands
- Estimate task duration (minutes)
