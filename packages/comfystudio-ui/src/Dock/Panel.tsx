import React from "react";

export function Panel({
  title,
  open = true,
  children,
}: React.PropsWithChildren<{ title: string; open?: boolean }>) {
  if (!open) return null;

  return (
    <section
      className="rounded border border-zinc-800 bg-zinc-900/60"
      data-dock-panel
    >
      <div className="border-b border-zinc-800 px-3 py-2 text-sm text-muted-white">
        {title}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}
