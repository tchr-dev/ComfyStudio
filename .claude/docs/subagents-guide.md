# Subagents Guide

Subagents are specialized AI agents that run in parallel to review code, analyze patterns, or perform focused tasks. ComfyStudio uses subagents for domain-specific expertise.

## Available Subagents

### execution-reviewer

**Purpose**: Validate changes to the workflow execution system

**Location**: `.claude/agents/execution-reviewer.md`

**Expertise**:
- State machine integrity (7-state FSM)
- History persistence (atomic writes, crash resistance)
- Observation boundary (UI never mutates state)
- Pure functions (no side effects)
- Revision tracking (monotonic revisions)
- Cancellation safety (race conditions)
- Test coverage (306 tests)

**When to use**:
- After editing `src/execution/` files
- Before committing execution changes
- When reviewing PRs touching execution code
- After refactoring state machines
- Before integration work

## Using Subagents

### Method 1: Via Skill (Recommended)

Use the wrapper skill:

```bash
/review-execution [scope]
```

Scopes:
- `all` (default) - Review all changes
- `state` - State machine only
- `history` - History persistence only
- `runner` - Runner lifecycle only
- `adapter` - ComfyUI adapter only
- `spatial` - Spatial capture only
- `ui` - UI/hooks only

### Method 2: Direct Invocation

I can invoke subagents directly when appropriate. For example, when you say:

```
"I just finished updating the state machine, can you review it?"
```

I'll automatically invoke the execution-reviewer agent.

### Method 3: Manual Task Tool

You can also request manual invocation:

```
"Launch the execution-reviewer agent to check my changes"
```

## Subagent Workflow

### 1. You Make Changes

```bash
# Edit execution system files
vim src/execution/state/fsm.ts
vim src/execution/state/transitions.ts

# Save changes
git status
```

### 2. Invoke Reviewer

```bash
/review-execution state
```

### 3. Agent Analyzes

The agent will:
1. Read changed files
2. Run relevant tests
3. Check architectural compliance
4. Identify issues/warnings
5. Provide recommendations

### 4. Review Results

Output format:
```markdown
## Execution System Review

### Summary
Added timeout handling to state transitions. Overall structure looks good.

### Compliance Check

#### ✅ Passes
- State machine integrity maintained
- Unidirectional flow preserved
- Terminal immutability correct
- Pure functions still pure

#### ⚠️  Warnings
- New timeout logic should have dedicated test
- Consider edge case: timeout during terminal transition

#### ❌ Issues
None

### Test Coverage
- Tests run: 67 tests in state module
- Status: all passing
- Coverage: unchanged

### Recommendations
1. Add test case for timeout during state transitions
2. Document timeout behavior in README
3. Consider adding timeout to ExecutionConfig type

### Approval Status
- [x] Approved - ready to merge (with test addition)
```

### 5. Address Feedback

Fix any issues, then re-review if needed:

```bash
# Add recommended test
vim src/execution/state/__tests__/fsm.test.ts

# Re-review
/review-execution state
```

## Subagent vs Regular Review

### Regular Code Review

When you say "review my code", I review as the main Claude instance:
- General code quality
- Style consistency
- Basic logic errors
- TypeScript types

### Subagent Review

When you say "/review-execution", a specialized agent reviews:
- Domain-specific architecture
- System-specific principles
- Complex invariants
- Integration concerns
- Test coverage in context

**Use subagents for**:
- Complex subsystems with strict rules
- Critical code that needs expert validation
- Domain-specific architectural patterns

**Use regular review for**:
- General code quality
- Styling and formatting
- Simple bug fixes
- Documentation

## Creating Custom Subagents

You can create your own subagents for other domains:

### Example: plugin-reviewer

```markdown
# Plugin Architecture Reviewer

You are a specialized reviewer for ComfyStudio's plugin system.

## Architecture Principles

1. **Plugin Isolation**: Plugins never import from each other
2. **Base Plugin Contract**: All plugins implement @comfystudio/plugin interface
3. **Optional Functions**: Missing plugin functions degrade gracefully
4. **No Side Effects**: Plugin exports are pure functions

## Review Checklist

- [ ] Plugin implements base interface
- [ ] No cross-plugin imports
- [ ] Functions are pure (deterministic)
- [ ] Error handling is graceful
- [ ] TypeScript types are exported

[... detailed review instructions ...]
```

Save to: `.claude/agents/plugin-reviewer.md`

Then create a skill:

```markdown
---
name: review-plugin
description: Review plugin system changes
---

# Review Plugin Changes

Launches the plugin-reviewer agent.

[... skill content ...]
```

## Parallel Subagents

You can run multiple subagents in parallel:

```bash
# I can launch multiple agents simultaneously
"Review both the execution system and plugin changes in parallel"
```

This runs:
- execution-reviewer on `src/execution/`
- plugin-reviewer on `packages/comfystudio-plugin-*/`

Both agents work concurrently and report back independently.

## Best Practices

### 1. Scope Reviews Appropriately

✅ **Good**:
```bash
/review-execution state  # Focused scope
```

❌ **Bad**:
```bash
/review-execution  # Unnecessarily broad if you only changed state machine
```

### 2. Review Before Committing

✅ **Good workflow**:
```bash
# Make changes
vim src/execution/state/fsm.ts

# Review
/review-execution state

# Fix issues
vim src/execution/state/fsm.ts

# Commit
git commit -m "fix: state transition logic"
```

❌ **Bad workflow**:
```bash
# Commit first
git commit -m "changes"

# Review after (harder to fix)
/review-execution
```

### 3. Use for Complex Changes

✅ **Use subagent for**:
- State machine refactoring
- History persistence changes
- Adapter modifications

✅ **Don't need subagent for**:
- Typo fixes
- Comment updates
- Simple variable renames

### 4. Act on Feedback

Subagents provide actionable recommendations. Don't ignore them:

✅ **Good**:
```
Agent: "Add test for edge case X"
You: *adds test*
You: /review-execution state  # Re-review
```

❌ **Bad**:
```
Agent: "Add test for edge case X"
You: *ignores and commits*
```

## Subagent Output Files

Reviews may create temporary files:

```
/tmp/
├── execution-review-state.md      # State machine review
├── execution-review-history.md    # History review
└── execution-test-output.txt      # Test results
```

These files are referenced in the review output.

## Integration with CI/CD

You can run subagent reviews in CI:

```yaml
# .github/workflows/review.yml
name: Execution System Review

on:
  pull_request:
    paths:
      - 'packages/comfystudio-ui/src/execution/**'

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Review execution changes
        run: |
          claude -p "Review execution system changes in this PR" \
                --agent execution-reviewer \
                --output review.md
      - name: Comment on PR
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const review = fs.readFileSync('review.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: review
            });
```

## Troubleshooting

### Subagent Not Found

If `/review-execution` doesn't work:

1. **Check agent exists**:
   ```bash
   ls -la .claude/agents/execution-reviewer.md
   ```

2. **Check skill exists**:
   ```bash
   ls -la .claude/skills/review-execution/SKILL.md
   ```

3. **Restart Claude Code** to reload agents/skills

### Agent Doesn't Have Context

If agent seems unaware of system details:

1. **Check agent file** has comprehensive instructions
2. **Ensure README exists**: `src/execution/README.md`
3. **Add more context** to agent file if needed

### Review Takes Too Long

If reviews are slow:

1. **Narrow scope**: Use `state`, `history`, etc. instead of `all`
2. **Skip tests temporarily**: Edit agent to skip test runs for quick checks
3. **Use regular review**: For simple changes, regular review is faster

## Summary

Subagents provide specialized domain expertise:

| Aspect | Regular Review | Subagent Review |
|--------|---------------|-----------------|
| **Expertise** | General | Domain-specific |
| **Depth** | Surface-level | Architectural |
| **Speed** | Fast | Thorough |
| **Use for** | Simple changes | Complex subsystems |

**ComfyStudio subagents**:
- `execution-reviewer` - Workflow execution system validation

**Coming soon** (you can create):
- `plugin-reviewer` - Plugin architecture validation
- `tool-reviewer` - Declarative tool system validation
- `dock-reviewer` - Dock layout system validation

Use subagents for critical subsystems where architectural discipline matters!
