import React, { useEffect, useState } from "react";

import { Editor } from "~/Editor";
import { Generation } from "~/Generation";

import { ToolsPanel } from "./Panels/ToolsPanel";
import { AdvancedPanel } from "./Panels/AdvancedPanel";
import { EditorToolPanel } from "./Panels/EditorToolPanel";
import { InputPanel } from "./Panels/InputPanel";
import { LayersPanel } from "./Panels/LayersPanel";
import { PromptPanel } from "./Panels/PromptPanel";
import { Column } from "./Column";
import { Panel } from "./Panel";
import { DockLayoutState, DockState } from "./State";

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

  useEffect(() => {
    DockState.save(layout);
  }, [layout]);

  const leftColumn = (
    <Column position="left">
      <Panel title="Tools">
        <ToolsPanel />
      </Panel>
      <Panel
        title="Editor"
        open={DockState.isPanelVisible("editor-tool", { activeTool })}
      >
        <EditorToolPanel />
      </Panel>
      {input?.id && (
        <>
          <Panel title="Prompt">
            <PromptPanel inputId={input.id} />
          </Panel>
          <Panel title="Input">
            <InputPanel inputId={input.id} />
          </Panel>
          <Panel title="Settings">
            <div className="flex flex-col gap-4">
              <Generation.Image.Size id={input.id} />
              <Generation.Image.Count.Slider />
            </div>
          </Panel>
          <Panel title="Advanced">
            <AdvancedPanel inputId={input.id} />
          </Panel>
        </>
      )}
    </Column>
  );

  const rightColumn = (
    <Column position="right">
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
