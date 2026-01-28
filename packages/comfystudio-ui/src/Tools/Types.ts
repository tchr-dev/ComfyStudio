export type ID = string;

// Setting types
export type SliderSetting = {
  type: "slider";
  id: string;
  label: string;
  default: number;
  min: number;
  max: number;
  step?: number;
};

export type TextSetting = {
  type: "text";
  id: string;
  label: string;
  default: string;
  placeholder?: string;
};

export type TextareaSetting = {
  type: "textarea";
  id: string;
  label: string;
  default: string;
  placeholder?: string;
  rows?: number;
};

export type DropdownSetting = {
  type: "dropdown";
  id: string;
  label: string;
  options: string[];
  default: string;
};

export type CheckboxSetting = {
  type: "checkbox";
  id: string;
  label: string;
  default: boolean;
};

export type CustomSetting = {
  type: "custom";
  id: string;
  label: string;
  component: React.ComponentType<{ value: unknown; onChange: (value: unknown) => void }>;
  default: unknown;
};

export type ToolSettingType =
  | SliderSetting
  | TextSetting
  | TextareaSetting
  | DropdownSetting
  | CheckboxSetting
  | CustomSetting;

// Tool categories (discriminated union)
export type CanvasInteractionTool = {
  id: ID;
  name: string;
  description: string;
  icon: string;
  category: "canvas-interaction";
  cursor?: string;
  shortcut?: string;
  settings: ToolSettingType[];
};

export type WorkflowTool = {
  id: ID;
  name: string;
  description: string;
  icon: string;
  category: "workflow";
  workflow: string;
  inputMapping?: Record<string, string>;
  shortcut?: string;
  settings: ToolSettingType[];
};

export type SelectionTool = {
  id: ID;
  name: string;
  description: string;
  icon: string;
  category: "selection";
  multiSelect: boolean;
  shortcut?: string;
  settings: ToolSettingType[];
};

export type ToolDefinition = CanvasInteractionTool | WorkflowTool | SelectionTool;

// Legacy type for backward compatibility
export type ToolSummary = {
  id: string;
  name: string;
  description?: string;
};
