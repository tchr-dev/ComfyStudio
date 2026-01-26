export type DockPanelState = {
  id: string;
  column: "left" | "right";
  order: number;
  open: boolean;
};

export type DockLayoutState = {
  panels: DockPanelState[];
};

export namespace DockState {
  const STORAGE_KEY = "dock-layout.v1";

  export const createDefault = (): DockLayoutState => ({
    panels: [
      {
        id: "tools",
        column: "left",
        order: 0,
        open: true,
      },
    ],
  });

  export const load = (): DockLayoutState => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefault();
    try {
      return JSON.parse(raw) as DockLayoutState;
    } catch {
      return createDefault();
    }
  };

  export const save = (state: DockLayoutState): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  export const isPanelVisible = (
    panelId: string,
    ctx: { activeTool?: string }
  ): boolean => {
    if (panelId === "editor-tool") return ctx.activeTool === "brush";
    return true;
  };
}
