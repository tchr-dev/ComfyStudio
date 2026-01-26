import React from "react";

import { GlobalState } from "~/GlobalState";
import { Theme } from "~/Theme";

export type EditToolDefinition = {
  id: "remove-bg" | "replace-bg";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
};

const registry: EditToolDefinition[] = [
  {
    id: "remove-bg",
    label: "Remove BG",
    icon: Theme.Icon.Eraser,
    enabled: true,
  },
  {
    id: "replace-bg",
    label: "Replace BG",
    icon: Theme.Icon.Edit,
    enabled: true,
  },
];

export namespace EditTool {
  export const getEnabled = () => registry.filter((tool) => tool.enabled);

  export type Active = EditToolDefinition["id"] | undefined;
  export const useActive = GlobalState.create<{
    active?: Active;
    setActive: (active?: Active) => void;
  }>((set) => ({
    active: undefined,
    setActive: (active) => set({ active }),
  }));
}
