// packages/comfystudio-ui/src/Tools/definitions/remove-background.ts
import { WorkflowTool } from "../Types";

const removeBackgroundTool: WorkflowTool = {
  id: "remove-background",
  name: "Remove Background",
  description: "Automatically remove background from selected image",
  icon: "Scissors",
  category: "workflow",
  workflow: "remove-background",
  inputMapping: {
    image: "selectedEntity",
  },
};

export default removeBackgroundTool;
