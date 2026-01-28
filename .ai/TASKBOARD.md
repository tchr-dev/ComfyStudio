# Task Board

**Last Updated:** 2026-01-28
**Source:** `docs/plans/2026-01-28-declarative-tool-system-implementation.md`

---

## Legend

- **TODO** - Not started
- **DOING** - Currently in progress
- **DONE** - Completed and committed
- **BLOCKED** - Cannot proceed due to dependency/blocker

**Task Format:** `[ID] Task Name (Owner) - Files | Acceptance Criteria`

---

## TODO

### Infrastructure

- **[T1]** Core Type Definitions (unassigned)
  - Files: `Tools/Types.ts`, `Tools/Types.test.ts`
  - Criteria: All types export, discriminated union works, tests pass

- **[T2]** Tool State Management (unassigned)
  - Files: `Tools/State.ts`, `Tools/State.test.ts`
  - Criteria: Settings store/retrieve per tool, defaults initialize, tests pass

- **[T3]** Tool Registry Loading (unassigned)
  - Files: `Tools/Registry.ts`, `Tools/Registry.test.ts`, create `definitions/` and `implementations/` dirs
  - Criteria: Glob import works, get by ID works, empty directories created

### Tool Definitions

- **[T4]** Brush Tool Definition (unassigned)
  - Files: `Tools/definitions/brush.ts`
  - Criteria: Definition exports, has 3 settings (size/strength/blur), Registry.get("brush") works

- **[T5]** Select Tool Definition (unassigned)
  - Files: `Tools/definitions/select.ts`
  - Criteria: Selection tool with multiSelect=true, Registry finds it

- **[T6]** Generate Tool Definition (unassigned)
  - Files: `Tools/definitions/generate.ts`
  - Criteria: Workflow tool with txt2img, has prompt/sampler/steps settings

- **[T7]** Remove Background Tool Definition (unassigned)
  - Files: `Tools/definitions/remove-background.ts`
  - Criteria: Workflow tool with remove-background workflow, inputMapping configured

- **[T8]** Replace Background Tool Definition (unassigned)
  - Files: `Tools/definitions/replace-background.ts`
  - Criteria: Workflow tool with backgroundPrompt and blendStrength settings

### UI Integration

- **[T9]** Setting Renderer Components (unassigned)
  - Files: `Tools/SettingRenderer.tsx`, `Tools/SettingRenderer.test.tsx`
  - Criteria: Renders slider/text/dropdown/checkbox, auto-initializes defaults

- **[T10]** Update EditorToolPanel (unassigned)
  - Files: `Dock/Panels/EditorToolPanel.tsx`, `Dock/Panels/EditorToolPanel.test.tsx`
  - Criteria: Loads tool from Registry, renders settings automatically

- **[T11]** Update ToolsPanel (unassigned)
  - Files: `Dock/Panels/ToolsPanel.tsx`, `Dock/Panels/ToolsPanel.test.tsx`
  - Criteria: Displays all tools with icons, click activates tool, shows shortcuts

### Tool Implementations

- **[T12]** Brush Implementation Wrapper (unassigned)
  - Files: `Tools/implementations/brush.ts`
  - Criteria: Wrapper delegates to Editor.Brush, loads without error

- **[T13]** Select Implementation Wrapper (unassigned)
  - Files: `Tools/implementations/select.ts`
  - Criteria: Wrapper delegates to Editor.Selection, loads without error

- **[T14]** Generate Implementation Stub (unassigned)
  - Files: `Tools/implementations/generate.ts`
  - Criteria: Stub with executeWorkflow, TODO for plugin integration

- **[T15]** Background Tools Implementation Stubs (unassigned)
  - Files: `Tools/implementations/remove-background.ts`, `Tools/implementations/replace-background.ts`
  - Criteria: Both stubs validate selection, throw "not implemented" errors

### Testing & Documentation

- **[T16]** Integration Testing (unassigned)
  - Files: `Tools/integration.test.tsx`
  - Criteria: All tools load, definitions valid, implementations exist

- **[T17]** Update CLAUDE.md Documentation (unassigned)
  - Files: `CLAUDE.md`
  - Criteria: Tool system section added with conventions and examples

- **[T18]** Manual Testing & Verification (unassigned)
  - Files: None (manual testing), `docs/plans/2026-01-28-tool-system-verification.md`
  - Criteria: All 5 tools visible, settings render, interactions work, notes documented

---

## DOING

_No tasks currently in progress_

---

## DONE

### Planning Phase

- **[P1]** Brainstorming Session (Claude Sonnet 4.5) ✅
  - Used superpowers:brainstorming skill
  - Defined architecture through Q&A
  - Commit: e959e38

- **[P2]** Design Document (Claude Sonnet 4.5) ✅
  - File: `docs/plans/2026-01-28-declarative-tool-system-design.md`
  - Commit: e959e38

- **[P3]** Implementation Plan (Claude Sonnet 4.5) ✅
  - File: `docs/plans/2026-01-28-declarative-tool-system-implementation.md`
  - 18 tasks with TDD approach
  - Commit: 0a68b97

- **[P4]** Multi-Agent Handover Docs (Claude Sonnet 4.5) ✅
  - Files: `AI_README.md`, `.ai/STATUS.md`, `.ai/TASKBOARD.md`, `.ai/HANDOFF.md`
  - Status: Created, pending commit

---

## BLOCKED

_No blocked tasks_

---

## Task Dependencies

Tasks should be executed in order due to dependencies:

**Phase 1: Foundation (T1-T3)**
- T1 → T2 (State needs Types)
- T2 → T3 (Registry needs State for initialization)

**Phase 2: Definitions (T4-T8)**
- All require T1 (Types)
- Can be done in parallel once T1-T3 complete

**Phase 3: UI (T9-T11)**
- T9 requires T1, T2 (Types, State)
- T10 requires T3, T9 (Registry, SettingRenderer)
- T11 requires T3 (Registry)

**Phase 4: Implementations (T12-T15)**
- All require T1, T3 (Types, Registry)
- Can be done in parallel

**Phase 5: Validation (T16-T18)**
- T16 requires all previous tasks
- T17 can be done anytime after T1-T3
- T18 is final manual verification

---

## Estimation

- **Each task:** 5-15 minutes (TDD: test → implement → verify → commit)
- **Total:** ~2-3 hours for all 18 tasks
- **Can parallelize:** Definitions (T4-T8) and Implementations (T12-T15)

---

## Notes

- Tasks follow implementation plan exactly
- Each task has clear acceptance criteria
- TDD approach: write failing test first
- Commit after each completed task
- Update STATUS.md if switching contexts
