// packages/comfystudio-ui/src/Tools/definitions/select.ts
import { SelectionTool } from "../Types";

const selectTool: SelectionTool = {
  id: "select",
  name: "Select",
  description: "Select and manipulate canvas entities",
  icon: "MousePointer",
  shortcut: "v",
  category: "selection",
  multiSelect: true,
};

export default selectTool;
