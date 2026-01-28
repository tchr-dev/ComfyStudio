import { KonvaEventObject } from "konva/lib/Node";

// Base setting type
export type BaseToolSetting = {
  id: string;
  label: string;
  description?: string;
};

// Setting types
export type SliderSetting = BaseToolSetting & {
  type: "slider";
  default: number;
  min: number;
  max: number;
  step?: number;
};

export type TextSetting = BaseToolSetting & {
  type: "text" | "textarea";
  default: string;
  placeholder?: string;
  maxLength?: number;
};

export type DropdownSetting = BaseToolSetting & {
  type: "dropdown";
  options: { value: string; label: string }[];
  default: string;
};

export type CheckboxSetting = BaseToolSetting & {
  type: "checkbox";
  default: boolean;
};

export type CustomSetting = BaseToolSetting & {
  type: "custom";
  component: string;
  props?: Record<string, unknown>;
};

export type ToolSetting =
  | SliderSetting
  | TextSetting
  | DropdownSetting
  | CheckboxSetting
  | CustomSetting;

// Base tool definition
export type BaseToolDefinition = {
  id: string;
  name: string;
  description?: string;
  icon: string;
  shortcut?: string;
  category: "canvas-interaction" | "workflow" | "selection";
  settings?: ToolSetting[];
};

// Tool categories (discriminated union)
export type CanvasInteractionTool = BaseToolDefinition & {
  category: "canvas-interaction";
  cursor?: "crosshair" | "default" | "custom";
  cursorComponent?: string;
};

export type WorkflowTool = BaseToolDefinition & {
  category: "workflow";
  workflow: string;
  inputMapping?: Record<string, string>;
};

export type SelectionTool = BaseToolDefinition & {
  category: "selection";
  multiSelect?: boolean;
};

export type ToolDefinition = CanvasInteractionTool | WorkflowTool | SelectionTool;

// Tool implementation interface
export type ToolImplementation = {
  onActivate?: () => void;
  onDeactivate?: () => void;
  onMouseDown?: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseMove?: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseUp?: (e: KonvaEventObject<MouseEvent>) => void;
  executeWorkflow?: (settings: Record<string, any>) => Promise<void>;
  SettingsPanel?: React.ComponentType;
};

// Legacy type for backward compatibility
export type ToolSummary = {
  id: string;
  name: string;
  description?: string;
};
