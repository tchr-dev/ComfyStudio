# ADR-0009: ComfyUI Failure Semantics for Workflow Runner

- Status: **Accepted**
- Date: **2026-01-30**
- Owners: ComfyStudio Core (Execution + ComfyUI Integration)

## Context

Milestone M3 introduces a ComfyUI Adapter + Runner that executes workflows against a ComfyUI backend. ComfyUI is an external system that can fail in multiple ways:

- transient network errors
- backend restarts (job memory loss)
- job disappearance / eviction
- partial or missing progress signals
- inconsistent status visibility during load
- cancellation race conditions (cancel vs complete)

ComfyStudio must provide deterministic, monotonic execution semantics and ensure the execution queue never deadlocks, while using the History Store (M2) as the single source of truth.

We need explicit semantics for how the Runner interprets ComfyUI failure modes and how it records those outcomes.

## Decision

We define a **failure semantics contract** between the Workflow Runner and ComfyUI:

1. **ComfyUI is treated as a best-effort execution backend.**
   - The Runner is responsible for deterministically mapping backend observations into ComfyStudio execution state transitions.

2. **ComfyStudio execution states are monotonic and terminal-immutable.**
   - Once an execution is terminal (`completed | failed | cancelled`), subsequent backend observations MUST NOT change it.

3. **Failure classification is explicit and deterministic.**
   - Every non-successful terminal outcome is recorded as either:
     - `cancelled` (user intent)
     - `failed` (system/backend error)
   - `cancelled` is never recorded as `failed`.

4. **Queue advancement is guaranteed.**
   - The Runner MUST transition each started execution to a terminal state or deterministically mark it failed after a bounded recovery policy.
   - No execution may block subsequent queue items indefinitely.

5. **History Store is the source of truth.**
   - The Runner MUST record all meaningful transitions and errors via History Store.
   - On restart, the Runner reconstructs its view from history and resumes reconciliation.

## State Mapping Rules

### ComfyUI → ComfyStudio mapping table

| ComfyUI observation | ComfyStudio state | Notes |
|---|---|---|
| Prompt accepted, job id received | `executing` | Record `comfyuiPromptId`, `startedAt` |
| Status says queued/running | `executing` | Record progress if available |
| Status says completed | `completed` | Terminal. Record `completedAt`. Store artifacts if applicable |
| Status says failed | `failed` | Terminal. Record error code `COMFYUI_STATUS_FAILED` |
| Status says missing/not found | `failed` | Terminal after recovery policy (see below); error code `COMFYUI_JOB_MISSING` |
| Cancel requested and backend confirms | `cancelled` | Terminal, not failure |
| Cancel requested but backend job already terminal | Keep existing terminal | Do not override terminal |

### Progress semantics

- Progress is **best-effort** and **optional**.
- Missing progress MUST NOT be interpreted as failure.
- Progress MUST be **monotonic non-decreasing** within a single execution when recorded, unless ComfyUI reports a lower value; in that case:
  - Runner records no decrease (clamps to last seen), OR
  - records the backend value but never uses it for state decisions
  Default: **clamp** to preserve monotonic UX and replay determinism.

## Failure Modes & Handling

### 1) Submit failures (no job id)
**Examples**
- network error on submit
- ComfyUI rejects payload (HTTP 4xx/5xx)
- timeout on submit

**Semantics**
- Execution transitions: `queued → failed`
- Record:
  - `recordError(code: COMFYUI_SUBMIT_FAILED, message, details)`
  - `recordExecution(state: failed, completedAt)`

**Rationale**
Without a job id, there is no meaningful backend reconciliation. Determinism and queue unblocking take priority.

---

### 2) Polling/status transient failures
**Examples**
- intermittent network issues
- temporary ComfyUI unavailability

**Semantics**
- Execution remains `executing` during transient errors.
- Runner retries status checks using a bounded retry policy.

**Bounded retry policy**
- Use exponential backoff with upper cap (implementation-defined).
- If `maxRuntimeMs` is configured and exceeded, transition to `failed` with:
  - error code `COMFYUI_STATUS_FAILED` (or a dedicated timeout code if added later)

**Rationale**
ComfyUI may flap; we do not want false failures, but must avoid infinite waits.

---

### 3) Job missing / backend restart
**Examples**
- `getStatus(jobId)` returns "not found"
- ComfyUI restarts and loses in-memory job registry

**Semantics**
- Treat as recoverable *only* within a bounded reconciliation window.
- If job remains missing across the reconciliation window, execution transitions to `failed`.

**Recovery policy (deterministic)**
- `missing` MUST be confirmed by **N consecutive** missing observations
  - Default: `N = 2` (prevents flukes)
- Confirmation observations must be at least one poll interval apart.

**Recording**
- On final decision:
  - `recordError(code: COMFYUI_JOB_MISSING, message, details: { jobId, missingCount })`
  - `recordExecution(state: failed, completedAt)`

**Rationale**
Job loss means output cannot be produced and cannot be trusted; deterministic failure avoids silent hangs.

---

### 4) Cancellation semantics
**Examples**
- user clicks cancel while job running
- cancel request arrives after job completed

**Semantics**
- Cancellation is an explicit terminal outcome: `cancelled`.
- Cancellation MUST NOT be recorded as `failed`.
- Cancellation MUST NOT override an existing terminal state.

**Cancellation race rule**
- First terminal state wins:
  - If execution is already `completed` or `failed`, cancelling is a no-op (may still call backend cancel best-effort, but must not change history).
  - If cancel is recorded first, later "completed" status is ignored by ComfyStudio.

**Recording**
- On cancel request accepted:
  - `recordExecution(state: cancelled, completedAt, note)`
- If cancel API fails but job later completes:
  - treat completion as authoritative terminal (completed)
- If cancel API fails and job cannot be found:
  - apply job missing semantics (failed)

**Rationale**
User intent must be respected, but terminal immutability prevents inconsistent outcomes.

---

### 5) Artifact extraction/storage failures
**Examples**
- ComfyUI returns outputs but artifact storage fails
- disk full / permission error

**Semantics**
- Execution state is still `completed` **if** backend completed successfully.
- Artifact storage failure is recorded as an error record but does not retroactively fail execution.

**Recording**
- `recordExecution(state: completed, completedAt)`
- `recordError(code: UNKNOWN or dedicated ARTIFACT_STORE_FAILED, message, details)`

**Rationale**
Execution success is logically separate from local persistence. This preserves correct "job ran" truth while surfacing storage issues.

## Determinism Requirements

The Runner MUST remain deterministic under failures:

- Status polling decisions depend only on:
  - observed backend responses
  - configured retry/missing policies
  - monotonic terminal rules
- Timeouts must be configured explicitly (e.g., `maxRuntimeMs`) so replay and tests can simulate them deterministically.
- Any derived values written to history (e.g., progress) must be stable and reproducible given the same observation stream.

## Consequences

### Positive
- Clear, predictable behavior under ComfyUI instability
- No deadlocks: every execution becomes terminal deterministically
- Replay remains authoritative; runner restarts are safe
- Cancellation is respected without corrupting terminal truth

### Negative / Trade-offs
- Some "missing job" cases may fail even if the job actually finished but status is unavailable.
- Execution may be marked failed after bounded retries even if backend recovers later.
- Artifact storage failures do not "fail" executions, requiring separate UX to communicate missing artifacts.

## Implementation Notes (Non-normative)

- Prefer explicit status types from the ComfyUI client port:
  - `queued | running | completed | failed | missing`
- Consider storing:
  - lastSeenProgress
  - missingCount
  - lastStatusAt
  in runner memory only (not required for history) as long as terminal truth is written to history.

## Related

- ADR-0007: Workflow Execution Semantics (state machine, monotonic transitions)
- M2: History Store (append-only JSONL, replay algorithm, terminal immutability)
- M3: Adapter + Runner (this ADR governs runner interpretation of backend failures)
