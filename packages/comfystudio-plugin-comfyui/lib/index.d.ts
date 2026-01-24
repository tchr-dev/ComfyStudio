import * as StableStudio from "@comfystudio/plugin";
import { ComfyUIClient } from "./ComfyUIClient";
import { WorkflowBuilder } from "./WorkflowBuilder";
type PluginState = {
    client: ComfyUIClient | null;
    workflowBuilder: WorkflowBuilder;
    isConnected: boolean;
    models: StableStudio.StableDiffusionModel[];
    samplers: StableStudio.StableDiffusionSampler[];
    /** Raw model names from ComfyUI (checkpoint filenames) */
    rawModelNames: string[];
    /** Raw sampler names from ComfyUI (lowercase) */
    rawSamplerNames: string[];
    settings: {
        comfyuiUrl: StableStudio.PluginSettingString;
        defaultModel: StableStudio.PluginSettingString;
        defaultSampler: StableStudio.PluginSettingString;
    };
};
export declare const createPlugin: (context: {
    getGitHash: () => string;
    getStableDiffusionRandomPrompt: () => string;
}) => import("zustand").StoreApi<StableStudio.Plugin<PluginState>>;
export {};
