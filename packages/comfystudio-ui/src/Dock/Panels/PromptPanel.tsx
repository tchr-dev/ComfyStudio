import { Generation } from "~/Generation";

export function PromptPanel({ inputId }: { inputId: ID }) {
  return <Generation.Image.Prompt.Sidebar.Section id={inputId} />;
}
