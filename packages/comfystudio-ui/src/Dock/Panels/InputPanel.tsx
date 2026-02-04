import { useCallback, useMemo, useState } from "react";

import { Editor } from "~/Editor";
import { Generation } from "~/Generation";
import { Theme } from "~/Theme";

type InputPanelConfig = {
  copy?: {
    title?: string;
    titleWithImage?: string;
    emptyIdle?: string;
    emptyHover?: string;
  };
  showStrength?: boolean;
  helper?: React.ReactNode;
};

export function InputPanel({ inputId }: { inputId: ID }) {
  const [activeTool] = Editor.Tool.Active.use();

  const config = useMemo<InputPanelConfig>(() => {
    switch (activeTool) {
      case "select":
        return {
          copy: {
            title: "Upload selection mask",
            titleWithImage: "Selection mask",
            emptyIdle: "Upload a selection mask to guide the selection",
            emptyHover: "Drop a selection mask here",
          },
          showStrength: false,
        };
      case "replace-background":
        return {
          copy: {
            title: "Upload image for background",
            titleWithImage: "Background image",
            emptyIdle: "Upload an image to replace the background",
            emptyHover: "Drop an image here to replace the background",
          },
        };
      case "remove-background":
        return {
          copy: {
            title: "Upload image for background removal",
            titleWithImage: "Background removal",
            emptyIdle: "Upload an image to remove the background",
            emptyHover: "Drop an image here to remove the background",
          },
          helper: <RemoveBackgroundTips />,
        };
      default:
        return {};
    }
  }, [activeTool]);

  return (
    <Generation.Image.Input.Image.Sidebar.Section
      id={inputId}
      copy={config.copy}
      showStrength={config.showStrength}
      helper={config.helper}
    />
  );
}

const REMOVE_BG_TIPS_KEY = "tips.remove-background.v1";

function RemoveBackgroundTips() {
  const [expanded, setExpanded] = useState(() => {
    const storageAvailable =
      typeof window !== "undefined" && typeof localStorage !== "undefined";
    if (!storageAvailable) return true;
    const stored = localStorage.getItem(REMOVE_BG_TIPS_KEY);
    if (!stored) {
      localStorage.setItem(REMOVE_BG_TIPS_KEY, "seen");
      return true;
    }
    if (stored === "seen") return false;
    return stored !== "collapsed";
  });

  const toggleExpanded = useCallback(() => {
    setExpanded((current) => {
      const next = !current;
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        localStorage.setItem(
          REMOVE_BG_TIPS_KEY,
          next ? "expanded" : "collapsed"
        );
      }
      return next;
    });
  }, []);

  return (
    <div className="rounded border border-zinc-700 bg-zinc-900/60 p-2">
      <button
        type="button"
        onClick={toggleExpanded}
        className="flex w-full items-center justify-between text-xs font-medium text-zinc-200"
      >
        <span>Tips</span>
        <Theme.Icon.ChevronDown
          size={14}
          className={classes(
            "transition-transform",
            !expanded && "-rotate-90"
          )}
        />
      </button>
      {expanded && (
        <div className="mt-2 flex flex-col gap-2 text-xs text-muted-white">
          <div>Use a clear subject with strong contrast.</div>
          <div>Avoid motion blur, low light, or heavy compression.</div>
          <div>Busy backgrounds can cut into edges; zoom in to refine.</div>
          <div>Hair or fur will produce softer edges.</div>
        </div>
      )}
    </div>
  );
}
