# Architecture Decision Records (ADRs)

**Purpose:** Lock critical architectural decisions to prevent AI agents from "improving" things that must stay fixed.

## Why ADRs?

In multi-agent development (Claude, Codex, Gemini, etc.), AI assistants naturally want to optimize code. ADRs protect intentional design choices from being "improved" away.

**ADRs are NOT:**
- ❌ Bureaucratic documentation
- ❌ Long design documents
- ❌ Academic papers

**ADRs ARE:**
- ✅ Short (5-20 lines)
- ✅ Decision + rationale + consequences
- ✅ Protection against smart "optimizations"
- ✅ Memory for why things are this way

## Format

```markdown
# ADR-NNNN: Short Title

**Status:** Active | Superseded by ADR-XXXX | Deprecated

**Date:** YYYY-MM-DD

**Context:**
Why we needed to make this decision (1-3 sentences)

**Decision:**
What we decided to do (1-3 sentences)

**Consequences:**
What this means going forward (2-4 bullets)
- Positive: What we gain
- Negative: What we lose
- Neutral: What we must maintain

**Alternatives Considered:**
- Option A: Why rejected
- Option B: Why rejected
```

## When to Create an ADR

Create an ADR when you think: **"An AI agent might try to 'improve' this later"**

**Common triggers:**
- Convention-based systems (filename = id)
- Discovery mechanisms (glob imports)
- State persistence strategies
- Type system boundaries (discriminated unions)
- "Why didn't we just..." questions

**Don't create ADR for:**
- Obvious technical choices
- Standard patterns (React components, Zustand stores)
- Temporary implementation details

## Current ADRs

- **ADR-0001:** Tool Registry Convention-Based Loading
- **ADR-0002:** Tool Definition Structure (Definitions vs Implementations)
- **ADR-0003:** Tool Categories as Discriminated Unions
- **ADR-0004:** Dock Layout Persistence Strategy

## ADR Lifecycle

**Active** - Current decision, must be followed
**Superseded** - Replaced by newer ADR (link to it)
**Deprecated** - No longer applies (explain why)

## For AI Agents

**Before "improving" architecture:**
1. Check if an ADR exists for that area
2. If yes, do NOT change without explicit user approval
3. If you think the ADR is wrong, ask the user (don't change it)

**When implementing plans:**
- ADRs override general best practices
- ADRs explain "why not X" for common alternatives
- Respect ADR decisions even if they seem suboptimal
