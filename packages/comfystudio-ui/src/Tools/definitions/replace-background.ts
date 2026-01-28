// packages/comfystudio-ui/src/Tools/definitions/replace-background.ts
import { WorkflowTool } from "../Types";

const replaceBackgroundTool: WorkflowTool = {
  id: "replace-background",
  name: "Replace Background",
  description: "Replace the background with AI-generated content",
  icon: "ImagePlus",
  category: "workflow",
  workflow: "replace-background",
  inputMapping: {
    image: "selectedEntity",
  },
  settings: [
    {
      id: "backgroundPrompt",
      type: "textarea",
      label: "Background Prompt",
      placeholder: "Describe the new background...",
      default: "",
    },
    {
      id: "blendStrength",
      type: "slider",
      label: "Blend Strength",
      description: "How much to blend edges",
      min: 0,
      max: 1,
      step: 0.05,
      default: 0.8,
    },
  ],
};

export default replaceBackgroundTool;
