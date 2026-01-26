import { App } from "~/App";
import { AdvancedPanel } from "~/Dock/Panels/AdvancedPanel";
import { InputPanel } from "~/Dock/Panels/InputPanel";
import { PromptPanel } from "~/Dock/Panels/PromptPanel";
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
    return (
      <>
        {areStylesEnabled && (
          <App.Sidebar.Section divider defaultExpanded padding="sm">
            <div className="flex flex-col gap-2">
              <Generation.Image.Style.Dropdown id={id} />
            </div>
          </App.Sidebar.Section>
        )}
        <PromptPanel inputId={id} />
        {variant === "generate" && (
          <InputPanel inputId={id} />
        )}
        <App.Sidebar.Section
          divider={false}
          collapsable
          defaultExpanded
          title="Settings"
          onChange={setSettingsOpen}
        >
          <div className="flex flex-col gap-4">
            {variant === "generate" && <Generation.Image.Size id={id} />}
            <Generation.Image.Count.Slider />
          </div>
        </App.Sidebar.Section>
        {settingsOpen && <AdvancedPanel inputId={id} />}
      </>
    );
  }
}
