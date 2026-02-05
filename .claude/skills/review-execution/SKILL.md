---
name: review-execution
description: Review execution system changes using specialized execution-reviewer agent
disable-model-invocation: false
---

# Review Execution System Changes

Launches the specialized `execution-reviewer` agent to validate changes to the workflow execution system.

## Usage

```bash
/review-execution [scope]
```

### Scopes

- **all** (default) - Review all execution system changes
- **state** - Review state machine changes only
- **history** - Review history persistence changes only
- **runner** - Review runner lifecycle changes only
- **adapter** - Review ComfyUI adapter changes only
- **spatial** - Review spatial capture changes only
- **ui** - Review UI/hooks changes only

## Examples

### Review All Changes

```bash
/review-execution
```

Reviews all uncommitted changes in `src/execution/`.

### Review Specific Module

```bash
/review-execution state
```

Reviews only state machine changes.

### Review Before Committing

```bash
# Make changes to execution system
git status

# Review before committing
/review-execution

# If approved, commit
git add src/execution/
git commit -m "feat(execution): add timeout handling"
```

### Review Pull Request

```bash
# Checkout PR branch
git checkout pr-branch

# Review changes
/review-execution

# See specific feedback
```

## What the Agent Checks

The execution-reviewer agent validates:

1. ✅ **State Machine Integrity**: Unidirectional flow, terminal immutability
2. ✅ **History Persistence**: Atomic writes, fsync, crash resistance
3. ✅ **Observation Boundary**: UI observes, doesn't mutate state
4. ✅ **Pure Functions**: No side effects in core logic
5. ✅ **Revision Tracking**: Monotonic revisions, correct snapshots
6. ✅ **Cancellation Safety**: Best-effort, race condition handling
7. ✅ **Test Coverage**: Unit tests, integration tests, edge cases

## Review Output

The agent provides:

```markdown
## Execution System Review

### Summary
[Overall assessment]

### Compliance Check
#### ✅ Passes
[What looks good]

#### ⚠️  Warnings
[Non-critical issues]

#### ❌ Issues
[Critical problems]

### Test Coverage
- Tests run: 306 tests
- Status: all passing
- Coverage: unchanged

### Recommendations
1. [Specific suggestions]

### Approval Status
- [x] Approved / [ ] Needs changes / [ ] Needs discussion
```

## When to Use

Use `/review-execution` when:

- ✅ After making changes to `src/execution/`
- ✅ Before committing execution system changes
- ✅ When reviewing PRs that touch execution code
- ✅ After refactoring state machine logic
- ✅ When adding new execution features
- ✅ Before integration work begins

## Integration with Git Workflow

### Pre-commit Review

```bash
# Work on execution system
vim src/execution/state/fsm.ts

# Review before staging
/review-execution state

# If approved, commit
git add src/execution/state/
git commit -m "fix(execution): correct terminal state handling"
```

### PR Review

```bash
# Fetch PR
gh pr checkout 123

# Review execution changes
/review-execution

# Comment on PR with findings
gh pr comment 123 --body "$(cat review-output.md)"
```

## Notes

- The agent runs tests automatically to verify changes
- Reviews focus on architectural compliance, not code style
- Agent understands the execution system's 306-test suite
- Uses context from `src/execution/README.md` and tests

## Related

- **Agent**: `.claude/agents/execution-reviewer.md`
- **Documentation**: `src/execution/README.md`
- **Integration Plan**: `src/execution/INTEGRATION_PLAN.md`
- **Tests**: `src/execution/**/__tests__/`
