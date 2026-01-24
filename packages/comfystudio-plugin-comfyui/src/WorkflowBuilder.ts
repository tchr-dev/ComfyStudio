import type { StableDiffusionInput } from "@comfystudio/plugin";
import type { ComfyUIWorkflow } from "./ComfyUIClient";

export type WorkflowConfig = {
  defaultModel: string;
  defaultSampler: string;
  defaultScheduler: string;
  defaultSteps: number;
  defaultCfgScale: number;
};

const DEFAULT_CONFIG: WorkflowConfig = {
  defaultModel: "sd_xl_base_1.0.safetensors",
  defaultSampler: "euler",
  defaultScheduler: "normal",
  defaultSteps: 20,
  defaultCfgScale: 7,
};

export class WorkflowBuilder {
  private config: WorkflowConfig;

  constructor(config: Partial<WorkflowConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  buildTxt2Img(input: StableDiffusionInput, count: number = 1): ComfyUIWorkflow {
    const positivePrompt = input.prompts?.find((p) => (p.weight ?? 1) > 0)?.text || "";
    const negativePrompt = input.prompts?.find((p) => (p.weight ?? 0) < 0)?.text || "";

    const width = input.width || 1024;
    const height = input.height || 1024;
    const steps = input.steps || this.config.defaultSteps;
    const cfgScale = input.cfgScale || this.config.defaultCfgScale;
    const seed = input.seed ?? Math.floor(Math.random() * 2147483647);
    const model = input.model || this.config.defaultModel;
    const sampler = input.sampler?.name || this.config.defaultSampler;

    return {
      "1": {
        class_type: "CheckpointLoaderSimple",
        inputs: {
          ckpt_name: model,
        },
      },
      "2": {
        class_type: "CLIPTextEncode",
        inputs: {
          text: positivePrompt,
          clip: ["1", 1],
        },
      },
      "3": {
        class_type: "CLIPTextEncode",
        inputs: {
          text: negativePrompt,
          clip: ["1", 1],
        },
      },
      "4": {
        class_type: "EmptyLatentImage",
        inputs: {
          width,
          height,
          batch_size: count,
        },
      },
      "5": {
        class_type: "KSampler",
        inputs: {
          seed,
          steps,
          cfg: cfgScale,
          sampler_name: sampler,
          scheduler: this.config.defaultScheduler,
          denoise: 1.0,
          model: ["1", 0],
          positive: ["2", 0],
          negative: ["3", 0],
          latent_image: ["4", 0],
        },
      },
      "6": {
        class_type: "VAEDecode",
        inputs: {
          samples: ["5", 0],
          vae: ["1", 2],
        },
      },
      "7": {
        class_type: "SaveImage",
        inputs: {
          filename_prefix: "ComfyStudio",
          images: ["6", 0],
        },
      },
    };
  }

  buildImg2Img(
    input: StableDiffusionInput,
    inputImageName: string,
    count: number = 1
  ): ComfyUIWorkflow {
    const positivePrompt = input.prompts?.find((p) => (p.weight ?? 1) > 0)?.text || "";
    const negativePrompt = input.prompts?.find((p) => (p.weight ?? 0) < 0)?.text || "";

    const width = input.width || 1024;
    const height = input.height || 1024;
    const steps = input.steps || this.config.defaultSteps;
    const cfgScale = input.cfgScale || this.config.defaultCfgScale;
    const seed = input.seed ?? Math.floor(Math.random() * 2147483647);
    const model = input.model || this.config.defaultModel;
    const sampler = input.sampler?.name || this.config.defaultSampler;
    const denoise = 1 - (input.initialImage?.weight ?? 0.5);

    return {
      "1": {
        class_type: "CheckpointLoaderSimple",
        inputs: {
          ckpt_name: model,
        },
      },
      "2": {
        class_type: "CLIPTextEncode",
        inputs: {
          text: positivePrompt,
          clip: ["1", 1],
        },
      },
      "3": {
        class_type: "CLIPTextEncode",
        inputs: {
          text: negativePrompt,
          clip: ["1", 1],
        },
      },
      "4": {
        class_type: "LoadImage",
        inputs: {
          image: inputImageName,
        },
      },
      "5": {
        class_type: "ImageScale",
        inputs: {
          image: ["4", 0],
          width,
          height,
          upscale_method: "lanczos",
          crop: "center",
        },
      },
      "6": {
        class_type: "VAEEncode",
        inputs: {
          pixels: ["5", 0],
          vae: ["1", 2],
        },
      },
      "7": {
        class_type: "RepeatLatentBatch",
        inputs: {
          samples: ["6", 0],
          amount: count,
        },
      },
      "8": {
        class_type: "KSampler",
        inputs: {
          seed,
          steps,
          cfg: cfgScale,
          sampler_name: sampler,
          scheduler: this.config.defaultScheduler,
          denoise,
          model: ["1", 0],
          positive: ["2", 0],
          negative: ["3", 0],
          latent_image: ["7", 0],
        },
      },
      "9": {
        class_type: "VAEDecode",
        inputs: {
          samples: ["8", 0],
          vae: ["1", 2],
        },
      },
      "10": {
        class_type: "SaveImage",
        inputs: {
          filename_prefix: "ComfyStudio",
          images: ["9", 0],
        },
      },
    };
  }

  buildInpainting(
    input: StableDiffusionInput,
    inputImageName: string,
    maskImageName: string,
    count: number = 1
  ): ComfyUIWorkflow {
    const positivePrompt = input.prompts?.find((p) => (p.weight ?? 1) > 0)?.text || "";
    const negativePrompt = input.prompts?.find((p) => (p.weight ?? 0) < 0)?.text || "";

    const width = input.width || 1024;
    const height = input.height || 1024;
    const steps = input.steps || this.config.defaultSteps;
    const cfgScale = input.cfgScale || this.config.defaultCfgScale;
    const seed = input.seed ?? Math.floor(Math.random() * 2147483647);
    const model = input.model || this.config.defaultModel;
    const sampler = input.sampler?.name || this.config.defaultSampler;
    const denoise = 1 - (input.initialImage?.weight ?? 0.3);

    return {
      "1": {
        class_type: "CheckpointLoaderSimple",
        inputs: {
          ckpt_name: model,
        },
      },
      "2": {
        class_type: "CLIPTextEncode",
        inputs: {
          text: positivePrompt,
          clip: ["1", 1],
        },
      },
      "3": {
        class_type: "CLIPTextEncode",
        inputs: {
          text: negativePrompt,
          clip: ["1", 1],
        },
      },
      "4": {
        class_type: "LoadImage",
        inputs: {
          image: inputImageName,
        },
      },
      "5": {
        class_type: "LoadImage",
        inputs: {
          image: maskImageName,
        },
      },
      "6": {
        class_type: "ImageScale",
        inputs: {
          image: ["4", 0],
          width,
          height,
          upscale_method: "lanczos",
          crop: "center",
        },
      },
      "7": {
        class_type: "ImageScale",
        inputs: {
          image: ["5", 0],
          width,
          height,
          upscale_method: "lanczos",
          crop: "center",
        },
      },
      "8": {
        class_type: "ImageToMask",
        inputs: {
          image: ["7", 0],
          channel: "red",
        },
      },
      "9": {
        class_type: "InvertMask",
        inputs: {
          mask: ["8", 0],
        },
      },
      "10": {
        class_type: "VAEEncodeForInpaint",
        inputs: {
          pixels: ["6", 0],
          vae: ["1", 2],
          mask: ["9", 0],
          grow_mask_by: 6,
        },
      },
      "11": {
        class_type: "RepeatLatentBatch",
        inputs: {
          samples: ["10", 0],
          amount: count,
        },
      },
      "12": {
        class_type: "KSampler",
        inputs: {
          seed,
          steps,
          cfg: cfgScale,
          sampler_name: sampler,
          scheduler: this.config.defaultScheduler,
          denoise,
          model: ["1", 0],
          positive: ["2", 0],
          negative: ["3", 0],
          latent_image: ["11", 0],
        },
      },
      "13": {
        class_type: "VAEDecode",
        inputs: {
          samples: ["12", 0],
          vae: ["1", 2],
        },
      },
      "14": {
        class_type: "SaveImage",
        inputs: {
          filename_prefix: "ComfyStudio",
          images: ["13", 0],
        },
      },
    };
  }

  updateConfig(config: Partial<WorkflowConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
