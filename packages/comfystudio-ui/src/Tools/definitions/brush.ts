// packages/comfystudio-ui/src/Tools/definitions/brush.ts
import { CanvasInteractionTool } from "../Types";

const brushTool: CanvasInteractionTool = {
  id: "brush",
  name: "Eraser",
  description: "Remove pixels from images by painting over them",
  icon: "Eraser",
  shortcut: "e",
  category: "canvas-interaction",
  cursor: "custom",
  cursorComponent: "BrushCursor",
  settings: [
    {
      id: "size",
      type: "slider",
      label: "Size",
      description: "Brush size in pixels",
      min: 1,
      max: 100,
      step: 1,
      default: 20,
    },
    {
      id: "strength",
      type: "slider",
      label: "Strength",
      description: "Opacity of the eraser stroke",
      min: 0,
      max: 1,
      step: 0.01,
      default: 1,
    },
    {
      id: "blur",
      type: "slider",
      label: "Blur",
      description: "Blur/feather amount for soft edges",
      min: 0,
      max: 50,
      step: 1,
      default: 0,
    },
  ],
};

export default brushTool;
