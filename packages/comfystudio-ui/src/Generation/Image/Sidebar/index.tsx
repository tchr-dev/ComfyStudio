import { App } from "~/App";
import { AdvancedPanel } from "~/Dock/Panels/AdvancedPanel";
import { InputPanel } from "~/Dock/Panels/InputPanel";
import { PromptPanel } from "~/Dock/Panels/PromptPanel";
import { SettingsPanel } from "~/Dock/Panels/SettingsPanel";
import { getToolPanelVisibility } from "~/Dock/panelVisibility";
import { Editor } from "~/Editor";
import { Generation } from "~/Generation";

export function Sidebar() {
  const { input } = Generation.Image.Session.useCurrentInput();
  if (!input?.id) return null;
  return <Sidebar.Tab id={input.id} />;
}

export namespace Sidebar {
  export function Tab({
    id,
    variant = "generate",
  }: {
    id: ID;
    variant?: "generate" | "editor";
  }) {
    const [settingsOpen, setSettingsOpen] = useState(true);
    const areStylesEnabled = Generation.Image.Styles.useAreEnabled();
    const [activeTool] = Editor.Tool.Active.use();
    const panelVisibility = useMemo(
      () => getToolPanelVisibility(activeTool),
      [activeTool]
    );
    return (
      <>
        {areStylesEnabled && (
          <App.Sidebar.Section divider defaultExpanded padding="sm">
            <div className="flex flex-col gap-2">
              <Generation.Image.Style.Dropdown id={id} />
            </div>
          </App.Sidebar.Section>
        )}
        {panelVisibility.prompt && <PromptPanel inputId={id} />}
        {variant === "generate" && panelVisibility.input && (
          <InputPanel inputId={id} />
        )}
        {panelVisibility.settings && (
          <App.Sidebar.Section
            divider={false}
            collapsable
            defaultExpanded
            title="Settings"
            onChange={setSettingsOpen}
          >
            <SettingsPanel inputId={id} showSize={variant === "generate"} />
          </App.Sidebar.Section>
        )}
        {settingsOpen && panelVisibility.advanced && (
          <AdvancedPanel inputId={id} />
        )}
      </>
    );
  }
}
