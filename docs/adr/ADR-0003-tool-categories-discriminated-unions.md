# ADR-0003: Tool Categories as Discriminated Unions

**Status:** Active

**Date:** 2026-01-28

**Context:**

Tools have fundamentally different behaviors:
- Canvas tools (Brush) interact with pixels
- Workflow tools (Generate) trigger ComfyUI workflows
- Selection tools (Select) manage entity state

Using a single unified type with optional fields loses type safety and makes invalid states representable.

**Decision:**

Use TypeScript discriminated unions with `category` as the discriminant:

```typescript
type ToolDefinition =
  | CanvasInteractionTool  // category: "canvas-interaction"
  | WorkflowTool           // category: "workflow"
  | SelectionTool          // category: "selection"
```

Each category has:
- **Shared base:** id, name, icon, description, settings, shortcut
- **Category-specific:** cursor (canvas), workflow (workflow), multiSelect (selection)

TypeScript narrows the type based on `category` field.

**Consequences:**

**Positive:**
- Type safety: can't set `workflow` on canvas tool
- Self-documenting: clear which fields apply to which tools
- Invalid states unrepresentable at compile time
- Easy to add new categories (extend union)
- Pattern matching in implementations

**Negative:**
- More complex type definitions (3 types vs 1)
- Need to handle each case in switch statements
- Can't have fields that apply to "some but not all" categories

**Neutral:**
- Category cannot change at runtime (structural, not behavioral)
- Must always provide category field

**Alternatives Considered:**

- **Single type with all optional fields** - Rejected: No type safety, anything goes
- **Class hierarchy** - Rejected: Over-engineered for data structures
- **Separate registration per category** - Rejected: Breaks unified registry
- **Tagged union with string literal** - Rejected: Same as discriminated union (what we chose)

## Category Definitions

### Canvas Interaction Tools

```typescript
type CanvasInteractionTool = BaseToolDefinition & {
  category: "canvas-interaction";
  cursor?: "crosshair" | "default" | "custom";
  cursorComponent?: string;
}
```

**Use when:** Tool draws/interacts with canvas pixels

**Examples:** Brush, Eraser, Paint, Clone

### Workflow Tools

```typescript
type WorkflowTool = BaseToolDefinition & {
  category: "workflow";
  workflow: string;                    // ComfyUI workflow id
  inputMapping?: Record<string, string>;
}
```

**Use when:** Tool triggers ComfyUI workflow

**Examples:** Generate, Remove Background, Replace Background, Upscale

### Selection Tools

```typescript
type SelectionTool = BaseToolDefinition & {
  category: "selection";
  multiSelect?: boolean;
}
```

**Use when:** Tool manages entity selection/manipulation

**Examples:** Select, Lasso, Magic Wand

## Type Narrowing

```typescript
function processTool(tool: ToolDefinition) {
  if (tool.category === "workflow") {
    // TypeScript knows tool has .workflow property
    executeWorkflow(tool.workflow);
  }
}
```

## Adding New Categories

1. Add to union: `type ToolDefinition = ... | NewCategoryTool`
2. Define category-specific type: `type NewCategoryTool = ...`
3. Update switch statements (TypeScript will error on missing cases)
4. Document in this ADR

## For AI Agents

❌ **Do NOT suggest:**
- "Make all fields optional" (loses type safety)
- "Use single type with mode field" (discriminated union is better)
- "Why not just any?" (defeats purpose of TypeScript)
- "Flatten into one interface" (invalid states become representable)

✅ **This is intentional:**
- Three categories reflect actual behavioral differences
- Type safety prevents bugs at compile time
- Discriminant (`category`) is required and unchanging
- Adding categories is rare, so union growth is acceptable

## Extending Categories

**If a tool needs fields from multiple categories:**

🚫 **Wrong:** Create hybrid category
✅ **Right:**
  - Add field to base if truly universal
  - OR create new category with all needed fields
  - OR split into multiple tools

**Example:** Tool that does workflow AND canvas manipulation:
- Option 1: Two tools (generate + paint result)
- Option 2: New category "composite" with both sets of fields
