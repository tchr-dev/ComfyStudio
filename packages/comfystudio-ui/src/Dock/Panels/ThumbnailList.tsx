import { useMemo, useCallback } from "react";
import { Generation } from "~/Generation";
import { Theme } from "~/Theme";
import { Editor } from "~/Editor";

export function ThumbnailList() {
    const outputs = Generation.Image.Outputs.use();

    // Reverse to show newest first
    const reversedOutputs = useMemo(() => [...outputs].reverse(), [outputs]);

    return (
        <div className="flex h-full items-center gap-4 px-2">
            {reversedOutputs.map((output) => (
                <BatchGroup key={output.id} outputID={output.id} />
            ))}
            {reversedOutputs.length === 0 && (
                <div className="flex w-full items-center justify-center p-4 text-xs text-muted-white">
                    No generations yet. Use the prompt to generate images.
                </div>
            )}
        </div>
    );
}

function BatchGroup({ outputID }: { outputID: string }) {
    const output = Generation.Image.Output.use(outputID);
    const images = Generation.Images.useFromIDs(...(output?.imageIDs ?? []));
    const isGenerating = Generation.Image.Output.useIsGenerating(outputID);

    if (!output || (!images.length && !isGenerating)) return null;

    return (
        <div className="flex items-center gap-2 border-r border-white/10 pr-4 last:border-0">
            {images.map((image) => (
                <Thumbnail key={image.id} image={image} />
            ))}
            {isGenerating && (
                <div className="flex h-20 w-20 items-center justify-center rounded bg-white/5">
                    <Theme.Icon.Loader className="animate-spin text-muted-white" />
                </div>
            )}
        </div>
    );
}

function Thumbnail({ image }: { image: Generation.Image }) {
    const create = Editor.Image.Create.useFromURL();

    const onClick = useCallback(
        () => {
            if (image.src) {
                create(image.src);
            }
        },
        [create, image.src]
    );

    return (
        <div
            className="group relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded border border-transparent hover:border-brand-500"
            onClick={onClick}
        >
            <Generation.Image
                image={image}
                className="h-full w-full object-cover"
            />
        </div>
    );
}
