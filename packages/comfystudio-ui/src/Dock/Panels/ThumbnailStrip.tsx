import { Generation } from "~/Generation";
import { ThumbnailList } from "./ThumbnailList";

export function ThumbnailStrip() {
    return (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-50 flex items-end justify-center">
            <div className="pointer-events-auto flex max-h-32 max-w-[80%] flex-col gap-2 rounded-t-lg bg-zinc-900/90 p-4 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-medium uppercase text-muted-white">
                        Generation History
                    </h3>
                    <div className="flex gap-2">
                        {/* Controls for history could go here */}
                    </div>
                </div>
                <div className="flex overflow-x-auto scrollbar-hide">
                    <ThumbnailList />
                </div>
            </div>
        </div>
    );
}
