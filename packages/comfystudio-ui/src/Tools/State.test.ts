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

  it("preserves existing values when initializing defaults", async () => {
    // First, set a custom value
    const { result } = renderHook(() =>
      ToolState.useToolSetting("brush", "size")
    );

    act(() => {
      result.current[1](100); // User sets size to 100
    });

    expect(result.current[0]).toBe(100);

    // Now initialize defaults (size: 20, blur: 5)
    await act(async () => {
      await ToolState.initializeDefaults("brush", { size: 20, blur: 5 });
    });

    // The existing value (100) should be preserved, NOT overwritten with default (20)
    expect(result.current[0]).toBe(100);

    // But new defaults should be set for settings that don't exist yet
    const { result: blurResult } = renderHook(() =>
      ToolState.useToolSetting("brush", "blur")
    );
    expect(blurResult.current[0]).toBe(5);
  });
});
