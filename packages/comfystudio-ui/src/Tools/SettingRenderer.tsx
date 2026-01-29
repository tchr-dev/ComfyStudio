// packages/comfystudio-ui/src/Tools/SettingRenderer.tsx
import { useEffect } from "react";

import { Theme } from "~/Theme";

import { ToolState } from "./State";
import type { ToolSetting } from "./Types";

type SettingRendererProps = {
  setting: ToolSetting;
  toolId: string;
};

export function SettingRenderer({ setting, toolId }: SettingRendererProps) {
  const [value, setValue] = ToolState.useToolSetting(toolId, setting.id);

  // Initialize with default if no value set
  useEffect(() => {
    if (value === undefined) {
      ToolState.initializeDefaults(toolId, { [setting.id]: setting.default });
    }
  }, [value, setting.default, toolId, setting.id]);

  switch (setting.type) {
    case "slider":
      return (
        <div className="flex flex-col gap-1">
          {setting.description && (
            <p className="text-xs text-muted-white">{setting.description}</p>
          )}
          <Theme.Slider
            title={setting.label}
            min={setting.min}
            max={setting.max}
            step={setting.step ?? 1}
            value={value ?? setting.default}
            onChange={(newValue) => setValue(newValue)}
          />
        </div>
      );

    case "text":
      return (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-white">
            {setting.label}
          </label>
          {setting.description && (
            <p className="text-xs text-muted-white">{setting.description}</p>
          )}
          <Theme.Input
            value={value ?? setting.default}
            onChange={(newValue) => setValue(newValue)}
            placeholder={setting.placeholder}
          />
        </div>
      );

    case "textarea":
      return (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-white">
            {setting.label}
          </label>
          {setting.description && (
            <p className="text-xs text-muted-white">{setting.description}</p>
          )}
          <Theme.Input
            autoSize
            value={value ?? setting.default}
            onChange={(newValue) => setValue(newValue)}
            placeholder={setting.placeholder}
          />
        </div>
      );

    case "dropdown":
      return (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-white">
            {setting.label}
          </label>
          {setting.description && (
            <p className="text-xs text-muted-white">{setting.description}</p>
          )}
          <Theme.Dropdown
            value={value ?? setting.default}
            options={setting.options}
            onChange={(item) => setValue(item.value)}
          />
        </div>
      );

    case "checkbox":
      return (
        <div className="flex flex-col gap-1">
          {setting.description && (
            <p className="text-xs text-muted-white">{setting.description}</p>
          )}
          <Theme.Checkbox
            label={setting.label}
            value={value ?? setting.default}
            onChange={(newValue) => setValue(newValue)}
          />
        </div>
      );

    case "custom":
      // Custom components would be registered separately
      return (
        <div className="text-sm text-muted-white">
          Custom component: {setting.component}
        </div>
      );

    default:
      return null;
  }
}
