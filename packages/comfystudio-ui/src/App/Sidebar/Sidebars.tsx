import { App } from "~/App";
import { DockLayout } from "~/Dock/DockLayout";
import { useEffect } from "react";

export function Sidebars() {
  const [, setLeftSidebar] = App.Sidebar.use("left");

  useEffect(() => {
    setLeftSidebar((sidebar) => ({ ...sidebar, tab: "Dock", visible: true }));
  }, [setLeftSidebar]);

  return (
    <App.Sidebar.Tab.Set
      name="Dock"
      position="left"
      enabled
      button={false}
    >
      <DockLayout />
    </App.Sidebar.Tab.Set>
  );
}
