import { ToolDefinition, ToolImplementation, ToolSummary } from "./Types";

// Internal: Load all tool definitions
const loadDefinitions = async (): Promise<ToolDefinition[]> => {
  const definitionModules = import.meta.glob<{
    default: ToolDefinition;
  }>("./definitions/*.ts", { eager: false });

  const definitions: ToolDefinition[] = [];

  for (const path in definitionModules) {
    try {
      const module = await definitionModules[path]();
      if (module.default) {
        definitions.push(module.default);
      }
    } catch (error) {
      console.error(`Failed to load tool definition from ${path}:`, error);
    }
  }

  return definitions;
};

export namespace ToolRegistry {
  // Load all tool definitions
  export const list = async (): Promise<ToolDefinition[]> => {
    return await loadDefinitions();
  };

  // Get specific tool by ID
  export const get = async (id: string): Promise<ToolDefinition | null> => {
    const tools = await list();
    return tools.find((tool) => tool.id === id) || null;
  };

  // Load tool implementation by ID (convention-based)
  export const getImplementation = async (
    id: string
  ): Promise<ToolImplementation> => {
    try {
      const module = await import(`./implementations/${id}.ts`);
      return module.default || module;
    } catch (error) {
      throw new Error(
        `Failed to load implementation for tool "${id}": ${error}`
      );
    }
  };

  // Convert to ToolSummary for backward compatibility
  export const listSummaries = async (): Promise<ToolSummary[]> => {
    const tools = await list();
    return tools.map((tool) => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
    }));
  };
}
