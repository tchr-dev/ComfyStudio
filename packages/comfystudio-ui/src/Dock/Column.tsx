import React from "react";

export function Column({
  position,
  children,
}: React.PropsWithChildren<{ position: "left" | "right" }>) {
  return (
    <div
      className="flex h-full w-full flex-col gap-2"
      data-dock-column={position}
    >
      {children}
    </div>
  );
}
