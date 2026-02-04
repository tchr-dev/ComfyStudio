import { useEffect, useState } from "react";

import { Editor } from "~/Editor";
import { Theme } from "~/Theme";
import { ToolRegistry } from "~/Tools/Registry";
import { ToolDefinition } from "~/Tools/Types";

export function ToolsPanel() {
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [activeTool] = Editor.Tool.Active.use();
  const setActiveTool = Editor.Tool.Active.useSet();

  useEffect(() => {
    let active = true;
    ToolRegistry.list().then((result) => {
      if (active) setTools(result);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="inline-flex h-full max-h-full w-fit flex-col flex-wrap content-start items-start gap-1 p-2">
      {tools.length === 0 ? (
        <div className="text-sm text-muted-white">
          No tools available yet.
        </div>
      ) : (
        tools.map((tool) => {
          const isActive = activeTool === tool.id;
          const IconComponent = Theme.Icon[tool.icon as keyof typeof Theme.Icon] as React.ComponentType<Theme.Icon.Props>;

          return (
            <div
              key={tool.id}
              onClick={() => setActiveTool(tool.id as Editor.Tool.Active)}
              title={`${tool.name} ${tool.shortcut ? `(${tool.shortcut})` : ""}`}
              className={classes(
                "flex h-11 w-11 cursor-pointer items-center justify-center rounded-md border transition-all duration-150 relative group",
                isActive
                  ? "border-brand-500 bg-brand-500/10 text-brand-500"
                  : "border-transparent text-zinc-400 hover:bg-white/5 hover:text-white"
              )}
            >
              {IconComponent && (
                <IconComponent
                  size={20}
                  className="transition-transform duration-150 group-hover:scale-105"
                />
              )}
              {tool.shortcut && (
                <div className="absolute bottom-0.5 right-0.5 text-[10px] text-zinc-500 opacity-50">
                  {tool.shortcut}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
