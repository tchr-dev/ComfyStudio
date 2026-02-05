import React, { useEffect, useMemo, useState } from "react";

import { Editor } from "~/Editor";
import { Generation } from "~/Generation";

import { ToolsPanel } from "./Panels/ToolsPanel";
import { AdvancedPanel } from "./Panels/AdvancedPanel";
import { EditorToolPanel } from "./Panels/EditorToolPanel";
import { InputPanel } from "./Panels/InputPanel";
import { LayersPanel } from "./Panels/LayersPanel";
import { PromptPanel } from "./Panels/PromptPanel";
import { SettingsPanel } from "./Panels/SettingsPanel";
import { Column } from "./Column";
import { Panel } from "./Panel";
import { DockLayoutState, DockState } from "./State";
import { getToolPanelVisibility } from "./panelVisibility";

export function DockLayout({
  side = "both",
}: {
  side?: "left" | "right" | "both";
}) {
  const [layout, setLayout] = useState<DockLayoutState>(() =>
    DockState.load()
  );
  const { input } = Generation.Image.Session.useCurrentInput();
  const [activeTool] = Editor.Tool.Active.use();
  const panelVisibility = useMemo(
    () => getToolPanelVisibility(activeTool),
    [activeTool]
  );

  useEffect(() => {
    DockState.save(layout);
  }, [layout]);

  const leftColumn = (
    <Column position="left" className="w-auto flex-none items-start">
      <Panel
        title="Tools"
        open={DockState.isPanelVisible("tools", { activeTool })}
        className="flex-1"
      >
        <ToolsPanel />
      </Panel>
    </Column>
  );

  const rightColumn = (
    <Column position="right" className="flex-1 min-w-0">
      <Panel
        title="Editor"
        open={DockState.isPanelVisible("editor-tool", { activeTool })}
      >
        <EditorToolPanel />
      </Panel>
      {input?.id && (
        <>
          {panelVisibility.prompt && (
            <Panel title="Prompt">
              <PromptPanel inputId={input.id} />
            </Panel>
          )}
          {panelVisibility.input && (
            <Panel title="Input">
              <InputPanel inputId={input.id} />
            </Panel>
          )}
          {panelVisibility.settings && (
            <Panel title="Settings">
              <SettingsPanel inputId={input.id} />
            </Panel>
          )}
          {panelVisibility.advanced && (
            <Panel title="Advanced">
              <AdvancedPanel inputId={input.id} />
            </Panel>
          )}
        </>
      )}
      <Panel title="Layers">
        <LayersPanel />
      </Panel>
    </Column>
  );

  if (side === "left") return leftColumn;
  if (side === "right") return rightColumn;

  return (
    <div className="flex h-full w-full gap-3" data-dock-layout>
      {leftColumn}
      {rightColumn}
    </div>
  );
}
