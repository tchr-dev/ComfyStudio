import { App } from "~/App";
import { Editor } from "~/Editor";
import { ToolRegistry } from "~/Tools/Registry";
import { SettingRenderer } from "~/Tools/SettingRenderer";
import { useTriggerExecution, type WorkflowTool } from "~/Tools";

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
              setCustomPanel(() => implementation.SettingsPanel!);
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

            {/* Trigger button for workflow tools */}
            {tool.category === "workflow" && (
              <TriggerButton toolId={toolId} toolName={tool.name} />
            )}
          </div>
        </App.Sidebar.Section>
      );
    }, [loading, tool, customPanel, toolId]);
  }

  /**
   * Trigger button for workflow tools
   *
   * Dispatches execution command to service.
   */
  function TriggerButton({
    toolId,
    toolName,
  }: {
    toolId: string;
    toolName: string;
  }) {
    const { trigger, isTriggering, lastError } = useTriggerExecution(toolId);

    const handleTrigger = async () => {
      const result = await trigger();

      if (result.ok) {
        console.info(
          `[Tool] Started execution: ${result.executionId} (job: ${result.jobId})`
        );
        // TODO: Add toast notification when toast system is integrated
      } else {
        console.error(`[Tool] Failed to start execution:`, result.error);
        // TODO: Add error toast when toast system is integrated
      }
    };

    return (
      <div className="flex w-full flex-col gap-2 pt-2">
        <button
          onClick={handleTrigger}
          disabled={isTriggering}
          className={classes(
            "w-full rounded-md px-4 py-2 font-medium text-white transition-colors",
            isTriggering
              ? "cursor-not-allowed bg-blue-400"
              : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700"
          )}
        >
          {isTriggering ? `Starting ${toolName}...` : `Start ${toolName}`}
        </button>

        {lastError && (
          <div className="text-xs text-red-500">
            Error: {lastError}
          </div>
        )}
      </div>
    );
  }
}
