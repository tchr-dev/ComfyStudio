import { useMemo } from "react";

import { Editor } from "~/Editor";
import { Generation } from "~/Generation";

export function PromptPanel({ inputId }: { inputId: ID }) {
  const [activeTool] = Editor.Tool.Active.use();

  const placeholders = useMemo(() => {
    switch (activeTool) {
      case "select":
        return {
          positive: "What do you want to select?",
          negative: "What should be excluded?",
        };
      case "replace-background":
        return {
          positive:
            "Describe the world behind your subject: mood, place, lighting.",
          negative: "What should the background avoid?",
        };
      default:
        return undefined;
    }
  }, [activeTool]);

  return (
    <Generation.Image.Prompt.Sidebar.Section
      id={inputId}
      placeholders={placeholders}
    />
  );
}
