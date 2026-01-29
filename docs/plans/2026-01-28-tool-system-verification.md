# Declarative Tool System - Manual Verification Checklist

**Date**: 2026-01-28
**Status**: Ready for Testing
**Related Documentation**: `/CLAUDE.md` (Tool System Implementation Guide)

## Purpose

This document provides a comprehensive manual testing checklist to verify the end-to-end functionality of ComfyStudio's new declarative tool system. Use this to validate that all 5 tools (brush, select, generate, remove-background, replace-background) work correctly in the running application.

## Prerequisites

Before starting verification, ensure:

1. **Environment Setup**:
   ```bash
   # Start both ComfyUI backend and ComfyStudio frontend
   yarn start

   # Or start just the frontend for UI testing
   yarn dev
   ```

2. **Access Application**:
   - Open browser to `http://localhost:3000`
   - Application loads without errors
   - No console errors on initial load

3. **Testing Tools**:
   - Browser DevTools open (F12 or Cmd+Option+I)
   - Console tab visible (for workflow execution logs)
   - Network tab available (for debugging if needed)

4. **Automated Tests Passing**:
   ```bash
   yarn comfystudio-ui test
   # Should show: 84 tests passing
   ```

---

## Verification Status

**Fill this section during testing:**

- **Date Tested**: _______________
- **Tester Name**: _______________
- **Environment**:
  - Browser: _______________
  - OS: _______________
  - Node Version: _______________
- **Build Information**:
  - Git Commit: _______________
  - Branch: _______________

### Results Summary

- [ ] All tool discovery tests passed (Section A)
- [ ] All tool activation tests passed (Section B)
- [ ] All settings rendering tests passed (Sections C, D, E)
- [ ] All tool interaction tests passed (Section F)
- [ ] All workflow tool tests passed (Section G)
- [ ] All state isolation tests passed (Section H)

**Overall Status**: ⬜ PASS / ⬜ FAIL / ⬜ PARTIAL

---

## A. Tool Discovery (Registry)

These tests verify that the tool registry correctly discovers and exposes all defined tools.

### Test Location
**ToolsPanel** - Look in the left sidebar (Tools section)

| # | Test Case | Expected Behavior | ✓ | Actual Behavior |
|---|-----------|-------------------|---|-----------------|
| A1 | All 5 tools appear in ToolsPanel | Should see: Brush, Select, Generate, Remove Background, Replace Background | ☐ | |
| A2 | Tools display correct names | Each tool shows its `label` property value | ☐ | |
| A3 | Tools display correct icons | Each tool shows appropriate icon: <br>- Brush: Eraser icon<br>- Select: Cursor icon<br>- Generate: Sparkles icon<br>- Remove BG: Background removal icon<br>- Replace BG: Background swap icon | ☐ | |
| A4 | Tools show keyboard shortcuts | Visible shortcuts: 'e' (brush), 'v' (select), 'g' (generate) | ☐ | |
| A5 | Tools are clickable | Cursor changes to pointer on hover, tools respond to clicks | ☐ | |
| A6 | Tool order matches priority | Tools appear in definition order (priority determines display order) | ☐ | |

**Notes**: _____________________________________

---

## B. Tool Activation

These tests verify that tools can be activated via UI clicks and keyboard shortcuts.

### Test Location
**ToolsPanel** + **Keyboard**

| # | Test Case | Expected Behavior | ✓ | Actual Behavior |
|---|-----------|-------------------|---|-----------------|
| B1 | Click Brush tool activates it | Tool highlights as active, EditorToolPanel shows brush settings | ☐ | |
| B2 | Press 'e' activates Brush | Same as B1, works from any tool | ☐ | |
| B3 | Click Select tool activates it | Tool highlights as active, EditorToolPanel shows no settings | ☐ | |
| B4 | Press 'v' activates Select | Same as B3, works from any tool | ☐ | |
| B5 | Click Generate tool activates it | Tool highlights as active, EditorToolPanel shows generate settings | ☐ | |
| B6 | Press 'g' activates Generate | Same as B5, works from any tool | ☐ | |
| B7 | Click Remove Background tool | Tool highlights as active, EditorToolPanel shows no settings | ☐ | |
| B8 | Click Replace Background tool | Tool highlights as active, EditorToolPanel shows background settings | ☐ | |
| B9 | Active tool has visual indicator | Active tool has distinct background color or border | ☐ | |
| B10 | Only one tool active at a time | Activating tool B deactivates tool A | ☐ | |

**Notes**: _____________________________________

---

## C. Settings Rendering - Brush Tool

These tests verify that the Brush tool's settings render correctly with all expected controls.

### Test Location
**EditorToolPanel** (right sidebar when Brush tool is active)

**Setup**: Activate Brush tool (click or press 'e')

| # | Test Case | Expected Behavior | ✓ | Actual Behavior |
|---|-----------|-------------------|---|-----------------|
| C1 | Panel title displays | Shows "Eraser settings" as title | ☐ | |
| C2 | Size slider renders | Labeled "Size", range 1-100, default 20 | ☐ | |
| C3 | Size slider is interactive | Can drag slider or input value directly | ☐ | |
| C4 | Size value displays | Current size value shown next to slider | ☐ | |
| C5 | Blur slider renders | Labeled "Blur", range 0-100, default value present | ☐ | |
| C6 | Blur slider is interactive | Can drag slider or input value directly | ☐ | |
| C7 | Blur value displays | Current blur value shown next to slider | ☐ | |
| C8 | Strength slider renders | Labeled "Strength", range 0-1, default 0.8 | ☐ | |
| C9 | Strength slider is interactive | Can drag slider or input value directly | ☐ | |
| C10 | Strength value displays | Shows value as decimal (e.g., "0.80") | ☐ | |
| C11 | Brush preview renders | Visual preview shows circular brush with size/blur/strength | ☐ | |
| C12 | Preview updates with size | Changing size updates preview circle diameter | ☐ | |
| C13 | Preview updates with blur | Changing blur updates preview edge softness | ☐ | |
| C14 | Preview updates with strength | Changing strength updates preview opacity | ☐ | |

**Expected Layout**:
```
┌─────────────────────────┐
│  Eraser settings        │
├─────────────────────────┤
│  Size: [====●====] 20   │
│  Blur: [===●=====] 15   │
│  Strength: [=====●==] 0.8│
│                         │
│  [Brush Preview Circle] │
└─────────────────────────┘
```

**Notes**: _____________________________________

---

## D. Settings Rendering - Generate Tool

These tests verify that the Generate tool's settings render correctly with all expected controls.

### Test Location
**EditorToolPanel** (right sidebar when Generate tool is active)

**Setup**: Activate Generate tool (click or press 'g')

| # | Test Case | Expected Behavior | ✓ | Actual Behavior |
|---|-----------|-------------------|---|-----------------|
| D1 | Panel title displays | Shows "Generate settings" as title | ☐ | |
| D2 | Prompt textarea renders | Labeled "Prompt", multiline input visible | ☐ | |
| D3 | Prompt is editable | Can type and edit text freely | ☐ | |
| D4 | Prompt has placeholder | Shows helper text like "Describe what you want to generate..." | ☐ | |
| D5 | Negative Prompt textarea renders | Labeled "Negative Prompt", multiline input visible | ☐ | |
| D6 | Negative Prompt is editable | Can type and edit text freely | ☐ | |
| D7 | Sampler dropdown renders | Labeled "Sampler", shows dropdown control | ☐ | |
| D8 | Sampler has options | Clicking opens list: euler, euler_a, heun, dpm_2, dpm_2_a, lms, dpm_fast, dpm_adaptive, dpmpp_2s_a, dpmpp_sde, dpmpp_2m, ddim, uni_pc | ☐ | |
| D9 | Sampler has default | "euler" is pre-selected | ☐ | |
| D10 | Steps slider renders | Labeled "Steps", range 1-150, default 20 | ☐ | |
| D11 | Steps slider is interactive | Can drag slider or input value directly | ☐ | |
| D12 | CFG Scale slider renders | Labeled "CFG Scale", range 1-30, default 7 | ☐ | |
| D13 | CFG Scale is interactive | Can drag slider or input value directly | ☐ | |
| D14 | Width slider renders | Labeled "Width", range 64-2048, default 512 | ☐ | |
| D15 | Width is interactive | Can drag slider or input value directly | ☐ | |
| D16 | Height slider renders | Labeled "Height", range 64-2048, default 512 | ☐ | |
| D17 | Height is interactive | Can drag slider or input value directly | ☐ | |
| D18 | All settings have labels | Each control clearly labeled with its purpose | ☐ | |
| D19 | Layout is scrollable | If too many settings, panel scrolls vertically | ☐ | |

**Expected Layout**:
```
┌─────────────────────────┐
│  Generate settings      │
├─────────────────────────┤
│  Prompt:                │
│  [Text area...        ] │
│                         │
│  Negative Prompt:       │
│  [Text area...        ] │
│                         │
│  Sampler: [euler ▼]     │
│  Steps: [====●====] 20  │
│  CFG Scale: [===●=] 7   │
│  Width: [====●====] 512 │
│  Height: [===●====] 512 │
└─────────────────────────┘
```

**Notes**: _____________________________________

---

## E. Settings Rendering - Other Tools

These tests verify settings for Select, Remove Background, and Replace Background tools.

### Test Location
**EditorToolPanel** (right sidebar when respective tool is active)

| # | Test Case | Expected Behavior | ✓ | Actual Behavior |
|---|-----------|-------------------|---|-----------------|
| E1 | Select tool: No settings | EditorToolPanel is empty or shows "No settings" | ☐ | |
| E2 | Remove BG tool: No settings | EditorToolPanel is empty or shows "No settings" | ☐ | |
| E3 | Replace BG tool: Title | Shows "Replace Background settings" | ☐ | |
| E4 | Replace BG: Background Prompt | Labeled "Background Prompt", text input visible | ☐ | |
| E5 | Replace BG: Prompt is editable | Can type description of new background | ☐ | |
| E6 | Replace BG: Blend Strength | Labeled "Blend Strength", slider 0-1, default 0.8 | ☐ | |
| E7 | Replace BG: Blend is interactive | Can adjust blend strength slider | ☐ | |

**Expected Layout for Replace Background**:
```
┌─────────────────────────┐
│  Replace Background     │
│  settings               │
├─────────────────────────┤
│  Background Prompt:     │
│  [beach sunset...     ] │
│                         │
│  Blend Strength:        │
│  [======●===] 0.8       │
└─────────────────────────┘
```

**Notes**: _____________________________________

---

## F. Tool Interactions

These tests verify that tools interact correctly with the canvas and UI.

### Test Location
**Canvas** (main editor area)

| # | Test Case | Expected Behavior | ✓ | Actual Behavior |
|---|-----------|-------------------|---|-----------------|
| F1 | Brush tool: Cursor changes | Hovering canvas shows brush cursor (circle matching size) | ☐ | |
| F2 | Brush tool: Drawing works | Click and drag on canvas erases/draws | ☐ | |
| F3 | Brush tool: Size affects drawing | Larger size = larger brush strokes | ☐ | |
| F4 | Select tool: Cursor changes | Hovering canvas shows selection cursor (arrow or crosshair) | ☐ | |
| F5 | Select tool: Selection works | Can click entities to select them | ☐ | |
| F6 | Select tool: Multiple selection | Shift+click or drag to select multiple entities | ☐ | |
| F7 | Generate tool: No cursor change | Standard cursor on canvas (tool is not interactive on canvas) | ☐ | |
| F8 | Tool switching preserves state | Switch brush→select→brush: brush settings unchanged | ☐ | |
| F9 | Shortcuts work during interaction | Press 'v' while drawing switches to select tool | ☐ | |
| F10 | Canvas updates reflect tool | Active tool determines canvas interaction mode | ☐ | |

**Notes**: _____________________________________

---

## G. Workflow Tool Behavior

These tests verify that workflow-based tools (generate, remove BG, replace BG) show appropriate placeholder behavior.

### Test Location
**Browser Console** + **Canvas**

**Important**: These tools are implemented as declarative definitions but have placeholder execution logic.

| # | Test Case | Expected Behavior | ✓ | Actual Behavior |
|---|-----------|-------------------|---|-----------------|
| G1 | Generate tool: Activation log | Console shows: "Generate tool activated with settings: {...}" | ☐ | |
| G2 | Generate tool: Settings in log | Log shows current prompt, sampler, steps, cfg_scale, width, height | ☐ | |
| G3 | Generate tool: Execute error | Attempting to execute workflow throws: "Generate tool workflow execution not yet implemented" | ☐ | |
| G4 | Remove BG: Activation log | Console shows: "Remove Background tool activated" | ☐ | |
| G5 | Remove BG: Execute error | Attempting execution throws: "Remove Background tool workflow execution not yet implemented" | ☐ | |
| G6 | Replace BG: Activation log | Console shows: "Replace Background tool activated with settings: {backgroundPrompt, blendStrength}" | ☐ | |
| G7 | Replace BG: Settings in log | Log shows current backgroundPrompt and blendStrength values | ☐ | |
| G8 | Replace BG: Execute error | Attempting execution throws: "Replace Background tool workflow execution not yet implemented" | ☐ | |
| G9 | Error messages are clear | Errors clearly state "not yet implemented" with tool name | ☐ | |
| G10 | No runtime crashes | Placeholder errors don't crash the application | ☐ | |

**How to Trigger Workflow Execution** (if applicable):
- Currently, workflows may auto-execute on tool activation (check console logs)
- Or may require explicit trigger action (button click, canvas interaction)
- Document actual trigger mechanism: _____________________

**Notes**: _____________________________________

---

## H. State Isolation

These tests verify that tool settings are properly isolated and persist correctly.

### Test Procedure
1. Activate Brush tool, change Size to 50
2. Activate Generate tool, enter Prompt "a cat"
3. Switch back to Brush tool
4. Switch back to Generate tool
5. Activate Select tool
6. Restart sequence with different values

| # | Test Case | Expected Behavior | ✓ | Actual Behavior |
|---|-----------|-------------------|---|-----------------|
| H1 | Brush settings persist | After switching away and back, Size is still 50 | ☐ | |
| H2 | Generate settings persist | After switching away and back, Prompt is still "a cat" | ☐ | |
| H3 | Brush changes don't affect Generate | Changing brush Size doesn't change generate Steps | ☐ | |
| H4 | Generate changes don't affect Brush | Changing generate Prompt doesn't change brush Size | ☐ | |
| H5 | Replace BG isolated from Generate | Changing Generate prompt doesn't change Replace BG backgroundPrompt | ☐ | |
| H6 | Multiple setting changes persist | Change multiple settings in one tool, all persist after switch | ☐ | |
| H7 | Default values on first activation | First time activating a tool shows correct default values | ☐ | |
| H8 | State survives page interactions | Settings persist after canvas zoom, pan, other UI interactions | ☐ | |
| H9 | Tool activation doesn't reset state | Activating same tool twice doesn't reset its settings | ☐ | |
| H10 | Independent state stores | Each tool uses its own Zustand state slice (verify in React DevTools) | ☐ | |

**Notes**: _____________________________________

---

## Edge Cases & Error Scenarios

These tests cover boundary conditions and potential error states.

| # | Test Case | Expected Behavior | ✓ | Actual Behavior |
|---|-----------|-------------------|---|-----------------|
| EC1 | Slider: Min value input | Setting size to 1 works, doesn't go below | ☐ | |
| EC2 | Slider: Max value input | Setting size to 100 works, doesn't go above | ☐ | |
| EC3 | Slider: Invalid input | Typing "abc" in slider input shows error or reverts | ☐ | |
| EC4 | Textarea: Long text | Entering 1000+ characters in prompt works, scrolls | ☐ | |
| EC5 | Dropdown: No selection | Sampler always has a value selected, can't be empty | ☐ | |
| EC6 | Rapid tool switching | Quickly pressing e,v,g,e,v doesn't break UI | ☐ | |
| EC7 | Spam keyboard shortcuts | Holding 'e' doesn't cause issues | ☐ | |
| EC8 | Settings while drawing | Changing brush size while mid-stroke updates next stroke | ☐ | |
| EC9 | Tool without definition | (Dev test) Tool not in registry doesn't appear in UI | ☐ | |
| EC10 | Malformed tool definition | (Dev test) Tool with missing required fields shows error | ☐ | |

**Notes**: _____________________________________

---

## Performance & Visual Quality

These tests verify UI responsiveness and visual polish.

| # | Test Case | Expected Behavior | ✓ | Actual Behavior |
|---|-----------|-------------------|---|-----------------|
| P1 | Tool activation is instant | No lag when clicking tools or pressing shortcuts | ☐ | |
| P2 | Settings render quickly | EditorToolPanel updates appear in <100ms | ☐ | |
| P3 | Slider dragging is smooth | No jank or stuttering when dragging sliders | ☐ | |
| P4 | Brush preview updates smoothly | Preview updates feel responsive (no visible delay) | ☐ | |
| P5 | Layout doesn't shift | Switching tools doesn't cause sidebar width changes | ☐ | |
| P6 | Icons are crisp | Tool icons render clearly at all screen resolutions | ☐ | |
| P7 | Typography is consistent | All labels use consistent font sizes and weights | ☐ | |
| P8 | Spacing is even | Padding and margins look balanced throughout | ☐ | |
| P9 | Dark/Light mode support | UI looks good in both themes (if applicable) | ☐ | |
| P10 | Responsive layout | Settings panel works on different window sizes | ☐ | |

**Notes**: _____________________________________

---

## Browser Compatibility

Test in multiple browsers if possible:

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | _______ | ☐ PASS / ☐ FAIL | _____________ |
| Firefox | _______ | ☐ PASS / ☐ FAIL | _____________ |
| Safari | _______ | ☐ PASS / ☐ FAIL | _____________ |
| Edge | _______ | ☐ PASS / ☐ FAIL | _____________ |

---

## Issues Found

Document any issues, bugs, or unexpected behavior discovered during testing.

### Issue Template

```markdown
**Issue #**: ___
**Severity**: Critical / High / Medium / Low
**Test Case**: [Test ID, e.g., C5]
**Description**:
**Steps to Reproduce**:
1.
2.
3.
**Expected**:
**Actual**:
**Screenshots**: [If applicable]
**Console Errors**: [If any]
**Workaround**: [If found]
```

### Issue Log

_[Document issues here during testing]_

---

## Known Limitations

These are expected limitations, not bugs:

1. **Workflow Execution**: Generate, Remove Background, and Replace Background tools show placeholder behavior. Actual ComfyUI workflow execution is not yet implemented.

2. **Tool Implementations**: Only Brush and Select tools have full canvas interaction logic. Workflow tools log activation but don't perform actual operations.

3. **Persistence**: Tool settings persist only during the current session. Closing the browser resets all settings to defaults.

4. **Undo/Redo**: Tool-specific undo/redo may not be fully implemented for all tools.

---

## Test Completion

**Date Completed**: _______________
**Total Tests**: 100+
**Tests Passed**: _____ / _____
**Tests Failed**: _____ / _____
**Pass Rate**: _____%

**Overall Assessment**:

_[Provide summary of testing results, major findings, and recommendation for release readiness]_

**Sign-off**:

- Tester: _______________ Date: _______________
- Reviewer: _______________ Date: _______________

---

## Appendix A: Testing Tips

### How to Check React DevTools

1. Install React DevTools browser extension
2. Open DevTools → Components tab
3. Search for "ToolsPanel" component
4. Inspect props to see registry state
5. Search for "EditorToolPanel" to see active tool settings

### How to Check Zustand State

1. Open DevTools → Console
2. Access store state (implementation-specific, check GlobalState.ts)
3. Look for tool state slices: `brushSettings`, `generateSettings`, etc.

### How to Verify Type Safety

1. Open TypeScript files in editor
2. Check for type errors (should be zero)
3. Verify autocomplete works for tool definitions
4. Confirm SettingRenderer has correct type discrimination

### Console Commands for Debugging

```javascript
// Get active tool
Tools.useActiveTool.getState()

// Get tool registry
Tools.Registry.getAll()

// Get specific tool settings (example)
// (Exact API depends on implementation)
```

---

## Appendix B: Success Criteria

The declarative tool system is considered **FULLY VERIFIED** when:

- ✅ All 5 tools are discoverable in UI
- ✅ All tools can be activated via click and keyboard
- ✅ Settings render correctly for all setting types
- ✅ Tool state is isolated and persistent
- ✅ Canvas interactions work for interactive tools
- ✅ Workflow tools show appropriate placeholder behavior
- ✅ No console errors or warnings during normal use
- ✅ UI is responsive and performant
- ✅ Tests pass in at least 2 major browsers
- ✅ Zero critical or high-severity bugs found

---

## Document History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-01-28 | 1.0 | Initial verification checklist created | Claude |

---

**End of Verification Checklist**
