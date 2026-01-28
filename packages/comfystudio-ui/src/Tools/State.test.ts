// packages/comfystudio-ui/src/Tools/State.test.ts
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { ToolState } from "./State";

describe("ToolState", () => {
  beforeEach(() => {
    ToolState.reset();
  });
  it("stores and retrieves tool settings", () => {
    const { result } = renderHook(() =>
      ToolState.useToolSetting("brush", "size")
    );

    expect(result.current[0]).toBeUndefined();

    act(() => {
      result.current[1](50);
    });

    expect(result.current[0]).toBe(50);
  });

  it("isolates settings between different tools", () => {
    const { result: brush } = renderHook(() =>
      ToolState.useToolSetting("brush", "size")
    );
    const { result: select } = renderHook(() =>
      ToolState.useToolSetting("select", "size")
    );

    act(() => {
      brush.current[1](50);
    });

    expect(brush.current[0]).toBe(50);
    expect(select.current[0]).toBeUndefined();
  });

  it("initializes tool settings with defaults", async () => {
    const defaults = { size: 20, blur: 5 };
    await ToolState.initializeDefaults("brush", defaults);

    const { result } = renderHook(() =>
      ToolState.useToolSetting("brush", "size")
    );

    expect(result.current[0]).toBe(20);
  });
});
