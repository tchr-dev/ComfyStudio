# Background Tools Design

**Goal:** Add DreamStudio-style Remove Background and Replace Background edit tools with a UI-first mock, then wire to ComfyUI workflows later.

## Architecture

- Add a lightweight Edit Tool Registry in the UI. Tools register id, label, icon, enabled flag, and a left-sidebar panel component.
- Left rail in Edit mode renders tools from the registry and sets an active edit tool state.
- Left sidebar switches to a dedicated tool mode based on the active edit tool.
- UI is agnostic to backend method; tool actions call an `Editor.Background` domain.

## Tool Behavior

### Remove Background

- Prompt section hidden/disabled.
- A single action block is shown with a primary Remove Background button.
- Action is enabled only when a single image layer is selected.

### Replace Background

- Prompt and existing settings remain visible and usable.
- A Replace Background action block appears below existing controls.
- Action is enabled only when a single image layer is selected.

## Mock Interaction (Step 0)

- Tool selection updates active state and sidebar contents.
- Action triggers create a new image layer derived from the selected image with a mock label.
- No ComfyUI calls in this step.

## Future Integration

- Step A: ComfyUI Remove BG workflow using ComfyUI-Rembg.
- Step B: Replace BG workflow using rembg mask + inpainted background from prompt.
- Tool registry allows enabling/disabling tools via feature flags.

## Error Handling

- Inline messaging when selection is missing or invalid.
- Disable action buttons while operations are running.

## Scope Decisions

- Target selection scope: selected image only.
- Only two tools in the left rail initially.

