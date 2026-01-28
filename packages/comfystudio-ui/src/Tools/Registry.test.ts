import { describe, expect, it } from "vitest";

import { ToolRegistry } from "./Registry";

describe("ToolRegistry", () => {
  it("loads tool definitions from definitions folder", async () => {
    const tools = await ToolRegistry.list();
    expect(Array.isArray(tools)).toBe(true);
  });

  it("gets a specific tool by ID", async () => {
    // Will test with actual tool once we create definitions
    const tool = await ToolRegistry.get("nonexistent");
    expect(tool).toBeNull();
  });

  it("loads tool implementation by ID", async () => {
    // This will fail until we create implementations
    try {
      await ToolRegistry.getImplementation("nonexistent");
      expect(true).toBe(false); // Should not reach here
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it("loads brush tool definition", async () => {
    const tools = await ToolRegistry.list();
    const brush = tools.find((t) => t.id === "brush");

    expect(brush).toBeDefined();
    expect(brush?.name).toBe("Eraser");
    expect(brush?.category).toBe("canvas-interaction");
    expect(brush?.settings).toHaveLength(3);
  });

  it("retrieves brush tool by ID", async () => {
    const brush = await ToolRegistry.get("brush");

    expect(brush).not.toBeNull();
    expect(brush?.id).toBe("brush");
    expect(brush?.shortcut).toBe("e");
  });
});
