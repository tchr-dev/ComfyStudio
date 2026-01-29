# ADR-0008: History Store (Files-as-Truth)

**Date**: 2026-01-29
**Status**: Accepted
**Deciders**: Architecture Team
**Related**: ADR-0007 (Workflow Execution Semantics), M2 Implementation Plan

---

## Context

Workflow executions need durable storage that:
1. **Survives crashes** - Execution history persists across app restarts
2. **Is reproducible** - Replay reconstructs exact state
3. **Requires no database** - Zero infrastructure dependencies
4. **Is debuggable** - Standard tools (grep, jq, cat) work
5. **Supports pruning** - Bounded storage with deterministic cleanup
6. **Handles artifacts** - Large binary outputs (images, zips) stored efficiently

Without durable storage, users lose execution history on crashes, can't reproduce bugs, and have no audit trail.

---

## Decision

We adopt a **files-as-truth** storage model with:
- **JSONL append-only ledgers** for execution/error records
- **Per-tool directories** to localize writes and reduce contention
- **Artifact bundles** with manifests for binary outputs
- **Optional indexes** for replay acceleration (not source of truth)
- **Deterministic pruning** with configurable policies

### Storage Layout

```
<workspace_root>/
  history/
    v1/                           # Storage format version
      README.md                   # Human-readable format docs
      meta.json                   # Store-wide metadata (optional)
      tools/
        <toolId>/
          executions/
            executions.jsonl      # Append-only execution ledger
            executions.idx.json   # Optional index (accelerator)
            pruning.json          # Pruning config + last run marker
          artifacts/
            <executionId>/
              manifest.json       # Artifact inventory
              files/
                <artifact files>  # Binary blobs
          errors/
            errors.jsonl          # Append-only error ledger
```

### File Contracts

#### 1. `history/v1/meta.json` (Optional)

Store-wide metadata - **not required for replay correctness**.

```json
{
  "format": { "name": "comfystudio.history", "version": 1 },
  "createdAt": "2026-01-29T20:15:00.000Z",
  "app": { "name": "ComfyStudio", "build": "git:abcd1234" }
}
```

**Write pattern**: Small JSON, rewritten occasionally (atomic replace).

#### 2. `tools/<toolId>/executions/executions.jsonl` (Required)

**Append-only ledger** of execution lifecycle facts.

**Record type**: ExecutionRecordV1 (one JSON object per line)

```json
{
  "v": 1,
  "type": "execution",
  "executionId": "uuid",
  "toolId": "bg.remove",
  "state": "queued|executing|completed|failed|cancelled",
  "revision": 12,
  "captured": {
    "settings": { "any": "json" },
    "spatialInput": { "type": "point|selection|mask|image", "data": {} }
  },
  "timestamps": {
    "queuedAt": "ISO-8601",
    "startedAt": "ISO-8601|null",
    "endedAt": "ISO-8601|null"
  },
  "progress": 0,
  "result": { "any": "json|null" },
  "errorRef": { "executionErrorId": "uuid|null" },
  "comfyui": { "promptId": "string|null" }
}
```

**Invariants**:
- **Monotonic truth**: Store can contain multiple records for same executionId; replay uses **latest valid** record by append order
- **Terminal immutability**: Once terminal (completed/failed/cancelled), later records must not "un-terminal" during replay
- **Never edit in place**: Append-only only

**Write pattern**: Append one line per record; fsync optional but recommended.

#### 3. `tools/<toolId>/executions/executions.idx.json` (Optional Accelerator)

Optional index for replay acceleration - **not source of truth**.

```json
{
  "v": 1,
  "toolId": "bg.remove",
  "builtAt": "2026-01-29T20:20:00.000Z",
  "entries": {
    "executionId-1": { "offset": 12345, "line": 77, "state": "completed" },
    "executionId-2": { "offset": 23456, "line": 78, "state": "executing" }
  }
}
```

**Invariants**:
- Must be safe to delete; replay falls back to scanning JSONL
- If corrupted, ignore and rebuild

**Write pattern**: Rewrite occasionally (atomic replace).

#### 4. `tools/<toolId>/executions/pruning.json` (Optional)

Deterministic pruning configuration + last prune marker.

```json
{
  "v": 1,
  "policy": {
    "maxTerminalCount": 500,
    "maxTerminalAgeDays": 30,
    "keepLatestPerRevision": true
  },
  "lastPrunedAt": "2026-01-29T20:25:00.000Z"
}
```

**Write pattern**: Rewrite (atomic replace).

#### 5. `tools/<toolId>/artifacts/<executionId>/manifest.json` (Optional)

Artifact inventory linking artifacts back to execution.

```json
{
  "v": 1,
  "executionId": "uuid",
  "toolId": "bg.remove",
  "createdAt": "ISO-8601",
  "artifacts": [
    {
      "artifactId": "uuid",
      "kind": "image|mask|json|zip|other",
      "filename": "output.png",
      "path": "files/output.png",
      "sha256": "hex",
      "bytes": 123456,
      "mime": "image/png",
      "role": "primary|preview|debug"
    }
  ]
}
```

**Invariants**:
- Manifest is truth for artifact existence
- Artifacts immutable once written

**Write pattern**: Write once at completion (atomic replace ok).

#### 6. `tools/<toolId>/artifacts/<executionId>/files/*` (Optional)

Raw artifact blobs (images, zips, etc.).

**Write pattern**: Write to temp file → fsync → rename to final name.

**Invariants**:
- Filenames referenced in manifest must exist
- Write to `files/.tmp/<name>` then atomic rename to `files/<name>`

#### 7. `tools/<toolId>/errors/errors.jsonl` (Optional)

Append-only error ledger, referenced by errorRef in executions.

```json
{
  "v": 1,
  "type": "execution_error",
  "executionErrorId": "uuid",
  "executionId": "uuid",
  "toolId": "bg.remove",
  "at": "ISO-8601",
  "category": "comfyui|validation|io|unknown",
  "message": "string",
  "details": { "any": "json|null" },
  "stack": "string|null"
}
```

**Write pattern**: Append-only.

---

## Crash-Resilience Rules

1. **Append-only JSONL** for executions & errors - never edit in place
2. **Atomic replace** for small JSON (meta.json, *.idx.json, pruning.json, manifest.json) via write-temp-then-rename
3. **Artifacts** written via temp file + rename
4. **Tolerant replay** must handle:
   - Truncated last line in JSONL (ignore it)
   - Corrupt index (ignore/rebuild)
   - Missing artifacts folder (execution still replays fine)

---

## Replay Semantics

### Goal

Reconstruct in-memory `ToolExecutionState` from JSONL files, equivalent to live state.

### Algorithm

**Step 1: Load execution snapshots**
- Build `latestById: Map<executionId, ExecutionRecordV1>` by scanning JSONL
- **Scan rule (crash tolerant)**:
  - Read line-by-line
  - If JSON parse fails: **stop scanning** (truncated tail)
  - For each valid record: update map (last-line wins for same executionId)

**Step 2: Enforce monotonic / terminal immutability**
- If latest.state is terminal but earlier non-terminal records exist: terminal wins
- If latest.state is non-terminal but has endedAt: coerce to failed

**Step 3: Convert records → WorkflowExecution objects**
- Pure mapping from ExecutionRecordV1 to in-memory WorkflowExecution

**Step 4: Reconstruct queue + active sets (derived)**
- `activeExecutionIds` = executions where state == "executing"
- `queuedExecutionIds` = executions where state == "queued"
- Sort queued by (queuedAt, executionId) for deterministic order

**Step 5: Run policy enforcement**
- **queue policy**: If multiple executing, keep earliest startedAt, fail rest
- **single/replace**: If multiple non-terminal, keep winner by priority rules

**Step 6: Integrity checks (warnings only)**
- Emit warnings for missing errorRef, orphaned artifacts, etc.
- Never block replay

---

## Pruning Invariants

### Core Rules

1. **Never prune non-terminal** (queued/executing always kept)
2. **Deterministic selection** (same input → same kept set)
3. **Artifacts pruned iff execution pruned**
4. **Errors pruned iff unreferenced by kept executions**
5. **Replay correctness preserved** (replay yields same current state for kept IDs)

### Default Policy

```typescript
type PrunePolicy = {
  maxTerminalCount: number;        // e.g., 500
  maxTerminalAgeDays: number;      // e.g., 30
  keepLatestPerRevision: boolean;  // true = protect latest per revision
};
```

### Selection Algorithm

**Eligible set**: Terminal executions not protected

**Protected set**:
- If `keepLatestPerRevision`: One execution per revision (prefer completed, then latest endedAt)
- Latest terminal overall (nice UX)

**Delete oldest first**:
- Sort by (endedAt, executionId) ascending
- Delete until constraints satisfied:
  - `terminalCount ≤ maxTerminalCount`
  - `terminalAge ≤ maxTerminalAgeDays`

### Compaction Methods

**A) Tombstone pruning** (simpler):
- Keep JSONL forever
- Create pruned.json listing pruned executionIds
- Replay ignores tombstoned IDs

**B) Segment compaction** (recommended):
- Write new executions.compacted.jsonl with kept snapshots only
- Atomic swap: rename old → .bak, rename compacted → executions.jsonl
- Rebuild index after swap

---

## Rationale

### Why Files-as-Truth?

**Alternatives Considered**:

A. **IndexedDB**
- Pro: Browser-native persistence
- Con: Quota limits (5MB), debugging difficulty, no standard tools
- **Rejected**: Not file-based, hard to inspect/backup

B. **Backend Database (SQLite, Postgres)**
- Pro: Unlimited storage, query power, ACID guarantees
- Con: Requires backend, network dependency, infrastructure complexity
- **Rejected**: Adds deployment complexity, not zero-infrastructure

C. **JSON files (non-JSONL)**
- Pro: Simple structure
- Con: Rewrite entire file on every update (slow, not crash-safe)
- **Rejected**: Poor performance, high corruption risk

**Decision: JSONL + artifact directories**
- Pro: Zero dependencies, simple backups
- Pro: Standard tools (grep, jq, cat) work
- Pro: Git-compatible (can track history)
- Pro: Append-only is crash-resilient
- Con: Limited query capabilities (no SQL)
- **Accepted**: Simplicity and transparency win for V1

### Why Per-Tool Directories?

**Alternative**: Single global executions.jsonl for all tools

**Rejected because**:
- Write contention (all tools append to one file)
- Large file size (slow scans)
- Harder to reason about tool-specific pruning

**Per-tool** wins:
- Localized writes (less contention)
- Smaller files (faster replay)
- Tool-specific pruning policies

### Why Append-Only JSONL?

**Alternative**: Event sourcing (smaller events: "queued", "started", "completed")

**JSONL snapshots** chosen because:
- Simpler replay (one record = full state)
- Easier debugging (one line has all context)
- Still append-only (crash-safe)
- Event sourcing can be added later if needed

### Why Optional Indexes?

**Problem**: Scanning large JSONL files is slow

**Solution**: Optional index accelerates replay
- Maps executionId → (offset, line, state)
- Rebuild if corrupted (never blocks replay)
- Future: SQLite read replica for complex queries

---

## Consequences

### Positive

✅ **Zero dependencies** - No database, no network, works offline
✅ **Crash-resilient** - Append-only + atomic writes
✅ **Debuggable** - grep/jq/cat work out-of-box
✅ **Reproducible** - Complete execution history
✅ **Bounded storage** - Deterministic pruning
✅ **Git-compatible** - Can version-control history
✅ **Fast writes** - Append-only is O(1)

### Negative

⚠️ **Limited query power** - No SQL, complex queries need custom code
⚠️ **Replay cost** - Must scan JSONL to reconstruct state (mitigated by indexes)
⚠️ **Manual pruning** - No automatic GC (must trigger explicitly)

### Mitigation

**Limited queries**:
- V1: Sufficient for basic needs (replay, prune)
- V2: Add SQLite read replica (query-only, rebuilt from JSONL)
- Future: Full-text search on settings/errors

**Replay cost**:
- Use indexes for O(1) lookup by executionId
- Background index rebuilds
- Future: Incremental replay (only changed files)

**Manual pruning**:
- Run on timer (daily/weekly)
- Trigger on UI action (user-initiated cleanup)
- Future: Auto-prune on storage threshold

---

## Implementation Notes

### Atomic File Operations

**Write-temp-then-rename pattern**:
```typescript
async function atomicWrite(path: string, data: string) {
  const tmp = `${path}.tmp.${Date.now()}`;
  await fs.writeFile(tmp, data, "utf8");
  await fs.rename(tmp, path); // Atomic on POSIX
}
```

### JSONL Scanning (Crash-Tolerant)

```typescript
async function* scanJsonlTolerant(path: string) {
  const lines = (await fs.readFile(path, "utf8")).split("\n");
  for (const line of lines) {
    if (!line.trim()) continue; // Skip empty
    try {
      yield JSON.parse(line);
    } catch {
      console.warn("Truncated/corrupt line, stopping scan");
      break; // Stop on first parse error
    }
  }
}
```

### Deterministic Queue Sort

```typescript
function sortQueuedExecutions(execs: WorkflowExecution[]): string[] {
  return execs
    .filter((e) => e.state === "queued")
    .sort((a, b) => {
      // Primary: queuedAt ascending
      const tDiff = a.queuedAt!.getTime() - b.queuedAt!.getTime();
      if (tDiff !== 0) return tDiff;
      // Tie-break: executionId lex ascending
      return a.id.localeCompare(b.id);
    })
    .map((e) => e.id);
}
```

---

## Testing Validation

### Unit Tests

✅ Atomic file writes (temp + rename)
✅ JSONL tolerant scanning (handles truncated lines)
✅ Deterministic queue sorting
✅ Terminal immutability enforcement

### Integration Tests

✅ Full replay from JSONL
✅ Pruning with all policies
✅ Artifact cleanup
✅ Error reference resolution

### Acceptance Tests

See `src/execution/history/__tests__/m2.acceptance.*.spec.ts`:
- 10+ tests covering replay, pruning, contracts
- Tests define the public API surface
- All tests must pass before M2 is complete

---

## Related Documents

- **ADR-0007**: Workflow Execution Semantics (state machine, triggers)
- **M2 Implementation Plan**: `docs/plans/2026-01-29-workflow-execution-implementation-plan.md`
- **JSON Schemas**: Embedded in this ADR (ExecutionRecord, ArtifactRecord, ErrorRecord)

---

## Revision History

| Date | Version | Changes |
|------|---------|------------|
| 2026-01-29 | 1.0 | Initial ADR - Files-as-truth storage model |

---

**Status**: Accepted and Frozen

This ADR documents the **final, authoritative** storage model for workflow execution history. All M2 implementations must conform to this contract.
