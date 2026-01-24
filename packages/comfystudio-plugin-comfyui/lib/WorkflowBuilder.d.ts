import type { StableDiffusionInput } from "@comfystudio/plugin";
import type { ComfyUIWorkflow } from "./ComfyUIClient";
export type WorkflowConfig = {
    defaultModel: string;
    defaultSampler: string;
    defaultScheduler: string;
    defaultSteps: number;
    defaultCfgScale: number;
};
export declare class WorkflowBuilder {
    private config;
    constructor(config?: Partial<WorkflowConfig>);
    buildTxt2Img(input: StableDiffusionInput, count?: number): ComfyUIWorkflow;
    buildImg2Img(input: StableDiffusionInput, inputImageName: string, count?: number): ComfyUIWorkflow;
    buildInpainting(input: StableDiffusionInput, inputImageName: string, maskImageName: string, count?: number): ComfyUIWorkflow;
    updateConfig(config: Partial<WorkflowConfig>): void;
}
