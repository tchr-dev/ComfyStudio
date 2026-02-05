// packages/comfystudio-ui/src/Tools/definitions/generate.ts
import { WorkflowTool } from "../Types";

const generateTool: WorkflowTool = {
  id: "generate",
  name: "Generate",
  description: "Generate images using AI models",
  icon: "Sparkles",
  shortcut: "g",
  category: "workflow",
  workflow: "txt2img",
  settings: [
    {
      id: "prompt",
      type: "textarea",
      label: "Prompt",
      placeholder: "Describe what you want to generate...",
      default: "",
    },
    {
      id: "negativePrompt",
      type: "textarea",
      label: "Negative Prompt",
      placeholder: "What to avoid in the generation...",
      default: "",
    },
    {
      id: "sampler",
      type: "dropdown",
      label: "Sampler",
      options: [
        { value: "euler", label: "Euler" },
        { value: "euler_a", label: "Euler A" },
        { value: "dpmpp_2m", label: "DPM++ 2M" },
        { value: "dpmpp_sde", label: "DPM++ SDE" },
      ],
      default: "euler",
    },
    {
      id: "steps",
      type: "slider",
      label: "Steps",
      description: "Number of sampling steps",
      min: 1,
      max: 150,
      step: 1,
      default: 20,
    },
    {
      id: "cfgScale",
      type: "slider",
      label: "CFG Scale",
      description: "How closely to follow the prompt",
      min: 1,
      max: 30,
      step: 0.5,
      default: 7,
    },
    {
      id: "width",
      type: "slider",
      label: "Width",
      min: 256,
      max: 2048,
      step: 64,
      default: 512,
    },
    {
      id: "height",
      type: "slider",
      label: "Height",
      min: 256,
      max: 2048,
      step: 64,
      default: 512,
    },
  ],
};

export default generateTool;
