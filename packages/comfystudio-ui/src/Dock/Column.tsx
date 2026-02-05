import React from "react";

export function Column({
  position,
  children,
  className,
}: React.PropsWithChildren<{ position: "left" | "right"; className?: string }>) {
  return (
    <div
      className={`flex h-full flex-col gap-2 ${className || "w-full"}`}
      data-dock-column={position}
    >
      {children}
    </div>
  );
}
