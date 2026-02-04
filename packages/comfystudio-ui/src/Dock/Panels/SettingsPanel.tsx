import { useState } from "react";

import { Editor } from "~/Editor";
import { Generation } from "~/Generation";
import { Theme } from "~/Theme";

export function SettingsPanel({
  inputId,
  showSize = true,
}: {
  inputId: ID;
  showSize?: boolean;
}) {
  const [activeTool] = Editor.Tool.Active.use();
  const isReplaceBackground = activeTool === "replace-background";
  const isSelect = activeTool === "select";

  if (isSelect) {
    return <SelectSettingsPlaceholder />;
  }

  const shouldShowSize = showSize && !isReplaceBackground;

  return (
    <div className="flex flex-col gap-4">
      {shouldShowSize && <Generation.Image.Size id={inputId} />}
      <Generation.Image.Count.Slider
        title={isReplaceBackground ? "Background variants" : "Image count"}
      />
      {isReplaceBackground && (
        <p className="text-xs text-muted-white">
          Variants will appear as new layers.
        </p>
      )}
    </div>
  );
}

function SelectSettingsPlaceholder() {
  const [feather, setFeather] = useState(24);

  return (
    <div className="flex flex-col gap-4">
      <Theme.Slider
        title="Selection feather"
        min={0}
        max={100}
        value={feather}
        onChange={setFeather}
      />
    </div>
  );
}
