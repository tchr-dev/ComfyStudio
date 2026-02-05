# Design Plans & Specifications

This directory contains **human-readable design documents** - architectural decisions, feature proposals, and technical specifications.

## What Goes Here

**Architecture & design docs:**
- System designs
- Feature proposals
- Architecture decisions (ADRs)
- Technical specifications
- Planning documents for humans

**Format:** Markdown files with structure:
- Context and motivation
- Design decisions with rationale
- Architecture diagrams (if needed)
- Success criteria
- Open questions

## What Doesn't Go Here

**Agent-executable plans go to `.ai/plans/`:**
- Step-by-step implementation tasks
- TDD workflows with code examples
- Task breakdowns for agents

## Current Plans

- `2026-01-26-dock-supercontrols.md` - Dock system supercontrols feature plan
- `2026-01-28-declarative-tool-system-design.md` - Declarative tool system architecture

## Relationship to `.ai/plans/`

**Workflow:**
1. Design doc created here (`docs/plans/`) - "WHAT and WHY"
2. Design approved
3. Implementation plan created in `.ai/plans/` - "HOW (step-by-step)"
4. Agents execute implementation plan
5. After completion, design doc updated with "Implemented" status

## Creating New Designs

When creating design documents:
- Target humans as audience
- Focus on "why" and "what", not detailed "how"
- Include architectural decisions with rationale
- Explain trade-offs considered
- Define success criteria
- Leave implementation details for `.ai/plans/`
