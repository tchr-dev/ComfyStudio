# ADR-0007: Workflow Execution Semantics

**Date**: 2026-01-29
**Status**: Accepted
**Deciders**: Architecture Team
**Related**: Tool System Implementation, Workflow Execution Contract

---

## Context

ComfyStudio's declarative tool system supports three categories of tools: canvas-interaction, selection, and **workflow tools**. Workflow tools execute async operations via ComfyUI (text-to-image, image-to-image, inpainting, background removal/replacement).

We need to establish:

1. **When workflows execute** - What user actions trigger execution?
2. **How spatial input is captured** - For tools that operate on canvas selections
3. **How concurrent executions are managed** - Single, parallel, or queued
4. **How execution history is persisted** - Storage and retrieval

Without clear semantics, we risk:
- Accidental double-execution from tool switching
- Stale spatial input being re-executed
- Memory leaks from unbounded execution history
- Lost execution history on crashes
- Undefined behavior for concurrent executions

---

## Decision

We adopt a **queue-first execution model with explicit trigger semantics and revision-tracked spatial inputs**.

### 1. Trigger Semantics

**Core Principle:**
> Execution is triggered by intentional user action, never by state change alone.

**Triggers:**

- **Explicit Execute** (Primary):
  - Panel "Execute" button
  - Keyboard shortcut (`Enter` / `Cmd+Enter`)
  - Applies to all workflow tools

- **Canvas Interaction** (Spatial Tools Only):
  - Canvas click, drag, or drop that supplies spatial parameters
  - Only for tools with `triggerMode: "interaction"`
  - Examples: "click to generate", "drag to select background"

**Non-Triggers:**

These **never** trigger execution:
- Tool activation
- Tool switching
- Settings changes (sliders, dropdowns, text)
- State rehydration (reload, resize, restore)
- Panel focus

### 2. Spatial Input Revision Tracking

Spatial inputs (point, selection, mask, image) have a **revision number** that increments based on capture reason:

**Interaction tools** (`triggerMode: "interaction"`):
- Revision increments on **every triggering interaction**
- Even if spatial data is identical
- Prevents: Stale input re-execution after canvas interaction

**Explicit tools** (`triggerMode: "explicit"`):
- Revision increments only when **spatial data changes**
- Allows: Multiple "Execute" clicks with same selection

**Stale-input guard:**
```typescript
if (tool.triggerMode === "interaction" &&
    lastQueuedRevision >= currentRevision) {
  return null; // Don't queue stale input
}
```

### 3. Queue-First Architecture

Each tool maintains:
- `executions: Map<string, WorkflowExecution>` - All execution records
- `queuedIds: string[]` - Execution IDs in queue order
- `executingIds: string[]` - Currently running executions

**Run Policies:**

| Policy | Behavior | Use Case |
|--------|----------|----------|
| `single` | Only one execution total | Preview tools |
| `replace` | Cancel previous, start new | Real-time feedback |
| `parallel` | **Default** - unlimited concurrent | Independent generations |
| `queue` | Sequential - one at a time, with backlog | Batch processing |

### 4. Files-as-Truth Persistence

**History Storage:**
- JSONL files at `history/<toolId>/YYYY-MM-DD.jsonl`
- Artifacts at `artifacts/<execId>/<filename>`
- Append-only, atomic writes

**Pruning Policy:**
- Keep last N terminal executions in memory (default: 100)
- Prune by age (default: 7 days) and count
- Persist to history before pruning
- Never prune queued/executing

**Benefits:**
- No database dependency
- Crash-resilient (atomic appends)
- Reproducible (exact execution history)
- Debuggable (grep, jq, standard tools)

---

## Rationale

### Why Explicit Triggers?

**Alternatives Considered:**

A. **Activation = Execution**
- Pro: Faster workflow, fewer clicks
- Con: Accidental executions, unclear intent
- **Rejected**: Breaks user mental model ("switching tools ≠ running jobs")

B. **Auto-execute on Settings Change**
- Pro: Live preview-like experience
- Con: Expensive operations, batch pollution
- **Rejected**: Incompatible with slow ComfyUI workflows

**Decision: Explicit triggers with optional interaction mode**
- Pro: Clear user intent, no surprises
- Pro: Flexible (supports both patterns)
- Con: Requires extra click for explicit tools
- **Accepted**: Safety and clarity outweigh convenience

### Why Revision Tracking?

**Problem Without Revisions:**

1. User clicks canvas (captures point A)
2. Execution queues
3. User clicks canvas again (same point A)
4. System re-queues identical input (unintended)

**Solution: Revision numbers**
- Track "input capture epochs"
- Prevent stale input re-execution
- Allow intentional batching via override flag

### Why Queue-First?

**Alternative: Single Execution Model**
- Track one execution at a time per tool
- Pro: Simpler state management
- Con: Can't support batch workflows
- **Rejected**: Too limiting for real use cases

**Decision: Queue-first with policy selection**
- Pro: Supports all use cases (single, parallel, queue)
- Pro: Clean separation of concerns
- Con: More complex state management
- **Accepted**: Complexity is manageable and pays off

### Why Files-as-Truth?

**Alternatives Considered:**

A. **IndexedDB**
- Pro: Browser-native persistence
- Con: Quota limits, debugging difficulty
- **Rejected**: Not file-based, hard to inspect

B. **Backend Database**
- Pro: Unlimited storage, query power
- Con: Requires backend, network dependency
- **Rejected**: Adds infrastructure complexity

**Decision: JSONL files + artifact directories**
- Pro: Zero dependencies, simple backups
- Pro: Standard tools (grep, jq, cat)
- Pro: Git-compatible (can track history)
- Con: Limited query capabilities
- **Accepted**: Simplicity and transparency win

---

## Consequences

### Positive

✅ **Predictable execution** - No accidental double-runs
✅ **Type-safe spatial inputs** - Compile-time validation
✅ **Flexible concurrency** - Single/parallel/queue supported
✅ **Crash-resilient** - JSONL append-only history
✅ **Bounded memory** - Deterministic pruning
✅ **Reproducible** - Complete execution history
✅ **Debuggable** - Standard file-based tools

### Negative

⚠️ **Extra click required** - Explicit tools need "Execute" button click
⚠️ **More complex state** - Queue management adds logic
⚠️ **Limited query power** - JSONL files lack indexed queries

### Mitigation

**Extra click:**
- Keyboard shortcut (`Enter`) reduces friction
- Interaction mode available for spatial workflows

**Complex state:**
- Policy-driven behavior keeps logic clean
- Comprehensive tests ensure correctness

**Limited queries:**
- For V1, JSONL is sufficient
- V2 can add indexed search without changing storage format
- Query-only replica (SQLite) can be built from JSONL

---

## Implementation Notes

### State Machine

7 states: `idle` → `armed` → `queued` → `executing` → (`completed` | `failed` | `cancelled`)

- `armed` state only for spatial tools (non-spatial skip to `queued`)
- Terminal states require user dismissal or new execution to reset
- Queue must advance on **any** terminal transition

### TypeScript Types

```typescript
// Discriminated union eliminates invalid configs
type WorkflowTool = BaseToolDefinition & {
  category: "workflow";
  workflow: string;
  runPolicy?: "single" | "parallel" | "replace" | "queue";
} & (
  | { triggerMode: "explicit"; requiresSpatialInput: false }
  | { triggerMode: "explicit"; requiresSpatialInput: true; spatialInputType: SpatialInput["type"] }
  | { triggerMode: "interaction"; requiresSpatialInput: false }
  | { triggerMode: "interaction"; requiresSpatialInput: true; spatialInputType: SpatialInput["type"] }
);
```

Invalid states are **unrepresentable**:
- Can't have `requiresSpatialInput: true` without `spatialInputType`
- Can't have spatial input without required type

### ComfyUI Integration

```typescript
interface ComfyUIAdapter {
  queuePrompt(workflow: any): Promise<string>;  // Returns promptId
  cancelPrompt(promptId: string): Promise<void>;
  onProgress(callback: (data: ProgressData) => void): void;
  onComplete(callback: (data: ResultData) => void): void;
}
```

Each `WorkflowExecution` stores `comfyuiPromptId` for cancellation.

### UI Integration

**Execute Button States:**
- `disabled` - Run policy blocks or spatial input missing
- `armed` - Spatial input captured, ready to execute
- `ready` - Non-spatial tool, ready to execute

**Progress Indicators:**
- Queued: Show queue position
- Executing: Show progress bar (0-100)
- Completed: Show checkmark
- Failed: Show error icon + message

---

## Testing Validation

### Unit Tests

✅ State machine transitions (all valid paths)
✅ Revision tracking (interaction vs explicit)
✅ Run policies (single, replace, parallel, queue)
✅ Stale-input prevention
✅ Queue advancement

### Integration Tests

✅ End-to-end workflow execution
✅ Cancellation (mid-execution, queued)
✅ History persistence and pruning
✅ ComfyUI adapter integration

### Manual Verification

- Test all 5 workflow tools (generate, remove-bg, replace-bg, etc.)
- Test explicit vs interaction trigger modes
- Test all run policies
- Test batch variants (same-revision override)
- Test cancellation during queue and execution
- Test history persistence across app restart

---

## Related Documents

- **Workflow Execution Contract** - `docs/plans/2026-01-29-workflow-execution-contract.md`
- **Tool System Documentation** - `CLAUDE.md` (Declarative Tool System section)
- **ADR-0001** - Convention-based Tool Discovery
- **ADR-0002** - Tool Definition Structure
- **ADR-0003** - Tool Categories (Discriminated Unions)

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-29 | 1.0 | Initial ADR - Workflow execution semantics |

---

**Status**: Accepted and Frozen

This ADR documents the **final, authoritative** execution semantics for workflow tools. All implementations must conform to this contract.
