import { ToolImplementation } from "../Types";

// Selection tool has no settings panel or custom canvas interactions.
// Selection state is managed globally via Editor.Selection.use().
// Individual entity click handlers manage selection behavior elsewhere.
const selectImplementation: ToolImplementation = {};

export default selectImplementation;
