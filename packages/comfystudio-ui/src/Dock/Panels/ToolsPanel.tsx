import { useEffect, useState } from "react";

import { ToolRegistry } from "~/Tools/Registry";
import { ToolSummary } from "~/Tools/Types";

export function ToolsPanel() {
  const [tools, setTools] = useState<ToolSummary[]>([]);

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
        tools.map((tool) => (
          <div key={tool.id} className="rounded border border-zinc-800 p-2">
            <div className="text-sm text-white">{tool.name}</div>
            {tool.description && (
              <div className="text-xs text-muted-white">
                {tool.description}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
