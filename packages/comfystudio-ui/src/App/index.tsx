import { DockLayout } from "~/Dock/DockLayout";
import { Router } from "~/Router";
import { Shortcut } from "~/Shortcut";
import { Theme } from "~/Theme";

import { BottomBar } from "./BottomBar";
import { Providers } from "./Providers";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function App() {
  const isMobileDevice = Theme.useIsMobileDevice();
  return useMemo(
    () => (
      <Providers>
        <div className="absolute top-0 left-0 -z-50 h-screen w-screen dark:bg-zinc-800" />
        <div className="absolute top-0 left-0 flex h-screen w-screen flex-col text-white sm:overflow-x-auto">
          <Shortcut.Palette />
          <TopBar />
          <div className="flex min-h-0 grow overflow-auto sm:min-w-[1000px]">
            <Sidebar position="left">
              <DockLayout side="left" />
            </Sidebar>
            <div className="shrink grow overflow-y-auto">
              <Router />
            </div>
            <Sidebar position="right">
              <DockLayout side="right" />
            </Sidebar>
          </div>
          {isMobileDevice && <BottomBar />}
        </div>
      </Providers>
    ),
    [isMobileDevice]
  );
}

export declare namespace App {
  export { Sidebar, TopBar };
}

export namespace App {
  App.Sidebar = Sidebar;
  App.TopBar = TopBar;
}
