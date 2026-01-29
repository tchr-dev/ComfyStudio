import { App } from "~/App";
import { Editor } from "~/Editor";
import { ToolRegistry } from "~/Tools/Registry";
import { SettingRenderer } from "~/Tools/SettingRenderer";

export namespace Sidebar {
  export function Section() {
    const [toolId] = Editor.Tool.Active.use();
    const [tool, setTool] = useState<Awaited<
      ReturnType<typeof ToolRegistry.get>
    > | null>(null);
    const [customPanel, setCustomPanel] = useState<React.ComponentType | null>(
      null
    );
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      let cancelled = false;
      setLoading(true);

      const loadTool = async () => {
        try {
          // Load tool definition
          const toolDef = await ToolRegistry.get(toolId);
          if (cancelled) return;

          setTool(toolDef);

          // Try to load custom implementation
          try {
            const implementation = await ToolRegistry.getImplementation(toolId);
            if (cancelled) return;

            if (implementation?.SettingsPanel) {
              setCustomPanel(() => implementation.SettingsPanel);
            } else {
              setCustomPanel(null);
            }
          } catch {
            // No custom implementation, use declarative settings
            setCustomPanel(null);
          }
        } catch (error) {
          if (cancelled) return;
          console.error(`Failed to load tool "${toolId}":`, error);
          setTool(null);
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

      loadTool();

      return () => {
        cancelled = true;
      };
    }, [toolId]);

    return useMemo(() => {
      // Still loading
      if (loading) return null;

      // Tool not found
      if (!tool) return null;

      // Custom panel has priority
      if (customPanel) {
        const CustomPanel = customPanel;
        return <CustomPanel />;
      }

      // No settings to render
      if (!tool.settings || tool.settings.length === 0) {
        return null;
      }

      // Render declarative settings
      return (
        <App.Sidebar.Section
          title={`${tool.name} settings`}
          defaultExpanded
          collapsable
          divider
        >
          <div className="flex w-full flex-col gap-2">
            {tool.settings.map((setting) => (
              <SettingRenderer
                key={setting.id}
                toolId={toolId}
                setting={setting}
              />
            ))}
          </div>
        </App.Sidebar.Section>
      );
    }, [loading, tool, customPanel, toolId]);
  }
}
