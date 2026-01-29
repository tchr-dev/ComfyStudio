# UI Components Specification

**Date**: 2026-01-29
**Status**: P1 - Should Have in V1
**Covers**: Settings Panel (#3), Buttons (#4), Form Inputs (#5)

---

## Part 1: Settings Panel Content

### Access
Top bar → Settings icon (⚙) → Opens dockable settings panel

### Panel Structure

```
┌── Settings ───────────────────────┐
│ [Search settings...]              │
├───────────────────────────────────┤
│ ▸ Appearance                      │
│ ▸ Hotkeys                         │
│ ▸ ComfyUI Connection              │
│ ▸ Canvas                          │
│ ▸ Performance                     │
│ ▸ Privacy                         │
│ ▸ About                           │
├───────────────────────────────────┤
│ [Reset to Defaults]               │
└───────────────────────────────────┘
```

### Sections

**Appearance**
- Theme: Dark (Light future)
- Panel transparency: 0-100%
- Font size: Small/Medium/Large
- Reduce animations: Checkbox

**Hotkeys**
- List of all shortcuts
- Click to rebind (future)
- Reset all shortcuts button

**ComfyUI Connection**
- Server URL: Text input (default: http://127.0.0.1:8188)
- Auto-connect: Checkbox
- Connection status: Connected/Disconnected
- Test Connection button

**Canvas**
- Checkerboard size: 8/16/32px
- Show grid: Checkbox
- Grid size: 10/25/50px
- Snap to grid: Checkbox

**Performance**
- Max history size: 10-100 (slider)
- Auto-save interval: 500-5000ms
- Hardware acceleration: Checkbox
- Max thumbnail cache: 50-200MB

**Privacy**
- Clear all local data button
- Export settings button
- Import settings button

**About**
- App version
- ComfyUI version (if connected)
- Credits
- License
- Check for updates button

---

## Part 2: Button Component Spec

### Button Variants

**Primary** - Main actions
```tsx
<Button variant="primary" size="md">
  Generate
</Button>
```
- Background: accent-primary (#7C3AED)
- Text: white
- Hover: 10% lighter
- Active: 10% darker

**Secondary** - Less emphasis
```tsx
<Button variant="secondary" size="md">
  Cancel
</Button>
```
- Background: transparent
- Border: 1px accent-primary
- Text: accent-primary
- Hover: 5% background fill

**Tertiary** - Minimal
```tsx
<Button variant="tertiary" size="md">
  Learn More
</Button>
```
- Background: transparent
- No border
- Text: text-secondary
- Hover: text-primary

**Destructive** - Dangerous actions
```tsx
<Button variant="destructive" size="md">
  Delete All
</Button>
```
- Background: error (#EF4444)
- Text: white
- Hover: 10% darker

### Button Sizes

```css
.button-sm {
  height: 32px;
  padding: 0 12px;
  font-size: 12px;
}

.button-md {
  height: 40px;
  padding: 0 16px;
  font-size: 14px;
}

.button-lg {
  height: 48px;
  padding: 0 24px;
  font-size: 16px;
}
```

### Button States

**Default**
```css
.button {
  border-radius: var(--radius-sm);
  font-weight: 500;
  transition: all 150ms ease;
  cursor: pointer;
}
```

**Hover**
```css
.button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
```

**Active/Pressed**
```css
.button:active {
  transform: translateY(0);
  box-shadow: none;
}
```

**Disabled**
```css
.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
```

**Loading**
```tsx
<Button loading>
  <Spinner /> Generating...
</Button>
```
- Shows spinner icon
- Disabled state
- Text changes to action in progress

### Icon Buttons

**With icon + text**
```tsx
<Button icon={<Sparkles />}>
  Generate
</Button>
```

**Icon only**
```tsx
<IconButton icon={<X />} aria-label="Close" />
```
- Square (40×40px for md)
- Icon centered
- No text (aria-label required)

### Button Groups

```tsx
<ButtonGroup>
  <Button>Option 1</Button>
  <Button>Option 2</Button>
  <Button>Option 3</Button>
</ButtonGroup>
```
- Buttons connected (no gap)
- First: rounded left corners
- Last: rounded right corners
- Middle: no rounding

---

## Part 3: Form Input Components

### Text Input

**Single-line text**
```tsx
<Input
  type="text"
  label="Prompt"
  placeholder="What do you want to see?"
  value={prompt}
  onChange={setPrompt}
/>
```

**Styling**
```css
.input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 14px;
}

.input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(124,58,237,0.1);
}

.input::placeholder {
  color: var(--text-tertiary);
}
```

**States**
- Default
- Hover: border brightens
- Focus: purple border + shadow
- Error: red border
- Disabled: opacity 0.5, cursor not-allowed

### Textarea

**Multi-line text**
```tsx
<Textarea
  label="Prompt"
  placeholder="Describe what you want..."
  rows={4}
  value={prompt}
  onChange={setPrompt}
  maxLength={500}
/>
```

**Features**
- Auto-resize (optional)
- Character count (if maxLength)
- Resize handle (default)

### Dropdown/Select

**Single select**
```tsx
<Select
  label="Model"
  options={[
    { value: 'sd-xl', label: 'Stable Diffusion XL' },
    { value: 'sd-1.5', label: 'Stable Diffusion 1.5' },
  ]}
  value={model}
  onChange={setModel}
/>
```

**Visual**
```
┌─────────────────────────┐
│ Stable Diffusion XL   ▼ │
└─────────────────────────┘

Expanded:
┌─────────────────────────┐
│ ✓ Stable Diffusion XL   │
│   Stable Diffusion 1.5  │
│   Stable Diffusion 2.1  │
└─────────────────────────┘
```

### Slider

**Numeric range**
```tsx
<Slider
  label="Steps"
  min={1}
  max={150}
  step={1}
  value={steps}
  onChange={setSteps}
  showValue
/>
```

**Visual**
```
Steps                    20
├─────●──────────────────┤
1                      150
```

**Features**
- Draggable handle
- Click track to jump
- Keyboard arrows (±1)
- Shift+arrows (±10)
- Value display (optional)

### Checkbox

**Boolean input**
```tsx
<Checkbox
  label="Auto-connect to ComfyUI"
  checked={autoConnect}
  onChange={setAutoConnect}
/>
```

**Visual**
```
☑ Auto-connect to ComfyUI
```

**States**
- Unchecked: Empty box
- Checked: Filled with checkmark
- Indeterminate: Dash (for partial selection)

### Radio Group

**Single choice from options**
```tsx
<RadioGroup
  label="Quality"
  options={[
    { value: 'fast', label: 'Fast' },
    { value: 'balanced', label: 'Balanced' },
    { value: 'high', label: 'High Quality' },
  ]}
  value={quality}
  onChange={setQuality}
/>
```

**Visual**
```
Quality
◉ Fast
◯ Balanced
◯ High Quality
```

### Color Picker

**Color input**
```tsx
<ColorPicker
  label="Brush Color"
  value={color}
  onChange={setColor}
/>
```

**Visual**
```
Brush Color  [■] #FF5733
             └─┘
          Color swatch (click to open picker)
```

**Picker modal** (on click):
- Hue/Saturation picker
- Lightness slider
- Hex input
- RGB sliders
- Recent colors

### Number Input

**Numeric value with controls**
```tsx
<NumberInput
  label="Seed"
  value={seed}
  onChange={setSeed}
  min={0}
  max={999999}
  step={1}
/>
```

**Visual**
```
Seed
┌─────────┬─┐
│ 12345   │▲│
│         │▼│
└─────────┴─┘
```

**Features**
- +/- buttons
- Keyboard up/down arrows
- Direct typing
- Min/max constraints

---

## Form Field Patterns

### Field Structure

```tsx
<Field>
  <Label>Prompt</Label>
  <Input />
  <HelperText>Describe what you want to generate</HelperText>
  <ErrorText>Prompt is required</ErrorText>
</Field>
```

### Label

```css
.label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.label.required::after {
  content: ' *';
  color: var(--error);
}
```

### Helper Text

```css
.helper-text {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-tertiary);
}
```

### Error Text

```css
.error-text {
  margin-top: 4px;
  font-size: 12px;
  color: var(--error);
  display: flex;
  align-items: center;
  gap: 4px;
}

.error-text::before {
  content: '⚠';
}
```

---

## Form Validation

### Validation States

**Valid**
- Default border color
- No error message

**Invalid**
- Red border
- Error icon
- Error message below
- Focus: red shadow

**Warning**
- Amber border
- Warning icon
- Warning message
- Focus: amber shadow

### Validation Timing

**On blur** (preferred):
- Validate after user leaves field
- Non-intrusive

**On submit**:
- Validate all fields
- Focus first invalid field
- Show all error messages

**Real-time** (for specific cases):
- Password strength
- Username availability
- Character count

---

## Accessibility

### Labels
- Always use `<label>` with `for` attribute
- Or wrap input in label
- aria-label for icon-only buttons

### Focus
- Visible focus ring (2px accent color)
- Logical tab order
- Skip to content link

### Errors
- aria-invalid on invalid fields
- aria-describedby linking to error message
- Error icon has aria-hidden

### Keyboard
- Enter submits forms
- Escape closes modals/dropdowns
- Arrow keys navigate options
- Space toggles checkboxes

---

## Component Library Structure

```
src/Theme/
├── Button/
│   ├── Button.tsx
│   ├── IconButton.tsx
│   ├── ButtonGroup.tsx
│   └── index.ts
├── Input/
│   ├── Input.tsx
│   ├── Textarea.tsx
│   ├── Select.tsx
│   ├── Slider.tsx
│   ├── Checkbox.tsx
│   ├── Radio.tsx
│   ├── ColorPicker.tsx
│   ├── NumberInput.tsx
│   └── index.ts
├── Field/
│   ├── Field.tsx
│   ├── Label.tsx
│   ├── HelperText.tsx
│   ├── ErrorText.tsx
│   └── index.ts
└── index.ts (exports all)
```

---

**Status**: All P1 Gaps Filled! ✅
- #1: Panel State Persistence
- #2: Generation Batch Management
- #3: Settings Panel Content
- #4: Button Components
- #5: Form Input Components

**Next**: Commit and move to implementation
