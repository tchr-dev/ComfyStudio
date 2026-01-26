import { describe, expect, it } from "vitest";

import { ToolRegistry } from "./Registry";

describe("ToolRegistry", () => {
  it("returns an empty list when no backend is configured", async () => {
    const tools = await ToolRegistry.list();
    expect(tools).toEqual([]);
  });
});
