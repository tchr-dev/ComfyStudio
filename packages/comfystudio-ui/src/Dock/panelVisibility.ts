export type ToolPanelVisibility = {
  prompt: boolean;
  input: boolean;
  settings: boolean;
  advanced: boolean;
};

export function getToolPanelVisibility(
  toolId?: string
): ToolPanelVisibility {
  switch (toolId) {
    case "brush":
      return {
        prompt: false,
        input: false,
        settings: false,
        advanced: false,
      };
    case "remove-background":
      return {
        prompt: false,
        input: true,
        settings: false,
        advanced: false,
      };
    case "select":
      return {
        prompt: true,
        input: true,
        settings: true,
        advanced: false,
      };
    case "replace-background":
    case "generate":
      return {
        prompt: true,
        input: true,
        settings: true,
        advanced: true,
      };
    default:
      return {
        prompt: true,
        input: true,
        settings: true,
        advanced: true,
      };
  }
}
