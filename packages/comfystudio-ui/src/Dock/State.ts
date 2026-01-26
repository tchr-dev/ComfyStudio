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
}
