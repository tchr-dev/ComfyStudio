import React from "react";

export function Panel({
  title,
  open = true,
  children,
  className,
}: React.PropsWithChildren<{ title: string; open?: boolean; className?: string }>) {
  if (!open) return null;

  return (
    <section
      className={`flex flex-col rounded border border-zinc-800 bg-zinc-900/60 ${className || ""}`}
      data-dock-panel
    >
      <div className="border-b border-zinc-800 px-3 py-2 text-sm text-muted-white">
        {title}
      </div>
      <div className="flex-1 min-h-0 p-3">{children}</div>
    </section>
  );
}
