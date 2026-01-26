import React from "react";

export function Panel({
  title,
  children,
}: React.PropsWithChildren<{ title: string }>) {
  return (
    <section className="rounded border border-zinc-800 bg-zinc-900/60">
      <div className="border-b border-zinc-800 px-3 py-2 text-sm text-muted-white">
        {title}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}
