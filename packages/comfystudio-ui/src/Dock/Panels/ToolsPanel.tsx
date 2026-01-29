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
    <div className="flex flex-col gap-2">
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
              className={classes(
                "cursor-pointer rounded border p-3 transition-colors",
                isActive
                  ? "border-brand-500 bg-brand-500/10"
                  : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50"
              )}
            >
              <div className="flex items-start gap-3">
                {IconComponent && (
                  <div className="shrink-0 pt-0.5">
                    <IconComponent
                      size={18}
                      className={isActive ? "text-brand-500" : "text-zinc-400"}
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-sm font-medium text-white">
                      {tool.name}
                    </div>
                    {tool.shortcut && (
                      <div className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
                        {tool.shortcut}
                      </div>
                    )}
                  </div>
                  {tool.description && (
                    <div className="mt-1 text-xs text-muted-white">
                      {tool.description}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
