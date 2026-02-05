import React from "react";
import { Theme } from "~/Theme";

import { Rail as EditToolRail } from "./Rail";
import { Editor } from "~/Editor";

export type EditToolDefinition = {
  id: "remove-background" | "replace-background";
  label: string;
  icon: Theme.Icon.Prop;
  enabled: boolean;
};

const registry: EditToolDefinition[] = [
  {
    id: "remove-background",
    label: "Remove BG",
    icon: Theme.Icon.Eraser,
    enabled: true,
  },
  {
    id: "replace-background",
    label: "Replace BG",
    icon: Theme.Icon.Edit,
    enabled: true,
  },
];

export namespace EditTool {
  export const getEnabled = () => registry.filter((tool) => tool.enabled);
  export const Rail = EditToolRail;
}
