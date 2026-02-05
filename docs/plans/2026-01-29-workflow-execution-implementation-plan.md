# Workflow Execution Implementation Plan

**Date**: 2026-01-29
**Status**: Ready for Implementation
**Implements**:
- Contract: `docs/plans/2026-01-29-workflow-execution-contract.md`
- ADR: `docs/adr/ADR-0007-workflow-execution-semantics.md`

---

## Goals

Implement the frozen workflow execution contract with:

- ✅ **7-state monotonic FSM** (idle→armed→queued→executing→terminal)
- ✅ **Queue-first per-tool execution maps** with 4 run policies
- ✅ **Spatial input revision tracking** with stale prevention
- ✅ **Files-as-truth history** (JSONL) + artifacts + deterministic pruning
- ✅ **ComfyUI adapter** with promptId tracking for cancellation
- ✅ **UI triggers** (explicit only) + progress + cancel + spatial capture
- ✅ **Unit + integration + E2E tests** enforcing all invariants

---

## Delivery Milestones

1. **M0** - Scaffolding + types wired (compile-safe, no behavior yet)
2. **M1** - State manager + queue policies (pure logic, fully unit-tested)
3. **M2** - History store (JSONL + artifacts) + pruning (crash-safe I/O)
4. **M3** - ComfyUI adapter + cancellation (real runs, prompt-id tracking)
5. **M4** - UI triggers + progress + spatial capture (end-to-end usable)
6. **M5** - Integration/E2E + hardening (race, crash recovery, pruning, perf)

---

## M0 — Scaffolding & Contract-to-Code Mapping

**Goal**: Types + module boundaries + empty implementations; build passes.

### Tasks

**Create module layout:**
```
src/execution/
  types/              # Contract types + shared primitives
  state/              # Pure FSM + queue policies + revision rules
  history/            # JSONL writer, replay, prune, artifacts
  adapters/comfyui/   # Submit, poll/subscribe, cancel, mapping
  runner/             # Bridge FSM ↔ adapter ↔ history
  ui/                 # Trigger wiring, progress model, disable rules
  spatial/            # Capture, normalize, revisions
  dev/                # Dev harness for simulation
```

**Module responsibilities:**

- `types/` - Imports from contract, no runtime logic
- `state/` - Pure state machine + queue logic (no I/O)
- `history/` - JSONL writer, artifact store, prune (file I/O only)
- `adapters/comfyui/` - Submit, poll, cancel, map events (network I/O)
- `runner/` - Orchestrates state ↔ adapter ↔ history
- `ui/` - Trigger wiring, progress, disable rules
- `spatial/` - Capture events, revision tracking

**Runtime validators (where needed):**

Only add runtime checks for:
- Loading persisted JSONL events
- Parsing artifact manifests
- Accepting external adapter payloads (ComfyUI)

Invalid states are already unrepresentable via TypeScript discriminated unions.

**Dev harness:**

Create `src/execution/dev/simulate.ts`:
- Simulates basic state transitions in-memory
- No UI, no ComfyUI, no file I/O
- Just pure state machine operations
- Useful for rapid iteration and debugging

### Quality Gates

- ✅ `pnpm lint` passes
- ✅ `pnpm typecheck` passes
- ✅ `pnpm test` passes (empty suite ok)

### Dependencies

None.

---

## M1 — State Manager (Core Logic)

**Goal**: Deterministic reducer + guards; invalid states unrepresentable; tests cover all transitions/policies.

This is the "brain". Keep it **pure** (no I/O, no network) for brutal testability.

### M1.1 FSM Core

**Files:**
- `src/execution/state/fsm.ts`
- `src/execution/state/guards.ts`
- `src/execution/state/reducer.ts`
- `src/execution/state/ops.ts`

**Tasks:**

**Encode states:**
```typescript
type State = "idle" | "armed" | "queued" | "executing" | "completed" | "failed" | "cancelled";
```

Transitions:
```
idle → armed → queued → executing → (completed | failed | cancelled)
```

**Enforce invariants:**
- Strict monotonic transitions (no backward moves)
- Terminal state immutability (completed/failed/cancelled)
- Queue advancement guarantees (auto-advance on terminal)

**Implement core operations:**

```typescript
// Names match contract exactly
function armExecution(toolId: string, trigger: Trigger): void;
function enqueueRun(toolId: string, runSpec: RunSpec): WorkflowExecution | null;
function startNext(toolId: string): void;
function markProgress(execId: string, progress: number): void;
function complete(execId: string, result: any): void;
function fail(execId: string, error: string): void;
function cancel(execId: string, reason?: string): void;
```

Don't add extra operations not in the contract.

### M1.2 Queue-First + Run Policies

**Files:**
- `src/execution/state/queue.ts`
- `src/execution/state/policies.ts`

**Tasks:**

**Per-tool execution map:**
```typescript
type ToolExecutionState = {
  toolId: string;
  executions: Map<string, WorkflowExecution>;
  queuedIds: string[];
  executingIds: string[];
  activeExecutionId?: string;
  currentSpatialInput?: SpatialInputSnapshot;
  lastQueuedRevision?: number;
};
```

**Implement policies:**

| Policy | Behavior |
|--------|----------|
| `single` | Reject if executing or queued |
| `replace` | Cancel current + clear queue + enqueue new |
| `parallel` | Allow multiple executing (adapter must support) |
| `queue` | FIFO serialize - one at a time with backlog |

**Deterministic ordering:**
- FIFO queue for `queue` policy
- Deterministic replacement for `replace` (log cancellation cause)
- Stable tie-breaking if needed

### M1.3 Revision Rules + Stale Prevention

**Files:**
- `src/execution/state/revisions.ts`

**Tasks:**

**Represent revisions:**
- Monotonic integers per spatial input channel
- Separate revision per tool (isolated)

**Implement compare functions:**
```typescript
function isStale(requiredRevision: number, currentRevision: number): boolean;
```

**Implement revision policies:**

**Interaction tools** (`triggerMode: "interaction"`):
- Revision increments on **every interaction** (even if data identical)
- Prevents: Accidental double-execution from same canvas interaction

**Explicit tools** (`triggerMode: "explicit"`):
- Revision increments only when **spatial data changes**
- Allows: Multiple "Execute" clicks with same selection

### M1 Tests

**Files:**
- `src/execution/state/__tests__/fsm.test.ts`
- `src/execution/state/__tests__/policies.test.ts`
- `src/execution/state/__tests__/revisions.test.ts`

**Must test:**

**FSM Tests:**
- Every allowed transition succeeds
- Forbidden transitions are rejected
- Terminal immutability (no mutation after terminal)
- Queue advancement on complete/fail/cancel

**Policy Tests:**
- `single`: Rejects if active/queued
- `replace`: Cancels deterministically, clears queue
- `parallel`: Allows multiple concurrent
- `queue`: FIFO advancement, one at a time

**Revision Tests:**
- Interaction tools increment per capture
- Explicit tools increment only on data change
- Stale prevention truth table
- Same-revision batching with override flag

### Quality Gates

- ✅ 100% transition coverage
- ✅ No async / no I/O in state layer
- ✅ Reducer is deterministic (pure functions)
- ✅ All tests pass

### Dependencies

M0.

---

## M2 — History Store (Files-as-Truth)

**Goal**: Crash-resilient append-only history; deterministic pruning; restart replay reconstructs execution map.

### M2.1 JSONL Writer (Append-Only)

**Files:**
- `src/execution/history/jsonl.ts`
- `src/execution/history/historyStore.ts`

**Tasks:**

**Implement:**
```typescript
async function appendEvent(toolId: string, event: HistoryEvent): Promise<void>;
```

**File path:**
```
history/<toolId>/YYYY-MM-DD.jsonl
```

**Format:**
- One JSON object per line
- No trailing commas
- Stable key ordering (optional but nice for diffing)

**Crash-resilience:**
- Append-only writes
- Fsync strategy: Per write OR batch with timer (contract requires crash-resilient)
- Tolerate partial trailing line on next replay (ignore + warn)

**Directory creation:**
- Create `history/` and `history/<toolId>/` as needed
- Handle permissions errors gracefully

### M2.2 Artifact Store

**Files:**
- `src/execution/history/artifacts.ts`

**Tasks:**

**Implement:**
```typescript
async function writeArtifact(execId: string, name: string, bytes: Buffer): Promise<void>;
async function writeArtifactJSON(execId: string, name: string, obj: any): Promise<void>;
```

**File path:**
```
artifacts/<execId>/<filename>
```

**Examples:**
- `artifacts/exec-123/image-0.png`
- `artifacts/exec-123/image-1.png`
- `artifacts/exec-123/result.json`

**Directory creation:**
- Create `artifacts/` and `artifacts/<execId>/` as needed

### M2.3 Deterministic Pruning

**Files:**
- `src/execution/history/prune.ts`

**Tasks:**

**Implement prune rules:**
```typescript
type PrunePolicy = {
  maxHotExecutionsPerTool: number;     // e.g., 200
  maxTerminalHotPerTool: number;       // e.g., 100
  terminalMaxAgeMs?: number;           // e.g., 7 days
};

async function pruneToolState(
  toolState: ToolExecutionState,
  policy: PrunePolicy
): Promise<string[]>;  // Returns pruned execution IDs
```

**Pruning algorithm:**

1. **Age-based prune** - Remove terminal executions older than `terminalMaxAgeMs`
2. **Count-based prune** - Keep newest N terminal executions per tool
3. **Hard cap** - Never exceed `maxHotExecutionsPerTool` total
4. **Persist before prune** - Always save to history store before removing
5. **Never prune non-terminal** - Keep all queued/executing

**Deterministic selection:**
- Oldest dates first
- For same day: oldest lines/execs first OR prune whole-day files only (choose one, document it)

**Artifact sync:**
- Prune artifacts for pruned execIds
- OR implement orphan cleanup pass (log orphans, clean periodically)

### M2.4 Replay (Rehydration Without Triggering)

**Files:**
- `src/execution/history/replay.ts`

**Tasks:**

**Implement:**
```typescript
async function replay(
  toolId: string,
  dateRange: { start: Date; end: Date }
): Promise<ToolExecutionState>;
```

**Behavior:**
- Read JSONL events from `history/<toolId>/YYYY-MM-DD.jsonl`
- Rebuild execution map from events
- **MUST NOT enqueue or execute anything** - only reconstruct state
- Bound replay scope per pruning rules (don't scan unbounded history)

**Crash tolerance:**
- Tolerate partial trailing line (ignore + warn)
- Handle malformed JSON (skip + warn)
- Continue replay even if some events are invalid

### M2 Tests

**Files:**
- `src/execution/history/__tests__/jsonl.test.ts`
- `src/execution/history/__tests__/replay.test.ts`
- `src/execution/history/__tests__/prune.test.ts`

**Must test:**

**JSONL Tests:**
- Append writes correct format
- Multiple appends create valid JSONL
- Trailing partial line is tolerated on replay

**Replay Tests:**
- Replay reconstructs expected state
- Replay does NOT trigger executions
- Malformed events are skipped gracefully

**Prune Tests:**
- Pruning is deterministic (same input → same output)
- Age-based pruning works correctly
- Count-based pruning keeps newest N
- Artifacts directory is cleaned

### Quality Gates

- ✅ History append is append-only
- ✅ Replay is bounded (no unbounded scans)
- ✅ No implicit triggers during replay
- ✅ Crash tolerance verified

### Dependencies

M1 (for event shape + state reconstruction rules).

---

## M3 — ComfyUI Adapter + Runner

**Goal**: Runs submit to ComfyUI, receive progress, write history + artifacts; cancel via promptId.

### M3.1 Adapter Interface + ComfyUI Client

**Files:**
- `src/execution/adapters/types.ts`
- `src/execution/adapters/comfyui/client.ts`
- `src/execution/adapters/comfyui/mapper.ts`

**Tasks:**

**Define adapter API:**
```typescript
interface WorkflowAdapter {
  submit(runSpec: RunSpec): Promise<{ promptId: string }>;
  poll(promptId: string): Promise<ProgressEvent | ResultEvent | ErrorEvent>;
  cancel(promptId: string): Promise<void>;
}
```

**Map ComfyUI payloads:**
- ComfyUI progress → internal `ProgressEvent`
- ComfyUI result → internal `ResultEvent`
- ComfyUI error → internal `ErrorEvent`

**Normalize errors:**
- Network error (connection failed)
- Workflow error (ComfyUI execution failed)
- Cancelled (user requested cancel)

**Polling strategy:**
- Poll interval: 500ms (configurable)
- Exponential backoff on network errors
- Stop polling on terminal events

### M3.2 Runner (Bridge FSM ↔ Adapter ↔ History)

**Files:**
- `src/execution/runner/runner.ts`
- `src/execution/runner/scheduler.ts`

**Tasks:**

**For each tool execution map:**

```typescript
async function processExecutionQueue(toolId: string): Promise<void> {
  // 1. Check if can start next execution (based on policy)
  // 2. If yes: transition queued → executing
  // 3. Call adapter.submit(runSpec)
  // 4. Store promptId in executing state
  // 5. Emit history event: EXEC_STARTED
  // 6. Poll for progress/completion
  // 7. On progress: emit EXEC_PROGRESS
  // 8. On terminal: emit terminal event + write artifacts
  // 9. Advance queue if needed
}
```

**Cancellation:**
```typescript
async function cancelExecution(execId: string): Promise<void> {
  const exec = getExecution(execId);

  if (exec.state === "queued") {
    // Cancel locally (no adapter call)
    cancel(execId, "user-cancelled");
  } else if (exec.state === "executing" && exec.comfyuiPromptId) {
    // Cancel via adapter
    await adapter.cancel(exec.comfyuiPromptId);
    cancel(execId, "user-cancelled");
  }
}
```

**Ensure runner is policy-aware:**
- `queue` policy: Start next only after current completes
- `parallel` policy: Start all queued executions
- `single`/`replace`: Handled by queue logic (don't start if policy blocks)

### M3 Tests (Integration-Level)

**Mock ComfyUI client:**
```typescript
class MockComfyUIClient implements WorkflowAdapter {
  async submit(runSpec: RunSpec): Promise<{ promptId: string }> {
    return { promptId: `mock-${Date.now()}` };
  }

  async poll(promptId: string): Promise<ProgressEvent | ResultEvent | ErrorEvent> {
    // Simulate progress, then completion
  }

  async cancel(promptId: string): Promise<void> {
    console.log(`Cancelled: ${promptId}`);
  }
}
```

**Test scenarios:**
- Happy path (submit → progress → complete)
- Workflow error (submit → progress → failed)
- Network failure mid-run
- Cancel flow (queued vs executing)

**Assert:**
- State transitions are correct
- History events appended in correct order
- Artifacts written on completion
- `promptId ↔ execId` mapping always present for executing

### Quality Gates

- ✅ `promptId ↔ execId` mapping always present for executing
- ✅ Cancel never "lies" (either cancelled locally or adapter cancel executed)
- ✅ Runner cannot execute anything not triggered/enqueued
- ✅ All tests pass

### Dependencies

M1 + M2 (state machine + history store).

---

## M4 — UI Integration + Spatial Capture + Progress

**Goal**: Execute button and shortcut work; progress visible; cancel works; spatial triggers work only where allowed.

### M4.1 Trigger Wiring (Explicit Only + Never-Trigger List)

**Files:**
- `src/execution/ui/triggers.ts`

**Tasks:**

**Hook explicit triggers:**
- Execute button click
- Keyboard shortcut (`Enter` / `Cmd+Enter`)

**Hook canvas triggers (ONLY for spatial workflows per contract):**
- `armed` state + capture event → enqueue
- Only for tools with `triggerMode: "interaction"`

**Enforce never-triggers:**

These **MUST NOT** trigger execution:
- ❌ Tool activation
- ❌ Tool switching
- ❌ Settings changes (sliders, dropdowns, text)
- ❌ State rehydration (reload, resize, restore)
- ❌ Panel focus

**Dev logging:**
- Add console.warn when a blocked trigger is attempted
- Helps catch regressions during development
- Remove or gate behind `DEBUG` flag for production

### M4.2 Progress Model + Disable Rules + Cancel

**Files:**
- `src/execution/ui/progressModel.ts`
- `src/execution/ui/components/ExecutionStatus.tsx`

**Tasks:**

**Show per-tool status:**
```typescript
type ExecutionStatus = {
  state: WorkflowExecutionState;
  queuedCount: number;
  executingCount: number;
  progress?: number;           // 0-100 for executing
  lastTerminal?: {
    state: "completed" | "failed" | "cancelled";
    completedAt: Date;
    error?: string;
  };
};
```

**Execute button disable logic:**
```typescript
function getExecuteButtonState(
  tool: WorkflowTool,
  toolState: ToolExecutionState
): "disabled" | "armed" | "ready" {
  // Check run policy
  const policy = runPolicyBehavior[tool.runPolicy ?? "parallel"];
  if (!policy.canQueue(toolState)) return "disabled";

  // Check spatial input requirements
  if (tool.requiresSpatialInput) {
    if (!toolState.currentSpatialInput) return "disabled";
    if (toolState.currentSpatialInput.data.type !== tool.spatialInputType) return "disabled";
    return "armed";  // "Ready to execute" or "Click to run"
  }

  return "ready";
}
```

**Cancel button:**
- Show only when state is `executing`
- Disabled if no `comfyuiPromptId` (shouldn't happen, but safe)
- Click → calls `cancelExecution(execId)`

### M4.3 Spatial Capture + Revisions

**Files:**
- `src/execution/spatial/types.ts`
- `src/execution/spatial/capture.ts`
- `src/execution/spatial/revision.ts`

**Tasks:**

**Capture events per spatial type:**

| Type | Capture Event | Data |
|------|---------------|------|
| `point` | Pointer up / click | `{ x, y }` |
| `selection` | Mouse up after drag | `{ x, y, width, height }` |
| `mask` | Mask created / selected | `{ maskId, bounds }` |
| `image` | Entity selected / dropped | `{ entityId }` |

**Increment revisions:**
```typescript
type CaptureReason = "interaction" | "explicit";

function captureSpatialInput(
  toolState: ToolExecutionState,
  tool: WorkflowTool,
  snapshot: SpatialInput,
  reason: CaptureReason
): void {
  const prev = toolState.currentSpatialInput?.data;
  const prevRev = toolState.currentSpatialInput?.revision ?? 0;

  // Revision policy
  const shouldBump =
    reason === "interaction"
      ? true  // Always increment for interaction tools
      : !prev || !isSameSpatialInput(prev, snapshot);  // Only if changed

  toolState.currentSpatialInput = {
    data: snapshot,
    capturedAt: new Date(),
    revision: shouldBump ? prevRev + 1 : prevRev,
  };
}
```

**Stale prevention UI:**
- If stale input blocks execution, show tooltip/message
- "Canvas input has changed - click again to capture new input"
- Or auto-rearm on new capture (contract allows either)

### M4 Tests

**Files:**
- `src/execution/ui/__tests__/triggers.test.ts`
- `src/execution/ui/__tests__/progress.test.ts`
- `src/execution/spatial/__tests__/capture.test.ts`
- `src/execution/spatial/__tests__/revisions.test.ts`

**Must test:**

**Trigger Tests:**
- Execute button calls `enqueueRun`
- Keyboard shortcut calls `enqueueRun`
- Activation does NOT call `enqueueRun`
- Settings change does NOT call `enqueueRun`
- State rehydration does NOT call `enqueueRun`

**Progress Tests:**
- Status updates on state transitions
- Execute button disabled when policy blocks
- Cancel button shown only when executing

**Spatial Tests:**
- Capture increments revision correctly
- Stale prevention blocks re-queue
- Same-revision batching works with override

### Quality Gates

- ✅ No run starts without explicit user intent
- ✅ UI never triggers on hydration/settings change
- ✅ Spatial events only trigger when armed per contract
- ✅ All tests pass

### Dependencies

M1 + M3 (state machine + runner).

---

## M5 — E2E + Hardening + Invariants Lock-In

**Goal**: Full end-to-end confidence; crash recovery validated; pruning verified; no accidental triggers.

### M5.1 Integration Test Suite

**Must cover:**

**Policy Tests:**
- ✅ `single` policy rejects re-entry
- ✅ `replace` policy cancels + replaces deterministically
- ✅ `queue` FIFO across multiple runs
- ✅ `parallel` allows multiple concurrent

**Cancellation Tests:**
- ✅ Cancel queued → local cancel, no adapter call
- ✅ Cancel executing → adapter cancel called
- ✅ Queue advances after cancel

**Crash Recovery Tests:**
- ✅ History replay after crash-truncated JSONL
- ✅ Malformed events skipped gracefully
- ✅ State reconstructed correctly

**Pruning Tests:**
- ✅ Pruning removes expected history files
- ✅ Pruning removes expected artifacts
- ✅ Deterministic (same input → same output)

**Restart Tests:**
- ✅ Restart rehydrates state without triggering
- ✅ UI shows correct state after reload
- ✅ No executions start on app load

### M5.2 E2E Tests (Playwright/Cypress)

**Must cover:**

**Basic Workflow:**
1. ✅ Click Execute button → one run starts
2. ✅ Progress updates visible in UI
3. ✅ Run completes → result shown
4. ✅ Click Cancel → run cancelled

**Spatial Workflow:**
1. ✅ Activate spatial tool → not armed yet
2. ✅ Click canvas → tool armed
3. ✅ Click Execute → run enqueued
4. ✅ Run completes → artifact saved

**Stale Prevention:**
1. ✅ Click canvas (revision 1) → armed
2. ✅ Click Execute → run queued (revision 1)
3. ✅ Click canvas again (same point) → still revision 1
4. ✅ Click Execute → blocked (stale)
5. ✅ Click canvas (different point) → revision 2
6. ✅ Click Execute → run queued (revision 2)

**Restart:**
1. ✅ Run a workflow → completes
2. ✅ Reload app → state restored
3. ✅ No executions triggered on reload
4. ✅ History visible in UI

### M5.3 Performance & Robustness

**Progress Event Throttling:**
- If ComfyUI spams progress events, throttle writes
- Preserve ordering + terminal event certainty
- Example: Buffer events, write max 10/sec

**Replay Bounds:**
- Ensure replay scans only bounded date range
- Don't scan entire history on every startup
- Example: Last 7 days or last N files

**Queue Map Bounds:**
- Ensure execution map is pruned regularly
- Don't accumulate unbounded terminal executions
- Example: Prune after each terminal transition

**Artifact Storage:**
- Monitor disk usage (warn at 80% of quota)
- Provide cleanup utility for old artifacts
- Example: `cleanArtifacts(olderThan: Date)`

### M5 Tests

**Files:**
- `tests/integration/execution.test.ts`
- `tests/e2e/workflow-execution.spec.ts`

**CI Configuration:**
- Run unit tests on every commit
- Run integration tests on every PR
- Run E2E tests before merge to main

### Quality Gates

- ✅ CI runs unit + integration + E2E
- ✅ "Never triggers" regression test exists
- ✅ All tests pass
- ✅ Coverage > 80% for state machine

### Dependencies

M1 + M2 + M3 + M4.

---

## Recommended File Tree

```
src/execution/
  types/
    contract.ts         # Import from workflow execution contract
    ids.ts              # UUID generation, ID types
    events.ts           # History event types

  state/
    fsm.ts              # State machine core
    guards.ts           # Transition guards
    reducer.ts          # Pure state reducer
    ops.ts              # Core operations (arm, enqueue, start, etc.)
    queue.ts            # Per-tool execution map
    policies.ts         # Run policy implementations
    revisions.ts        # Revision tracking + stale prevention
    __tests__/
      fsm.test.ts
      policies.test.ts
      revisions.test.ts

  history/
    jsonl.ts            # JSONL append writer
    historyStore.ts     # History store interface
    artifacts.ts        # Artifact directory manager
    prune.ts            # Deterministic pruning
    replay.ts           # Replay from JSONL
    __tests__/
      jsonl.test.ts
      replay.test.ts
      prune.test.ts

  adapters/
    types.ts            # Adapter interface
    comfyui/
      client.ts         # ComfyUI HTTP client
      mapper.ts         # ComfyUI → internal event mapping

  runner/
    runner.ts           # Main execution runner
    scheduler.ts        # Queue processing + advancement

  spatial/
    types.ts            # Spatial input types (point, selection, mask, image)
    capture.ts          # Capture logic
    revision.ts         # Revision increment + compare
    __tests__/
      capture.test.ts
      revision.test.ts

  ui/
    triggers.ts         # Trigger wiring (Execute button, shortcuts, canvas)
    progressModel.ts    # Execution status for UI
    components/
      ExecutionStatus.tsx
      ExecuteButton.tsx
      CancelButton.tsx

  dev/
    simulate.ts         # Dev harness for manual testing

tests/
  integration/
    execution.test.ts   # Integration tests (policies, cancellation, crash recovery)

  e2e/
    workflow-execution.spec.ts  # E2E tests (Playwright/Cypress)
```

---

## Sequencing (Do in This Exact Order)

1. **M1** - FSM + policies + revision logic (pure + tested)
2. **M2** - History + artifacts + prune + replay (crash-safe)
3. **M3** - ComfyUI adapter + runner (real runs)
4. **M4** - UI triggers + progress + spatial (user-facing)
5. **M5** - E2E + hardening (ship quality)

**Do NOT skip ahead.** Each milestone depends on the previous one being complete.

---

## Definition of Done (Matches Contract Guarantees)

- ✅ No execution occurs without explicit trigger (or allowed canvas trigger)
- ✅ State transitions are monotonic, terminals immutable
- ✅ Queue behavior matches policy definitions
- ✅ Cancellation works via promptId mapping
- ✅ JSONL is append-only, tolerant of crash-corrupted last line
- ✅ Artifacts stored under `artifacts/<execId>/`
- ✅ Pruning is deterministic and bounded
- ✅ On restart, history rehydrates state without triggering runs
- ✅ Unit + integration + E2E tests cover critical paths
- ✅ All quality gates pass

---

## Next Action (Start Now)

**Create the state machine foundation:**

1. Create `src/execution/state/` folder
2. Implement **M1.1 reducer + guards** with tests for all transitions
3. Only after tests are green, move to policies (M1.2)

**Command:**
```bash
mkdir -p src/execution/state/__tests__
touch src/execution/state/{fsm,guards,reducer,ops}.ts
touch src/execution/state/__tests__/fsm.test.ts
```

**First test to write:**
```typescript
// src/execution/state/__tests__/fsm.test.ts
import { describe, it, expect } from 'vitest';
import { transition } from '../fsm';

describe('Workflow Execution FSM', () => {
  it('allows idle → armed transition for spatial tools', () => {
    const result = transition('idle', 'ARM', { spatialInput: { /* ... */ } });
    expect(result.state).toBe('armed');
  });

  it('rejects armed → idle transition', () => {
    expect(() => transition('armed', 'RESET')).toThrow();
  });

  // ... more transition tests
});
```

Start with the tests. Make them pass. Move forward.

---

**Status**: Ready for Implementation

This plan is complete, sequenced, and locked. Follow the milestones in order. All quality gates must pass before proceeding to the next milestone.
