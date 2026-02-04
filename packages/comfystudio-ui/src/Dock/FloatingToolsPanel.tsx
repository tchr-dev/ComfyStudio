import { Editor } from "~/Editor";
import { ToolsPanel } from "./Panels/ToolsPanel";
import { Generation } from "~/Generation";
import { Theme } from "~/Theme";

export function FloatingToolsPanel() {
    const createDream = Generation.Image.Session.useCreateDream();

    return (
        <div className="pointer-events-none absolute left-4 top-20 z-50 flex flex-col gap-4">
            <div className="pointer-events-auto rounded-lg bg-zinc-900/90 p-1 shadow-xl backdrop-blur-md border border-zinc-800">
                <ToolsPanel />
            </div>

            <div className="pointer-events-auto">
                <Theme.Tooltip content="Generate Image (Cmd+Enter)" placement="right">
                    <button
                        onClick={() => createDream()}
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg hover:bg-brand-400 transition-all hover:scale-105 active:scale-95"
                    >
                        <Theme.Icon.Sparkles size={24} />
                    </button>
                </Theme.Tooltip>
            </div>
        </div>
    );
}
