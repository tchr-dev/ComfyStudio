import { ToolImplementation } from "../Types";

const removeBackgroundImplementation: ToolImplementation = {
  async executeWorkflow(settings: Record<string, any>): Promise<void> {
    console.log("[remove-background] Executing workflow with settings:", settings);
    // TODO: Integrate with ComfyUI plugin to execute background removal
    // Input mapping: image from selectedEntity
    throw new Error("Remove background workflow not yet implemented");
  },
};

export default removeBackgroundImplementation;
