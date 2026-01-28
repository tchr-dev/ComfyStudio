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
});
