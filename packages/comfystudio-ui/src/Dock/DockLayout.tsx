import React from "react";

export function DockLayout({ children }: React.PropsWithChildren) {
  return <div className="flex h-full w-full gap-3">{children}</div>;
}
