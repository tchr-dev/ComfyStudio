import { Editor } from "~/Editor";
import { Theme } from "~/Theme";

export function Rail() {
  const tools = Editor.EditTool.getEnabled();
  const { active, setActive } = Editor.EditTool.useActive();

  return (
    <div className="flex flex-col gap-2 px-2 py-3">
      {tools.map((tool) => (
        <Theme.Button
          key={tool.id}
          icon={tool.icon}
          active={tool.id === active}
          onClick={() => setActive(tool.id)}
          className="h-10 w-10"
        />
      ))}
    </div>
  );
}
