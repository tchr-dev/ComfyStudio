// packages/comfystudio-ui/src/Tools/State.ts
// Test auto-format hook - this comment will test the formatting automation
import { useCallback } from "react";

import { GlobalState } from "~/GlobalState";

// Testing: This should get formatted
type ToolStateStore={settings:Record<string,Record<string,any>>;activeTool:string|null;};

const store = GlobalState.create<ToolStateStore>(() => ({
  settings: {},
  activeTool: null,
}));

export namespace ToolState {
  export const useToolSetting = (
    toolId: string,
    settingId: string
  ): [any, (value: any) => void] => {
    const value = store((state) => state.settings[toolId]?.[settingId]);

    const setValue = useCallback(
      (newValue: any) => {
        store.setState((state) => ({
          settings: {
            ...state.settings,
            [toolId]: {
              ...state.settings[toolId],
              [settingId]: newValue,
            },
          },
        }));
      },
      [toolId, settingId]
    );

    return [value, setValue];
  };

  export const useActiveTool = (): [
    string | null,
    (tool: string | null) => void
  ] => {
    const activeTool = store((state) => state.activeTool);
    const setActiveTool = useCallback((tool: string | null) => {
      store.setState({ activeTool: tool });
    }, []);

    return [activeTool, setActiveTool];
  };

  export const initializeDefaults = async (
    toolId: string,
    defaults: Record<string, any>
  ): Promise<void> => {
    store.setState((state) => {
      const existingSettings = state.settings[toolId] || {};
      const mergedSettings = { ...defaults, ...existingSettings };

      return {
        settings: {
          ...state.settings,
          [toolId]: mergedSettings,
        },
      };
    });
  };

  export const getToolSettings = (toolId: string): Record<string, any> => {
    return store.getState().settings[toolId] || {};
  };

  export const reset = (): void => {
    store.setState({
      settings: {},
      activeTool: null,
    });
  };
}
