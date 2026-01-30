# Execution System Integration Plan

This document outlines the work needed to integrate the production-ready execution system into the ComfyStudio UI.

## Current State

✅ **Complete** (M0-M4):
- State management (FSM + policies + revisions)
- History Store (JSONL persistence + replay)
- ComfyUI Adapter (pure mapping + deterministic)
- Runner (submit → poll → terminal + cancellation + recovery)
- Service Layer (orchestration + event → command)
- React Hooks (commands + observation + visualization + progress)
- Spatial Capture (coordinate normalization + revision tracking)
- **306 tests passing**

❌ **Not Yet Wired**:
- Service initialization on app startup
- Tool trigger integration
- Canvas spatial capture
- Execution overlay rendering
- Progress indicator UI
- Event handling (notifications)

## Integration Phases

### Phase 1: Service Bootstrap (Foundational)

**Goal**: Initialize execution service on app startup and make available to components.

**Tasks**:
1. ✅ Create workspace directory structure for history
   ```typescript
   // In app initialization
   const workspaceRoot = path.join(os.homedir(), '.comfystudio', 'workspace');
   await fs.mkdir(path.join(workspaceRoot, 'executions'), { recursive: true });
   ```

2. ✅ Wire up real dependencies (ComfyUI client, file system, clock, logger)
   ```typescript
   import { createExecutionService, setExecutionService } from "~/execution";
   import { createWorkflowRunner } from "~/execution/runner";
   import { createHistoryStore } from "~/execution/history";
   import { createComfyUIAdapter } from "~/execution/adapters/comfyui";
   import { createHasher } from "~/execution/adapters/comfyui/hasher";

   // Create real ComfyUI client wrapper
   const comfyUIClient = {
     async submitPrompt(payload) {
       const response = await fetch('http://127.0.0.1:8188/prompt', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(payload),
       });
       const data = await response.json();
       return { jobId: data.prompt_id };
     },
     async getStatus(jobId) {
       const response = await fetch(`http://127.0.0.1:8188/history/${jobId}`);
       const data = await response.json();
       // Map ComfyUI status to our status format
       // ...
     },
     async cancel(jobId) {
       await fetch(`http://127.0.0.1:8188/interrupt`, { method: 'POST' });
       return { cancelled: true };
     },
   };

   // Create history with Node.js filesystem
   const history = createHistoryStore(workspaceRoot, {
     fs: {
       readFile: (path) => fs.promises.readFile(path, 'utf-8'),
       writeFile: (path, content) => fs.promises.writeFile(path, content, 'utf-8'),
       rename: (old, new) => fs.promises.rename(old, new),
       mkdir: (path) => fs.promises.mkdir(path, { recursive: true }),
       exists: async (path) => {
         try {
           await fs.promises.access(path);
           return true;
         } catch {
           return false;
         }
       },
       stat: (path) => fs.promises.stat(path),
       readdir: (path) => fs.promises.readdir(path),
       unlink: (path) => fs.promises.unlink(path),
       rmdir: (path, opts) => fs.promises.rmdir(path, opts),
       appendFile: (path, content) => fs.promises.appendFile(path, content),
     },
     clock: {
       now: () => new Date().toISOString(),
       nowDate: () => new Date(),
       nowMs: () => Date.now(),
     },
     id: {
       uuid: () => crypto.randomUUID(),
     },
   });

   // Create runner
   const runner = createWorkflowRunner({
     adapter: createComfyUIAdapter(),
     comfyui: comfyUIClient,
     history,
     clock: {
       now: () => new Date(),
       nowMs: () => Date.now(),
     },
     log: {
       debug: (...args) => console.debug('[runner]', ...args),
       info: (...args) => console.info('[runner]', ...args),
       warn: (...args) => console.warn('[runner]', ...args),
       error: (...args) => console.error('[runner]', ...args),
     },
   });
   ```

3. ✅ Load workflow templates
   ```typescript
   // Create template registry from existing workflow definitions
   const templates = new Map();
   templates.set('txt2img', {
     id: 'txt2img',
     version: '1.0',
     data: { /* ComfyUI workflow JSON */ },
   });
   templates.set('img2img', { /* ... */ });
   templates.set('inpaint', { /* ... */ });
   ```

4. ✅ Create and initialize service
   ```typescript
   const service = createExecutionService(runner, history, {
     workspaceRoot,
     runnerOptions: {
       pollIntervalMs: 1000,
       maxRuntimeMs: 300000, // 5 minute timeout
       emitProgressHeartbeat: true,
       missingJobConfirmations: 2,
     },
     adapterContext: {
       templates,
       hasher: createHasher(),
       clientId: 'comfystudio-client',
     },
   });

   // Make available globally
   setExecutionService(service);

   // Rehydrate state from history
   await service.rehydrate();
   ```

5. ✅ Add rehydration hook to root component
   ```typescript
   import { useRehydrateOnMount } from "~/execution/ui";

   function App() {
     useRehydrateOnMount(); // Call once on mount
     // ...
   }
   ```

**Acceptance Criteria**:
- ✅ Service initializes without errors
- ✅ History directory created
- ✅ Rehydration completes (even if history empty)
- ✅ Hooks return non-null state

**Estimated Effort**: 4-6 hours

---

### Phase 2: Tool Integration (Core Flow)

**Goal**: Wire tool triggers to start executions.

**Tasks**:
1. ✅ Update tool definitions to include workflow mapping
   ```typescript
   // In Tools/definitions/generate.ts
   const generateTool: WorkflowTool = {
     // ... existing fields
     workflow: "txt2img", // Maps to workflow template
     inputMapping: {
       "prompt": "positive",
       "negativePrompt": "negative",
       "steps": "steps",
       "sampler": "sampler_name",
     },
   };
   ```

2. ✅ Create execution trigger hook
   ```typescript
   // In Tools/hooks.ts
   import { useExecutionCommands } from "~/execution/ui";
   import { ToolState } from "~/Tools/State";

   export function useTriggerExecution(toolId: string) {
     const { startExecution } = useExecutionCommands();

     return useCallback(async () => {
       // Get tool definition
       const tool = getToolDefinition(toolId);
       if (tool.category !== "workflow") {
         throw new Error("Not a workflow tool");
       }

       // Get current settings
       const settings = {};
       for (const setting of tool.settings) {
         const [value] = ToolState.useToolSetting(toolId, setting.id);
         settings[setting.id] = value;
       }

       // Start execution
       const result = await startExecution({
         id: crypto.randomUUID(),
         toolId,
         state: "idle",
         settings,
         workflow: tool.workflow,
       });

       return result;
     }, [toolId, startExecution]);
   }
   ```

3. ✅ Add trigger button to tool panels
   ```typescript
   // In Tools/SettingsPanel.tsx or similar
   import { useTriggerExecution } from "~/Tools/hooks";

   function ToolPanel({ toolId }: { toolId: string }) {
     const trigger = useTriggerExecution(toolId);
     const [isExecuting, setIsExecuting] = useState(false);

     const handleTrigger = async () => {
       setIsExecuting(true);
       const result = await trigger();
       if (result.ok) {
         toast.success(`Started execution: ${result.executionId}`);
       } else {
         toast.error(`Failed to start: ${result.error}`);
       }
       setIsExecuting(false);
     };

     return (
       <div>
         {/* Settings UI */}
         <button onClick={handleTrigger} disabled={isExecuting}>
           {isExecuting ? "Starting..." : "Generate"}
         </button>
       </div>
     );
   }
   ```

4. ✅ Handle keyboard shortcuts for workflow tools
   ```typescript
   // In Shortcut system or tool activation
   const handleShortcut = async (toolId: string) => {
     const tool = getToolDefinition(toolId);

     if (tool.category === "workflow") {
       // Trigger execution immediately
       await triggerExecution(toolId);
     } else {
       // Just activate tool (existing behavior)
       setActiveTool(toolId);
     }
   };
   ```

**Acceptance Criteria**:
- ✅ Clicking "Generate" button starts execution
- ✅ Keyboard shortcut triggers execution
- ✅ Settings are captured and sent to runner
- ✅ Toast notification on start/error
- ✅ Button shows loading state while starting

**Estimated Effort**: 6-8 hours

---

### Phase 3: Spatial Input Capture (Canvas Integration)

**Goal**: Capture canvas interactions as spatial inputs for executions.

**Tasks**:
1. ✅ Get canvas transform state
   ```typescript
   // In Editor/Canvas/index.tsx or similar
   function useCanvasTransform(): CanvasTransform {
     const stage = Canvas.useStage();

     return useMemo(() => ({
       position: stage.position(),
       scale: stage.scaleX(), // Assume uniform scaling
       dimensions: {
         width: stage.width(),
         height: stage.height(),
       },
     }), [stage]);
   }
   ```

2. ✅ Create spatial capture hook
   ```typescript
   // In execution/ui/spatial-capture-hooks.ts
   import { useState } from "react";
   import { capturePoint, captureSelection } from "~/execution/spatial";
   import type { SpatialInputSnapshot } from "~/execution";

   export function useSpatialCapture(toolId: string) {
     const transform = useCanvasTransform();
     const [snapshot, setSnapshot] = useState<SpatialInputSnapshot | null>(null);
     const [revision, setRevision] = useState(0);

     const capturePointInput = useCallback((screenX: number, screenY: number) => {
       const result = capturePoint({ x: screenX, y: screenY }, {
         toolId,
         reason: "explicit", // or "interaction" for brush-like tools
         currentRevision: revision,
         transform,
       });

       if (result.ok) {
         setSnapshot(result.snapshot);
         setRevision(result.newRevision);
       }

       return result;
     }, [toolId, revision, transform]);

     const captureSelectionInput = useCallback((bounds: CanvasBounds) => {
       const result = captureSelection(bounds, {
         toolId,
         reason: "explicit",
         currentRevision: revision,
         transform,
       });

       if (result.ok) {
         setSnapshot(result.snapshot);
         setRevision(result.newRevision);
       }

       return result;
     }, [toolId, revision, transform]);

     return {
       snapshot,
       capturePoint: capturePointInput,
       captureSelection: captureSelectionInput,
       clearSnapshot: () => setSnapshot(null),
     };
   }
   ```

3. ✅ Wire canvas event handlers for tools requiring spatial input
   ```typescript
   // In Editor/Canvas/index.tsx
   function Canvas() {
     const activeTool = useActiveTool();
     const { capturePoint, captureSelection } = useSpatialCapture(activeTool);

     const handleClick = (e: KonvaEvent) => {
       const tool = getToolDefinition(activeTool);

       if (tool.requiresSpatialInput && tool.spatialInputType === "point") {
         const pos = e.target.getStage().getPointerPosition();
         capturePoint(pos.x, pos.y);
         // Tool transitions to "armed" state
       }
     };

     const handleSelectionComplete = (bounds: CanvasBounds) => {
       const tool = getToolDefinition(activeTool);

       if (tool.requiresSpatialInput && tool.spatialInputType === "selection") {
         captureSelection(bounds);
         // Tool transitions to "armed" state
       }
     };

     // ...
   }
   ```

4. ✅ Include spatial input in execution
   ```typescript
   // Update useTriggerExecution to include spatial input
   export function useTriggerExecution(toolId: string) {
     const { startExecution } = useExecutionCommands();
     const { snapshot } = useSpatialCapture(toolId);

     return useCallback(async () => {
       const tool = getToolDefinition(toolId);
       const settings = getToolSettings(toolId);

       const result = await startExecution({
         id: crypto.randomUUID(),
         toolId,
         state: snapshot ? "armed" : "idle",
         settings,
         workflow: tool.workflow,
         spatialInput: snapshot || undefined,
       });

       return result;
     }, [toolId, startExecution, snapshot]);
   }
   ```

**Acceptance Criteria**:
- ✅ Clicking canvas captures point spatial input
- ✅ Drawing selection captures bounds
- ✅ Coordinates are normalized (0-1 range)
- ✅ Spatial input included in execution
- ✅ Revision increments appropriately

**Estimated Effort**: 8-10 hours

---

### Phase 4: Execution Visualization (Canvas Overlays)

**Goal**: Render execution state as canvas overlays.

**Tasks**:
1. ✅ Create overlay component
   ```typescript
   // In execution/ui/components/ExecutionOverlay.tsx
   import { Rect, Text } from "react-konva";
   import type { ExecutionOverlay } from "~/execution/ui";

   export function ExecutionOverlay({ overlay }: { overlay: ExecutionOverlay }) {
     const stage = useStage();
     const { bounds, state, progress } = overlay;

     if (!bounds) return null;

     // Denormalize bounds to screen space
     const screenBounds = denormalizeBounds(bounds, getCanvasTransform(stage));

     return (
       <>
         <Rect
           x={screenBounds.x}
           y={screenBounds.y}
           width={screenBounds.width}
           height={screenBounds.height}
           stroke={getStateColor(state)}
           strokeWidth={2}
           dash={state === "queued" ? [10, 5] : undefined}
         />
         {progress !== undefined && (
           <Text
             x={screenBounds.x + 5}
             y={screenBounds.y + 5}
             text={`${Math.round(progress)}%`}
             fill={getStateColor(state)}
             fontSize={14}
           />
         )}
       </>
     );
   }
   ```

2. ✅ Add overlay layer to canvas
   ```typescript
   // In Editor/Canvas/index.tsx
   import { useExecutionOverlays } from "~/execution/ui";
   import { ExecutionOverlay } from "~/execution/ui/components/ExecutionOverlay";

   function Canvas() {
     const overlays = useExecutionOverlays();

     return (
       <Stage>
         {/* Existing layers */}

         <Layer name="execution-overlays">
           {overlays.map((overlay) => (
             <ExecutionOverlay
               key={overlay.executionId}
               overlay={overlay}
             />
           ))}
         </Layer>
       </Stage>
     );
   }
   ```

3. ✅ Add active execution indicator
   ```typescript
   // In UI header or toolbar
   function ActiveExecutionsIndicator() {
     const count = useActiveExecutionCount();
     const hasActive = useHasActiveExecutions();

     if (!hasActive) return null;

     return (
       <div className="flex items-center gap-2 text-blue-500">
         <LoadingSpinner />
         <span>{count} {count === 1 ? 'job' : 'jobs'} running</span>
       </div>
     );
   }
   ```

**Acceptance Criteria**:
- ✅ Overlays rendered on canvas at correct positions
- ✅ Colors match execution state
- ✅ Progress percentage shown if available
- ✅ Overlays update in real-time
- ✅ Old overlays auto-hide after completion

**Estimated Effort**: 6-8 hours

---

### Phase 5: Progress UI (Indicators)

**Goal**: Display execution progress in UI.

**Tasks**:
1. ✅ Create progress bar component
   ```typescript
   // In execution/ui/components/ProgressBar.tsx
   import { formatProgress, getProgressColor } from "~/execution/ui";

   export function ProgressBar({ progress, state }) {
     const colorClass = getProgressColor(state);

     return (
       <div className="w-full h-2 bg-gray-200 rounded">
         <div
           className={`h-full ${colorClass} rounded transition-all`}
           style={{ width: `${progress || 0}%` }}
         />
       </div>
     );
   }
   ```

2. ✅ Create execution list component
   ```typescript
   // In execution/ui/components/ExecutionList.tsx
   import { useActiveProgress } from "~/execution/ui";

   export function ExecutionList() {
     const progress = useActiveProgress();

     if (progress.length === 0) return null;

     return (
       <div className="space-y-2">
         <h3 className="font-semibold">Active Executions</h3>
         {progress.map((p) => (
           <div key={p.executionId} className="p-2 border rounded">
             <div className="flex justify-between mb-1">
               <span>{p.toolId}</span>
               <span>{formatProgress(p.progress)}</span>
             </div>
             <ProgressBar progress={p.progress} state={p.state} />
             <div className="text-xs text-gray-500 mt-1">
               {formatPhase(p.phase)} • {formatElapsedTime(p.elapsedMs)}
             </div>
           </div>
         ))}
       </div>
     );
   }
   ```

3. ✅ Add to sidebar or panel
   ```typescript
   // In sidebar
   function Sidebar() {
     return (
       <div>
         {/* Other sidebar content */}
         <ExecutionList />
       </div>
     );
   }
   ```

**Acceptance Criteria**:
- ✅ Progress bars show accurate progress
- ✅ List updates in real-time
- ✅ Elapsed time updates
- ✅ State colors match
- ✅ Empty state when no executions

**Estimated Effort**: 4-6 hours

---

### Phase 6: Event Handling (Notifications)

**Goal**: Handle execution events with user feedback.

**Tasks**:
1. ✅ Create event handler hook
   ```typescript
   // In execution/ui/event-handler.tsx
   import { useExecutionEvents } from "~/execution/ui";
   import { toast } from "sonner"; // or your toast library

   export function useExecutionEventHandler() {
     useExecutionEvents((event) => {
       switch (event.type) {
         case "execution_started":
           toast.info(`Execution started: ${event.executionId}`);
           break;

         case "execution_completed":
           toast.success(`Execution completed: ${event.executionId}`);
           break;

         case "execution_failed":
           toast.error(`Execution failed: ${event.error}`);
           break;

         case "execution_cancelled":
           toast.warning(`Execution cancelled: ${event.executionId}`);
           break;

         case "execution_progress":
           // Optionally show progress updates (can be noisy)
           break;

         case "service_error":
           toast.error(`Service error: ${event.error}`);
           break;
       }
     });
   }
   ```

2. ✅ Add to root component
   ```typescript
   function App() {
     useRehydrateOnMount();
     useExecutionEventHandler(); // Listen for events
     // ...
   }
   ```

3. ✅ Add cancel button to active executions
   ```typescript
   function ExecutionListItem({ execution }) {
     const { cancelExecution } = useExecutionCommands();

     const handleCancel = async () => {
       const result = await cancelExecution(execution.toolId, execution.executionId);
       if (result.ok) {
         toast.info("Cancellation requested");
       }
     };

     return (
       <div>
         {/* Progress UI */}
         <button onClick={handleCancel}>Cancel</button>
       </div>
     );
   }
   ```

**Acceptance Criteria**:
- ✅ Toast notifications for all events
- ✅ Cancel button works
- ✅ Events don't spam user (reasonable frequency)
- ✅ Error messages are clear

**Estimated Effort**: 3-4 hours

---

## Testing Strategy

### Unit Tests
- ✅ Already complete (306 tests)
- No additional unit tests needed

### Integration Tests
- [ ] Test service initialization with real filesystem
- [ ] Test ComfyUI client wrapper
- [ ] Test tool trigger → execution flow
- [ ] Test spatial capture → execution flow

### End-to-End Tests
- [ ] Full workflow: capture → trigger → execute → complete
- [ ] Test cancellation during execution
- [ ] Test app restart and rehydration
- [ ] Test multiple concurrent executions

### Manual Testing Checklist
- [ ] Start execution from tool button
- [ ] Start execution from keyboard shortcut
- [ ] Capture point spatial input
- [ ] Capture selection spatial input
- [ ] View execution overlays on canvas
- [ ] View progress in sidebar
- [ ] Cancel running execution
- [ ] Restart app and verify state restored
- [ ] Multiple tools executing simultaneously

---

## Risk Assessment

### Low Risk
- Service initialization (straightforward, well-tested)
- Event handling (simple hook usage)

### Medium Risk
- ComfyUI client wrapper (external API, need proper error handling)
- Canvas spatial capture (coordinate transforms, event handling)
- Overlay rendering (performance if many executions)

### High Risk
- Tool integration (touches existing tool system, need careful compatibility)
- Keyboard shortcuts (existing shortcut system, avoid conflicts)

---

## Rollout Strategy

### Phase 1: Internal Testing
1. Complete Phase 1 (Bootstrap) and Phase 2 (Tool Integration)
2. Test with single workflow tool (txt2img)
3. Verify basic flow works end-to-end

### Phase 2: Feature Flag
1. Add feature flag for execution system
2. Enable for specific tools first (generate, inpaint)
3. Monitor for issues

### Phase 3: Gradual Expansion
1. Enable for all workflow tools
2. Add spatial capture for tools that need it
3. Polish UI based on feedback

### Phase 4: Full Release
1. Remove feature flag
2. Update documentation
3. Announce in changelog

---

## Success Metrics

- ✅ All 306 tests continue to pass
- ✅ No regressions in existing tool functionality
- ✅ Executions start successfully >99% of the time
- ✅ App restart preserves execution state
- ✅ Users can cancel executions reliably
- ✅ UI remains responsive during executions
- ✅ Spatial inputs captured accurately

---

## Timeline Estimate

- **Phase 1** (Bootstrap): 4-6 hours
- **Phase 2** (Tool Integration): 6-8 hours
- **Phase 3** (Spatial Capture): 8-10 hours
- **Phase 4** (Visualization): 6-8 hours
- **Phase 5** (Progress UI): 4-6 hours
- **Phase 6** (Event Handling): 3-4 hours
- **Testing & Polish**: 8-10 hours

**Total**: 39-52 hours (roughly 1-1.5 weeks for single developer)

---

## Next Steps

1. Review this plan with team
2. Prioritize phases (can do Phase 1-2 first for MVP)
3. Create GitHub issues for each phase
4. Assign phases to developers
5. Set up feature flag infrastructure
6. Begin Phase 1 implementation

## Questions to Resolve

1. **Toast Library**: Which notification library to use? (sonner, react-toastify, etc.)
2. **Workspace Location**: Where should execution history be stored? User home dir? Project dir?
3. **Feature Flag**: How to implement feature flags in ComfyStudio?
4. **Shortcut Conflicts**: Review existing shortcuts to avoid conflicts
5. **Error Handling**: What level of detail for error messages to users?
6. **Performance**: Any concerns about rendering many execution overlays?

---

For questions or clarifications, refer to:
- `src/execution/README.md` - Comprehensive system documentation
- `src/execution/types/index.ts` - Type definitions and contracts
- Test files - Usage examples and edge cases
