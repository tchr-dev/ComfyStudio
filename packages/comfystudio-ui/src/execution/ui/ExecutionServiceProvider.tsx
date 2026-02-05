/**
 * Execution Service Provider
 *
 * Initializes and provides the execution service to the application.
 * Handles service bootstrap on mount and cleanup on unmount.
 *
 * Integration: Phase 1 - Service Bootstrap
 */

import React, { useEffect, useState } from "react";
import { createExecutionService } from "../service";
import { setExecutionService } from "./hooks";
import { createWorkflowRunner } from "../runner/runner";
import { createHistoryStore } from "../history/api";
import { createComfyUIAdapter } from "../adapters/comfyui/adapter";
import { createHasher } from "../adapters/comfyui/hasher";
import type { ComfyUIClientPort, ClockPort, LoggerPort } from "../runner/types";
import type { FileSystemPort } from "../history/ports";
import type { WorkflowTemplate } from "../adapters/comfyui/types";

// ============================================================================
// Browser-Compatible Ports
// ============================================================================

/**
 * Create filesystem port using browser APIs
 *
 * For now, uses localStorage for persistence.
 * In production, could use IndexedDB or FileSystem Access API.
 */
function createBrowserFileSystem(workspaceRoot: string): FileSystemPort {
  const storageKey = (path: string) => `comfystudio:${workspaceRoot}:${path}`;

  return {
    async readFile(path: string): Promise<string> {
      const content = localStorage.getItem(storageKey(path));
      if (content === null) {
        throw new Error(`ENOENT: no such file '${path}'`);
      }
      return content;
    },

    async writeFile(path: string, content: string): Promise<void> {
      localStorage.setItem(storageKey(path), content);
    },

    async rename(oldPath: string, newPath: string): Promise<void> {
      const content = localStorage.getItem(storageKey(oldPath));
      if (content === null) {
        throw new Error(`ENOENT: no such file '${oldPath}'`);
      }
      localStorage.setItem(storageKey(newPath), content);
      localStorage.removeItem(storageKey(oldPath));
    },

    async mkdir(path: string): Promise<void> {
      // No-op in localStorage (directories don't exist)
    },

    async exists(path: string): Promise<boolean> {
      return localStorage.getItem(storageKey(path)) !== null;
    },

    async stat(path: string): Promise<any> {
      const content = localStorage.getItem(storageKey(path));
      if (content === null) {
        throw new Error(`ENOENT: no such file '${path}'`);
      }
      return {
        size: content.length,
        mtimeMs: Date.now(),
        isFile: () => true,
        isDirectory: () => false,
      };
    },

    async readdir(path: string): Promise<string[]> {
      const prefix = storageKey(path + "/");
      const keys: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const relativePath = key.slice(prefix.length);
          const name = relativePath.split("/")[0];
          if (name && !keys.includes(name)) {
            keys.push(name);
          }
        }
      }

      return keys;
    },

    async unlink(path: string): Promise<void> {
      localStorage.removeItem(storageKey(path));
    },

    async rmdir(path: string, options?: { recursive?: boolean }): Promise<void> {
      if (options?.recursive) {
        const prefix = storageKey(path);
        const keysToRemove: string[] = [];

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach((key) => localStorage.removeItem(key));
      }
    },

    async appendFile(path: string, content: string): Promise<void> {
      const existing = localStorage.getItem(storageKey(path)) || "";
      localStorage.setItem(storageKey(path), existing + content);
    },
  };
}

/**
 * Create ComfyUI client port
 *
 * Wraps ComfyUI REST API for workflow execution.
 */
function createComfyUIClient(baseUrl: string = "http://127.0.0.1:8188"): ComfyUIClientPort {
  return {
    async submitPrompt(payload: any): Promise<{ jobId: string }> {
      try {
        const response = await fetch(`${baseUrl}/prompt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`ComfyUI submit failed: ${response.statusText}`);
        }

        const data = await response.json();
        return { jobId: data.prompt_id };
      } catch (error) {
        console.error("ComfyUI submit error:", error);
        throw error;
      }
    },

    async getStatus(jobId: string): Promise<any> {
      try {
        const response = await fetch(`${baseUrl}/history/${jobId}`);

        if (!response.ok) {
          throw new Error(`ComfyUI status failed: ${response.statusText}`);
        }

        const data = await response.json();

        // Map ComfyUI history response to our status format
        const history = data[jobId];
        if (!history) {
          return { state: "missing" };
        }

        const status = history.status;
        if (!status) {
          return { state: "missing" };
        }

        // Check if completed
        if (status.completed === true) {
          return { state: "completed" };
        }

        // Check if there are any errors
        if (status.messages && status.messages.some((m: any) => m[0] === "execution_error")) {
          const errorMsg = status.messages.find((m: any) => m[0] === "execution_error");
          return {
            state: "failed",
            error: errorMsg?.[1]?.exception_message || "Execution error",
          };
        }

        // Otherwise, still running or queued
        if (status.status_str === "success") {
          return { state: "completed" };
        }

        return { state: "running" };
      } catch (error) {
        console.error("ComfyUI status error:", error);
        return { state: "missing" };
      }
    },

    async cancel(jobId: string): Promise<{ cancelled: boolean }> {
      try {
        await fetch(`${baseUrl}/interrupt`, {
          method: "POST",
        });
        return { cancelled: true };
      } catch (error) {
        console.error("ComfyUI cancel error:", error);
        return { cancelled: false };
      }
    },
  };
}

/**
 * Create system clock port
 */
function createSystemClock(): ClockPort {
  return {
    now: () => new Date(),
    nowMs: () => Date.now(),
  };
}

/**
 * Create console logger port
 */
function createConsoleLogger(): LoggerPort {
  return {
    debug: (...args: any[]) => console.debug("[execution]", ...args),
    info: (...args: any[]) => console.info("[execution]", ...args),
    warn: (...args: any[]) => console.warn("[execution]", ...args),
    error: (...args: any[]) => console.error("[execution]", ...args),
  };
}

/**
 * Load default workflow templates
 *
 * TODO: Load these from plugin or configuration
 */
function loadWorkflowTemplates(): Map<string, WorkflowTemplate> {
  const templates = new Map<string, WorkflowTemplate>();

  // Basic txt2img template
  templates.set("txt2img", {
    id: "txt2img",
    version: "1.0",
    data: {
      prompt: {
        "1": {
          inputs: {
            ckpt_name: "v1-5-pruned-emaonly.safetensors",
          },
          class_type: "CheckpointLoaderSimple",
        },
        "2": {
          inputs: {
            text: "{{positive}}",
            clip: ["1", 1],
          },
          class_type: "CLIPTextEncode",
        },
        "3": {
          inputs: {
            text: "{{negative}}",
            clip: ["1", 1],
          },
          class_type: "CLIPTextEncode",
        },
        "4": {
          inputs: {
            seed: "{{seed}}",
            steps: "{{steps}}",
            cfg: "{{cfg}}",
            sampler_name: "{{sampler}}",
            scheduler: "normal",
            denoise: 1,
            model: ["1", 0],
            positive: ["2", 0],
            negative: ["3", 0],
            latent_image: ["5", 0],
          },
          class_type: "KSampler",
        },
        "5": {
          inputs: {
            width: "{{width}}",
            height: "{{height}}",
            batch_size: 1,
          },
          class_type: "EmptyLatentImage",
        },
        "6": {
          inputs: {
            samples: ["4", 0],
            vae: ["1", 2],
          },
          class_type: "VAEDecode",
        },
        "7": {
          inputs: {
            filename_prefix: "ComfyStudio",
            images: ["6", 0],
          },
          class_type: "SaveImage",
        },
      },
    },
  });

  return templates;
}

// ============================================================================
// Provider Component
// ============================================================================

export function ExecutionServiceProvider({ children }: React.PropsWithChildren) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        console.info("[ExecutionServiceProvider] Initializing execution service...");

        // Create workspace root (in localStorage)
        const workspaceRoot = "workspace";

        // Create ports
        const fs = createBrowserFileSystem(workspaceRoot);
        const comfyui = createComfyUIClient();
        const clock = createSystemClock();
        const logger = createConsoleLogger();

        // Create history store
        const history = createHistoryStore(workspaceRoot, {
          fs,
          clock: {
            now: () => new Date().toISOString(),
            nowDate: () => new Date(),
            nowMs: () => Date.now(),
          },
          id: {
            uuid: () => crypto.randomUUID(),
          },
        });

        // Create runner
        const runner = createWorkflowRunner({
          adapter: createComfyUIAdapter(),
          comfyui,
          history,
          clock,
          log: logger,
        });

        // Load workflow templates
        const templatesMap = loadWorkflowTemplates();

        // Create template registry
        const templates = {
          getTemplate: (workflowId: string) => templatesMap.get(workflowId),
        };

        // Create service
        const service = createExecutionService(runner, history, {
          workspaceRoot,
          runnerOptions: {
            pollIntervalMs: 1000,
            maxRuntimeMs: 300000, // 5 minutes
            emitProgressHeartbeat: true,
            missingJobConfirmations: 2,
          },
          adapterContext: {
            templates,
            hasher: createHasher(),
            clientId: "comfystudio-web",
          },
        });

        // Make service available globally
        setExecutionService(service);

        // Rehydrate state from history
        await service.rehydrate();

        if (mounted) {
          setIsInitialized(true);
          console.info("[ExecutionServiceProvider] Execution service initialized successfully");
        }
      } catch (err) {
        console.error("[ExecutionServiceProvider] Failed to initialize:", err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <div style={{ padding: 20, color: "red" }}>
        <h2>Execution Service Error</h2>
        <p>{error.message}</p>
        <pre>{error.stack}</pre>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div style={{ padding: 20 }}>
        <p>Initializing execution service...</p>
      </div>
    );
  }

  return <>{children}</>;
}
