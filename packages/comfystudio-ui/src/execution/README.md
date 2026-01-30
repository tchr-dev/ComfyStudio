# Workflow Execution System

Production-grade workflow execution system for ComfyStudio. Implements a files-as-truth architecture with crash-resistant history, spatial input capture, and deterministic state management.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         UI Layer                            │
│  (React Hooks - Observation Only, No State Mutations)      │
│                                                             │
│  • useExecutionCommands()  → Dispatch intent               │
│  • useExecutionState()     → Read-only snapshots           │
│  • useExecutionOverlays()  → Visual state                  │
│  • useExecutionProgress()  → Progress indicators           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                          │
│       (Orchestration - Event → Command Pattern)            │
│                                                             │
│  • startExecution()  → Fire runner in background           │
│  • cancelExecution() → Request cancellation                │
│  • getSnapshot()     → Current state view                  │
│  • subscribe()       → Event notifications                 │
│  • rehydrate()       → Restore from history                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Runner Layer                           │
│         (Lifecycle Manager - Submit → Poll → Terminal)     │
│                                                             │
│  1. Build prompt via adapter (pure mapping)                │
│  2. Submit to ComfyUI (get jobId)                          │
│  3. Poll status until terminal                             │
│  4. Record all state transitions to history                │
│  5. Handle cancellation and recovery                       │
└─────────────────────────────────────────────────────────────┘
         ↓                                    ↓
┌─────────────────────┐          ┌──────────────────────────┐
│   ComfyUI Adapter   │          │     History Store        │
│   (Pure Mapping)    │          │  (Files-as-Truth)        │
│                     │          │                          │
│  • Deterministic    │          │  • JSONL persistence     │
│  • No I/O           │          │  • Atomic writes         │
│  • Stable hash      │          │  • Crash-resistant       │
│  • FNV-1a           │          │  • Replay with filters   │
└─────────────────────┘          └──────────────────────────┘
         ↓                                    ↑
┌─────────────────────┐                      │
│      ComfyUI        │                      │
│   (External API)    │                      │
│                     │                      │
│  • Submit prompt    │──────────────────────┘
│  • Poll status      │    All state recorded
│  • Cancel job       │    to history immediately
└─────────────────────┘
```

## Key Design Principles

### 1. Files-as-Truth
History Store is the **single source of truth**. Everything else is derived or ephemeral:
- Execution state persisted in `executions/{toolId}.jsonl`
- UI can restart and fully rehydrate from history
- No critical state exists only in memory
- Crash-resistant via atomic writes with temp files

### 2. Observation Boundary
UI **never mutates** state directly:
- UI dispatches commands (intent: "start this execution")
- Runner owns transitions (truth: state changes)
- UI observes outcome (via snapshots and events)
- Service layer enforces this boundary

### 3. Deterministic State Machine
7-state FSM with unidirectional flow:
```
idle → armed → queued → executing → (completed | failed | cancelled)
                 ↑                      ↓
                 └──────────────────────┘
                    (restart allowed)
```

### 4. Pure Functions
Core logic has no side effects:
- Adapter: Pure mapping (execution → ComfyUI prompt)
- State transitions: Pure FSM (no I/O)
- Spatial capture: Pure coordinate transforms

### 5. Type Safety
Discriminated unions prevent invalid states:
```typescript
type WorkflowExecution = {
  state: "idle" | "armed" | "queued" | "executing" | "completed" | "failed" | "cancelled";
  // ... other fields
}

type SpatialInput =
  | { type: "point"; data: { x: number; y: number } }
  | { type: "selection"; data: { x, y, width, height } }
  | { type: "mask"; data: { maskId, bounds } }
  | { type: "image"; data: { entityId } }
```

## Module Structure

```
src/execution/
├── types/              # Contract types (frozen)
├── state/              # Pure FSM + policies + revisions
├── history/            # JSONL writer, replay, prune
├── adapters/comfyui/   # Pure ComfyUI adapter
├── runner/             # Runner lifecycle manager
├── spatial/            # Spatial input capture
├── service.ts          # Service orchestration layer
└── ui/                 # React hooks + visualization
    ├── hooks.ts                # Core hooks (commands + state)
    ├── visualization.ts        # Visual state derivation
    ├── visualization-hooks.ts  # Visualization hooks
    ├── progress.ts             # Progress state derivation
    └── progress-hooks.ts       # Progress hooks
```

## Usage Guide

### 1. Initialize Service (App Startup)

```typescript
import { createExecutionService, setExecutionService } from "~/execution";
import { createWorkflowRunner } from "~/execution/runner";
import { createHistoryStore } from "~/execution/history";
import { createComfyUIAdapter } from "~/execution/adapters/comfyui";

// Create dependencies
const history = createHistoryStore("/workspace/executions", {
  fs: nodeFileSystem,
  clock: systemClock,
  id: { uuid: () => crypto.randomUUID() },
});

const runner = createWorkflowRunner({
  adapter: createComfyUIAdapter(),
  comfyui: comfyUIClient,
  history,
  clock: systemClock,
  log: consoleLogger,
});

// Create service
const service = createExecutionService(runner, history, {
  workspaceRoot: "/workspace",
  runnerOptions: { pollIntervalMs: 1000 },
  adapterContext: {
    templates: workflowTemplates,
    hasher: createHasher(),
    clientId: "comfystudio-client",
  },
});

// Make available to UI hooks
setExecutionService(service);

// Rehydrate state from history
await service.rehydrate();
```

### 2. Use in React Components

```typescript
import {
  useExecutionCommands,
  useExecutionState,
  useExecutionOverlays,
  useExecutionProgress,
} from "~/execution/ui";

function MyComponent() {
  // Dispatch commands
  const { startExecution, cancelExecution } = useExecutionCommands();

  // Observe state (read-only)
  const state = useExecutionState();
  const overlays = useExecutionOverlays();
  const progress = useExecutionProgress("generate", "exec-123");

  // Start execution
  const handleStart = async () => {
    const result = await startExecution({
      id: "exec-123",
      toolId: "generate",
      state: "idle",
      settings: { prompt: "A beautiful landscape" },
      workflow: "txt2img",
    });

    if (result.ok) {
      console.log("Started:", result.executionId, result.jobId);
    }
  };

  // Render overlays
  return (
    <div>
      {overlays.map((overlay) => (
        <ExecutionOverlay
          key={overlay.executionId}
          overlay={overlay}
        />
      ))}
    </div>
  );
}
```

### 3. Capture Spatial Input

```typescript
import { capturePoint, captureSelection } from "~/execution/spatial";

// Capture point (click)
const result = capturePoint(
  { x: 500, y: 400 }, // Screen coordinates
  {
    toolId: "inpaint",
    reason: "explicit",
    currentRevision: 0,
    transform: {
      position: { x: 0, y: 0 },
      scale: 1,
      dimensions: { width: 1920, height: 1080 },
    },
  }
);

if (result.ok) {
  // result.snapshot contains normalized spatial input (0-1 range)
  const spatial = result.snapshot;
  console.log("Captured:", spatial.data); // { type: "point", data: { x: 0.26, y: 0.37 } }
}

// Capture selection (rectangular region)
const selectionResult = captureSelection(
  { x: 100, y: 100, width: 300, height: 200 },
  config
);
```

### 4. Subscribe to Events

```typescript
import { useExecutionEvents } from "~/execution/ui";

function MyComponent() {
  useExecutionEvents((event) => {
    switch (event.type) {
      case "execution_started":
        toast.info(`Started: ${event.executionId}`);
        break;
      case "execution_completed":
        toast.success(`Completed: ${event.executionId}`);
        break;
      case "execution_failed":
        toast.error(`Failed: ${event.error}`);
        break;
    }
  });
}
```

## Testing

The execution system has **306 comprehensive tests**:

```bash
# Run all execution tests
yarn test src/execution --run

# Run specific test suites
yarn test src/execution/state       # State machine tests
yarn test src/execution/history     # History store tests
yarn test src/execution/runner      # Runner lifecycle tests
yarn test src/execution/spatial     # Spatial capture tests
yarn test src/execution/ui          # UI integration tests
```

## State Machine Details

### Execution States

| State | Description | Terminal? | Next States |
|-------|-------------|-----------|-------------|
| `idle` | Tool active, no execution | No | `armed` |
| `armed` | Canvas input captured | No | `queued` |
| `queued` | Submitted to ComfyUI | No | `executing`, `failed`, `cancelled` |
| `executing` | Currently running | No | `completed`, `failed`, `cancelled` |
| `completed` | Finished successfully | Yes | `idle` (after dismiss) |
| `failed` | Execution failed | Yes | `idle` (after dismiss) |
| `cancelled` | User cancelled | Yes | `idle` (after dismiss) |

### Run Policies

Three policies control concurrent execution:

1. **Single**: Only one execution total (queue, executing, or completed)
2. **Replace**: Cancel/remove previous, start new
3. **Parallel** (default): Multiple executions run simultaneously

### Revision Tracking

Spatial inputs have revision counters that increment based on trigger mode:

- **Interaction tools** (brush): Every capture increments
- **Explicit tools** (selection): Only data changes increment

## History Store

### File Format

Executions are stored in JSONL (JSON Lines) format:

```
executions/generate.jsonl:
{"id":"exec-1","toolId":"generate","state":"queued","queuedAt":"2024-01-30T10:00:00Z",...}
{"id":"exec-1","toolId":"generate","state":"executing","startedAt":"2024-01-30T10:00:01Z",...}
{"id":"exec-1","toolId":"generate","state":"completed","completedAt":"2024-01-30T10:00:30Z",...}
```

### Operations

- **Append**: Atomic write with temp file (crash-resistant)
- **Replay**: Reconstruct state from all entries
- **Prune**: Remove old entries, keep recent N executions
- **Revisions**: Filter replay to specific revision

### Crash Recovery

On app restart:
1. Service calls `rehydrate()`
2. History Store replays all tools
3. Service detects orphaned executions (executing but no active job)
4. UI can resume or mark as failed

## ComfyUI Adapter

### Deterministic Mapping

The adapter is a **pure function** that maps execution → ComfyUI prompt:

```typescript
buildPrompt(execution, context): BuildPromptResult
```

- No I/O, no time, no random, no globals
- Stable JSON serialization (sorted keys)
- FNV-1a hashing for fingerprints
- Same input → same output, always

### Error Handling

Adapter returns `Result` types:

```typescript
type BuildPromptResult =
  | { ok: true; value: { payload, fingerprint, bindings } }
  | { ok: false; error: { code, message, details } }
```

Error codes:
- `WORKFLOW_NOT_FOUND`: Invalid workflow ID
- `SETTING_INVALID`: Invalid setting value
- `SPATIAL_INPUT_MISSING`: Required spatial input not provided

## Performance Characteristics

- **History replay**: O(n) where n = total execution entries for tool
- **State transitions**: O(1) in-memory updates
- **Spatial capture**: O(1) coordinate transforms
- **File writes**: Atomic with fsync (safe but not instant)
- **UI updates**: Memoized hooks, efficient re-renders

## Known Limitations

1. **ComfyUI jobId not exposed early**: Service uses `execution.id` as tracking ID until runner completes
2. **No retry logic**: Failed submissions don't auto-retry (by design - explicit user action required)
3. **Polling overhead**: Status polling creates network traffic (ComfyUI doesn't support webhooks)
4. **Memory usage**: Full history loaded on replay (pruning recommended for large histories)

## Future Enhancements

Potential improvements (not currently implemented):

- [ ] WebSocket support for ComfyUI status updates (eliminate polling)
- [ ] Incremental history replay (don't reload entire history on every update)
- [ ] Execution priority queue (handle rush of executions)
- [ ] Batch execution support (submit multiple at once)
- [ ] Execution templates (reuse settings across executions)
- [ ] Advanced progress estimation (use historical data)

## Related Documentation

- **Contract**: See `types/index.ts` for type definitions
- **ADRs**: Referenced in code comments (ADR-0007, ADR-0008, ADR-0009)
- **Tests**: Each module has `__tests__/` directory with comprehensive coverage
- **Implementation**: Each file has detailed JSDoc comments

## Support

For questions or issues:
1. Check test files for usage examples
2. Read JSDoc comments in source files
3. Review type definitions for contracts
4. File issues on GitHub repository
