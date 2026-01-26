import React, { useEffect, useState } from "react";

import { DockLayoutState, DockState } from "./State";

export function DockLayout({ children }: React.PropsWithChildren) {
  const [layout, setLayout] = useState<DockLayoutState>(() =>
    DockState.load()
  );

  useEffect(() => {
    DockState.save(layout);
  }, [layout]);

  return (
    <div className="flex h-full w-full gap-3" data-dock-layout>
      {children}
    </div>
  );
}
