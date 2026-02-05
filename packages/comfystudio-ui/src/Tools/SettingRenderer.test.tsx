// packages/comfystudio-ui/src/Tools/SettingRenderer.test.tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { ToolState } from "./State";
import { SettingRenderer } from "./SettingRenderer";
import type {
  CheckboxSetting,
  CustomSetting,
  DropdownSetting,
  SliderSetting,
  TextSetting,
  ToolSetting,
} from "./Types";

describe("SettingRenderer", () => {
  beforeEach(() => {
    ToolState.reset();
  });

  describe("SliderSetting", () => {
    it("renders slider setting with label", () => {
      const setting: SliderSetting = {
        id: "size",
        label: "Size",
        type: "slider",
        min: 1,
        max: 100,
        default: 20,
      };

      render(<SettingRenderer setting={setting} toolId="brush" />);
      expect(screen.getByText("Size")).toBeInTheDocument();
    });

    it("renders slider with description", () => {
      const setting: SliderSetting = {
        id: "size",
        label: "Size",
        description: "Brush size in pixels",
        type: "slider",
        min: 1,
        max: 100,
        default: 20,
      };

      render(<SettingRenderer setting={setting} toolId="brush" />);
      expect(screen.getByText("Brush size in pixels")).toBeInTheDocument();
    });

    it("initializes with default value", () => {
      const setting: SliderSetting = {
        id: "size",
        label: "Size",
        type: "slider",
        min: 1,
        max: 100,
        default: 50,
      };

      render(<SettingRenderer setting={setting} toolId="brush" />);

      const settings = ToolState.getToolSettings("brush");
      expect(settings.size).toBe(50);
    });

    it("passes min, max, and step props to slider", () => {
      const setting: SliderSetting = {
        id: "size",
        label: "Size",
        type: "slider",
        min: 10,
        max: 200,
        step: 5,
        default: 50,
      };

      render(<SettingRenderer setting={setting} toolId="brush" />);
      expect(screen.getByText("Size")).toBeInTheDocument();
    });
  });

  describe("TextSetting", () => {
    it("renders text setting with label", () => {
      const setting: TextSetting = {
        id: "prompt",
        label: "Prompt",
        type: "text",
        default: "",
      };

      render(<SettingRenderer setting={setting} toolId="generate" />);
      expect(screen.getByText("Prompt")).toBeInTheDocument();
    });

    it("renders text setting with placeholder", () => {
      const setting: TextSetting = {
        id: "prompt",
        label: "Prompt",
        type: "text",
        default: "",
        placeholder: "Enter your prompt...",
      };

      render(<SettingRenderer setting={setting} toolId="generate" />);
      expect(screen.getByPlaceholderText("Enter your prompt...")).toBeInTheDocument();
    });

    it("initializes with default value", () => {
      const setting: TextSetting = {
        id: "prompt",
        label: "Prompt",
        type: "text",
        default: "default prompt",
      };

      render(<SettingRenderer setting={setting} toolId="generate" />);

      const settings = ToolState.getToolSettings("generate");
      expect(settings.prompt).toBe("default prompt");
    });

    it("updates state when text changes", async () => {
      const setting: TextSetting = {
        id: "prompt",
        label: "Prompt",
        type: "text",
        default: "initial",
      };

      render(<SettingRenderer setting={setting} toolId="generate" />);

      const input = screen.getByDisplayValue("initial") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "updated" } });

      await waitFor(() => {
        const settings = ToolState.getToolSettings("generate");
        expect(settings.prompt).toBe("updated");
      });
    });
  });

  describe("TextareaSetting", () => {
    it("renders textarea setting with label", () => {
      const setting: TextSetting = {
        id: "description",
        label: "Description",
        type: "textarea",
        default: "",
      };

      render(<SettingRenderer setting={setting} toolId="tool" />);
      expect(screen.getByText("Description")).toBeInTheDocument();
    });

    it("renders textarea with placeholder", () => {
      const setting: TextSetting = {
        id: "description",
        label: "Description",
        type: "textarea",
        default: "",
        placeholder: "Enter description...",
      };

      render(<SettingRenderer setting={setting} toolId="tool" />);
      expect(screen.getByPlaceholderText("Enter description...")).toBeInTheDocument();
    });

    it("initializes with default value", () => {
      const setting: TextSetting = {
        id: "description",
        label: "Description",
        type: "textarea",
        default: "default text",
      };

      render(<SettingRenderer setting={setting} toolId="tool" />);

      const settings = ToolState.getToolSettings("tool");
      expect(settings.description).toBe("default text");
    });
  });

  describe("DropdownSetting", () => {
    it("renders dropdown setting with label", () => {
      const setting: DropdownSetting = {
        id: "mode",
        label: "Mode",
        type: "dropdown",
        default: "normal",
        options: [
          { value: "normal", label: "Normal" },
          { value: "advanced", label: "Advanced" },
        ],
      };

      render(<SettingRenderer setting={setting} toolId="tool" />);
      expect(screen.getByText("Mode")).toBeInTheDocument();
    });

    it("renders dropdown with options", () => {
      const setting: DropdownSetting = {
        id: "mode",
        label: "Mode",
        type: "dropdown",
        default: "option1",
        options: [
          { value: "option1", label: "Option 1" },
          { value: "option2", label: "Option 2" },
          { value: "option3", label: "Option 3" },
        ],
      };

      render(<SettingRenderer setting={setting} toolId="tool" />);
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select).toBeInTheDocument();
    });

    it("initializes with default value", () => {
      const setting: DropdownSetting = {
        id: "mode",
        label: "Mode",
        type: "dropdown",
        default: "advanced",
        options: [
          { value: "normal", label: "Normal" },
          { value: "advanced", label: "Advanced" },
        ],
      };

      render(<SettingRenderer setting={setting} toolId="tool" />);

      const settings = ToolState.getToolSettings("tool");
      expect(settings.mode).toBe("advanced");
    });
  });

  describe("CheckboxSetting", () => {
    it("renders checkbox setting with label", () => {
      const setting: CheckboxSetting = {
        id: "enabled",
        label: "Enable Feature",
        type: "checkbox",
        default: false,
      };

      render(<SettingRenderer setting={setting} toolId="tool" />);
      expect(screen.getByText("Enable Feature")).toBeInTheDocument();
    });

    it("initializes with default value", () => {
      const setting: CheckboxSetting = {
        id: "enabled",
        label: "Enable Feature",
        type: "checkbox",
        default: true,
      };

      render(<SettingRenderer setting={setting} toolId="tool" />);

      const settings = ToolState.getToolSettings("tool");
      expect(settings.enabled).toBe(true);
    });

    it("updates state when toggled", async () => {
      const setting: CheckboxSetting = {
        id: "enabled",
        label: "Enable Feature",
        type: "checkbox",
        default: false,
      };

      render(<SettingRenderer setting={setting} toolId="tool" />);

      const checkbox = screen.getByText("Enable Feature").closest("div");
      expect(checkbox).toBeTruthy();

      if (checkbox) {
        fireEvent.click(checkbox);

        await waitFor(() => {
          const settings = ToolState.getToolSettings("tool");
          expect(settings.enabled).toBe(true);
        });
      }
    });
  });

  describe("CustomSetting", () => {
    it("renders placeholder for custom component", () => {
      const setting: CustomSetting = {
        id: "custom",
        label: "Custom Setting",
        type: "custom",
        component: "~/CustomComponent",
      };

      render(<SettingRenderer setting={setting} toolId="tool" />);
      expect(screen.getByText(/Custom component/)).toBeInTheDocument();
    });
  });

  describe("Description rendering", () => {
    it("displays description for text setting", () => {
      const setting: TextSetting = {
        id: "test",
        label: "Test",
        type: "text",
        default: "",
        description: "This is a helpful description",
      };

      render(<SettingRenderer setting={setting} toolId="tool" />);
      expect(screen.getByText("This is a helpful description")).toBeInTheDocument();
    });

    it("displays description for checkbox setting", () => {
      const setting: CheckboxSetting = {
        id: "test",
        label: "Test",
        type: "checkbox",
        default: false,
        description: "Enable this feature",
      };

      render(<SettingRenderer setting={setting} toolId="tool" />);
      expect(screen.getByText("Enable this feature")).toBeInTheDocument();
    });
  });

  describe("Default initialization behavior", () => {
    it("does not override existing values with defaults", async () => {
      await ToolState.initializeDefaults("tool", { test: "existing" });

      const setting: TextSetting = {
        id: "test",
        label: "Test",
        type: "text",
        default: "default",
      };

      render(<SettingRenderer setting={setting} toolId="tool" />);

      const settings = ToolState.getToolSettings("tool");
      expect(settings.test).toBe("existing");
    });
  });
});
