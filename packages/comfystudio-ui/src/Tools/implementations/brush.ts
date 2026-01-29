import { Editor } from "~/Editor";
import { ToolImplementation } from "../Types";

const brushImplementation: ToolImplementation = {
  SettingsPanel: Editor.Brush.Sidebar.Section,
  // Existing brush handles its own canvas events via Editor.Canvas.useMouseDown etc.
  // No need to duplicate that logic here
};

export default brushImplementation;
