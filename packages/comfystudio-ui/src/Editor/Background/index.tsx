import { Editor } from "~/Editor";

export namespace Background {
  export const useSelectedImage = () => {
    const selectedID = Editor.Selection.OnlyOne.use();
    const entities = Editor.Entities.use();
    const image = useMemo(
      () =>
        selectedID
          ? (entities.get(selectedID) as Editor.Image | undefined)
          : undefined,
      [entities, selectedID]
    );
    return { selectedID, image };
  };

  export const useMockDuplicate = (label: string) => {
    const { image } = useSelectedImage();
    const createImage = Editor.Image.Create.useFromURL();

    return useCallback(async () => {
      if (!image || !image.element?.src) return;
      await createImage(image.element.src, {
        ...image,
        id: ID.create(),
        title: `${image.title ?? "Image"} (${label})`,
        x: image.x + 20,
        y: image.y + 20,
      });
    }, [image, createImage, label]);
  };
}
