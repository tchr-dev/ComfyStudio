import * as StableStudio from "@comfystudio/plugin";
import { ComfyUIClient } from "./ComfyUIClient";
import { WorkflowBuilder } from "./WorkflowBuilder";

const DEFAULT_COMFYUI_URL = "http://127.0.0.1:8188";

const manifest: StableStudio.PluginManifest = {
  name: "ComfyUI",
  author: "ComfyStudio Community",
  link: "https://github.com/comfyanonymous/ComfyUI",
  icon: `${window.location.origin}/DummyImage.png`,
  version: "0.1.0",
  license: "MIT",
  description: `This plugin connects ComfyStudio to a local [ComfyUI](https://github.com/comfyanonymous/ComfyUI) installation for image generation.

## Setup

1. Start ComfyUI with \`--enable-cors-header\` flag
2. Set the ComfyUI URL below (default: http://127.0.0.1:8188)
3. The status should show "Connected" when ready

## Features

- Text-to-image generation
- Image-to-image generation
- Inpainting with masks
- Model and sampler selection from ComfyUI
`,
};

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

function getStoredUrl(): string {
  return localStorage.getItem("comfyui-host-url") || DEFAULT_COMFYUI_URL;
}

function getStoredModel(): string {
  return localStorage.getItem("comfyui-default-model") || "";
}

function getStoredSampler(): string {
  return localStorage.getItem("comfyui-default-sampler") || "";
}

async function initializeClient(
  url: string,
  set: (partial: Partial<PluginState> | ((state: PluginState) => Partial<PluginState>)) => void
): Promise<ComfyUIClient | null> {
  const client = new ComfyUIClient({ serverUrl: url });

  const connectionTest = await client.testConnection();
  if (!connectionTest.success) {
    console.error("[ComfyUI Plugin] Connection failed:", connectionTest.error);
    set({ isConnected: false, client: null });
    return null;
  }

  try {
    await client.connectWebSocket();
  } catch (error) {
    console.error("[ComfyUI Plugin] WebSocket connection failed:", error);
  }

  set({ isConnected: true, client });

  try {
    const [models, samplers] = await Promise.all([
      client.getModels(),
      client.getSamplers(),
    ]);

    const rawModelNames = models.map((m) => m.name);
    const rawSamplerNames = samplers.map((s) => s.name);

    set({
      models: models.map((m) => ({ id: m.name, name: m.name })),
      samplers: samplers.map((s) => ({ id: s.name, name: s.name })),
      rawModelNames,
      rawSamplerNames,
    });
  } catch (error) {
    console.error("[ComfyUI Plugin] Failed to fetch models/samplers:", error);
  }

  return client;
}

function resolveModelName(inputModel: string | undefined, availableModels: string[]): string {
  if (!inputModel || availableModels.length === 0) {
    return availableModels[0] || "";
  }

  if (availableModels.includes(inputModel)) {
    return inputModel;
  }

  const inputLower = inputModel.toLowerCase();
  const match = availableModels.find((m) => m.toLowerCase().includes(inputLower));
  if (match) {
    return match;
  }

  return availableModels[0];
}

function resolveSamplerName(inputSampler: string | undefined, availableSamplers: string[]): string {
  if (!inputSampler || availableSamplers.length === 0) {
    return availableSamplers[0] || "euler";
  }

  const inputLower = inputSampler.toLowerCase();

  if (availableSamplers.includes(inputLower)) {
    return inputLower;
  }

  const exactMatch = availableSamplers.find((s) => s.toLowerCase() === inputLower);
  if (exactMatch) {
    return exactMatch;
  }

  return availableSamplers[0] || "euler";
}

export const createPlugin = StableStudio.createPlugin<PluginState>(({ set, get }) => {
  const storedUrl = getStoredUrl();

  initializeClient(storedUrl, set as Parameters<typeof initializeClient>[1]);

  return {
    client: null,
    workflowBuilder: new WorkflowBuilder(),
    isConnected: false,
    models: [],
    samplers: [],
    rawModelNames: [],
    rawSamplerNames: [],

    manifest,

    createStableDiffusionImages: async (options) => {
      const { client, workflowBuilder, rawModelNames, rawSamplerNames } = get();

      if (!client) {
        throw new Error("ComfyUI not connected");
      }

      const input = options?.input;
      const count = options?.count ?? 4;

      if (!input) {
        throw new Error("No input provided");
      }

      const resolvedModel = resolveModelName(input.model, rawModelNames);
      const resolvedSampler = resolveSamplerName(input.sampler?.name, rawSamplerNames);

      const resolvedInput = {
        ...input,
        model: resolvedModel,
        sampler: resolvedSampler ? { id: resolvedSampler, name: resolvedSampler } : undefined,
      };

      let workflow;
      let inputImageName: string | undefined;
      let maskImageName: string | undefined;

      if (input.initialImage?.blob) {
        const timestamp = Date.now();
        inputImageName = `comfystudio_input_${timestamp}.png`;
        await client.uploadImage(input.initialImage.blob, inputImageName);

        if (input.maskImage?.blob) {
          maskImageName = `comfystudio_mask_${timestamp}.png`;
          await client.uploadImage(input.maskImage.blob, maskImageName);
          workflow = workflowBuilder.buildInpainting(resolvedInput, inputImageName, maskImageName, count);
        } else {
          workflow = workflowBuilder.buildImg2Img(resolvedInput, inputImageName, count);
        }
      } else {
        workflow = workflowBuilder.buildTxt2Img(resolvedInput, count);
      }

      const queueResponse = await client.queuePrompt(workflow);
      const promptId = queueResponse.prompt_id;

      const imageResults = await waitForImages(client, promptId, count);

      const images: StableStudio.StableDiffusionImage[] = await Promise.all(
        imageResults.map(async (imgInfo) => {
          const blob = await client.getImage(imgInfo.filename, imgInfo.subfolder, imgInfo.type);
          return {
            id: `${promptId}_${imgInfo.filename}`,
            createdAt: new Date(),
            blob,
            input,
          };
        })
      );

      return {
        id: promptId,
        images,
      };
    },

    getStableDiffusionModels: () => {
      return get().models;
    },

    getStableDiffusionSamplers: () => {
      return get().samplers;
    },

    getStableDiffusionDefaultCount: () => 4,

    getStableDiffusionDefaultInput: () => {
      const storedModel = getStoredModel();
      const storedSampler = getStoredSampler();

      return {
        prompts: [
          { text: "", weight: 1 },
          { text: "", weight: -0.75 },
        ],
        model: storedModel || undefined,
        sampler: storedSampler ? { id: storedSampler, name: storedSampler } : undefined,
        width: 1024,
        height: 1024,
        cfgScale: 7,
        steps: 20,
      };
    },

    getStatus: async () => {
      const { client, isConnected } = get();

      if (!client || !isConnected) {
        return {
          indicator: "error",
          text: "Not connected to ComfyUI",
        };
      }

      try {
        const queue = await client.getQueue();
        const runningCount = queue.queue_running.length;
        const pendingCount = queue.queue_pending.length;

        if (runningCount > 0 || pendingCount > 0) {
          return {
            indicator: "loading",
            text: `Queue: ${runningCount} running, ${pendingCount} pending`,
          };
        }

        return {
          indicator: "success",
          text: "Connected",
        };
      } catch {
        return {
          indicator: "warning",
          text: "Connected (queue check failed)",
        };
      }
    },

    settings: {
      comfyuiUrl: {
        type: "string",
        title: "ComfyUI URL",
        placeholder: DEFAULT_COMFYUI_URL,
        value: getStoredUrl(),
        description: "The URL of your ComfyUI server (e.g., http://127.0.0.1:8188)",
      },
      defaultModel: {
        type: "string",
        title: "Default Model",
        placeholder: "Select a model",
        value: getStoredModel(),
        description: "Default checkpoint model to use for generation",
      },
      defaultSampler: {
        type: "string",
        title: "Default Sampler",
        placeholder: "euler",
        value: getStoredSampler(),
        description: "Default sampler to use for generation",
      },
    },

    setSetting: (key, value) => {
      set(({ settings }) => ({
        settings: {
          ...settings,
          [key]: { ...settings[key], value: value as string },
        },
      }));

      if (key === "comfyuiUrl" && typeof value === "string") {
        localStorage.setItem("comfyui-host-url", value);

        const { client } = get();
        if (client) {
          client.disconnectWebSocket();
        }

        initializeClient(value, set as Parameters<typeof initializeClient>[1]);
      } else if (key === "defaultModel" && typeof value === "string") {
        localStorage.setItem("comfyui-default-model", value);
        get().workflowBuilder.updateConfig({ defaultModel: value });
      } else if (key === "defaultSampler" && typeof value === "string") {
        localStorage.setItem("comfyui-default-sampler", value);
        get().workflowBuilder.updateConfig({ defaultSampler: value });
      }
    },
  };
});

async function waitForImages(
  client: ComfyUIClient,
  promptId: string,
  expectedCount: number,
  timeoutMs: number = 300000
): Promise<Array<{ filename: string; subfolder: string; type: string }>> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let images: Array<{ filename: string; subfolder: string; type: string }> = [];

    const unsubscribe = client.onProgress((event) => {
      if (event.type === "executed" && event.data.prompt_id === promptId) {
        if (event.data.output?.images) {
          images = [...images, ...event.data.output.images];
        }
      }

      if ((event.type === "execution_complete" || event.type === "execution_success") && event.data.prompt_id === promptId) {
        unsubscribe();
        if (images.length > 0) {
          resolve(images);
        } else {
          fetchFromHistory();
        }
      }

      if (event.type === "execution_error" && event.data.prompt_id === promptId) {
        unsubscribe();
        reject(new Error(event.data.exception_message || "Generation failed"));
      }
    });

    async function fetchFromHistory() {
      try {
        const history = await client.getPromptHistory(promptId);
        if (history?.outputs) {
          const allImages: Array<{ filename: string; subfolder: string; type: string }> = [];
          for (const output of Object.values(history.outputs)) {
            if (output.images) {
              allImages.push(...output.images);
            }
          }
          if (allImages.length > 0) {
            resolve(allImages);
            return;
          }
        }
        reject(new Error("No images found in history"));
      } catch (error) {
        reject(error);
      }
    }

    const checkTimeout = setInterval(() => {
      if (Date.now() - startTime > timeoutMs) {
        clearInterval(checkTimeout);
        unsubscribe();
        if (images.length > 0) {
          resolve(images);
        } else {
          reject(new Error("Generation timeout"));
        }
      }
    }, 1000);
  });
}
