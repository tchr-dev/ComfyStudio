/**
 * ComfyUI TypeScript Client
 * Handles WebSocket connections for real-time progress and REST API for workflow execution
 */

export type ComfyUIClientConfig = {
  serverUrl: string;
  timeout?: number;
};

export type ComfyUIWorkflow = {
  [nodeId: string]: {
    class_type: string;
    inputs: Record<string, unknown>;
    _meta?: { title: string };
  };
};

export type QueuePromptResponse = {
  prompt_id: string;
  number: number;
  node_errors: Record<string, unknown>;
};

export type ComfyUIProgressEvent = {
  type: "status" | "progress" | "executing" | "executed" | "execution_start" | "execution_cached" | "execution_error" | "execution_success" | "execution_complete" | "execution_interrupted";
  data: {
    node?: string | null;
    value?: number;
    max?: number;
    prompt_id?: string;
    output?: {
      images?: Array<{
        filename: string;
        subfolder: string;
        type: string;
      }>;
    };
    exception_message?: string;
    sid?: string;
  };
};

export type ComfyUIModel = {
  name: string;
  path: string;
};

export type ComfyUISampler = {
  name: string;
};

export type ComfyUIScheduler = {
  name: string;
};

export type HistoryEntry = {
  prompt: [number, string, ComfyUIWorkflow, Record<string, unknown>, string[]];
  outputs: {
    [nodeId: string]: {
      images?: Array<{
        filename: string;
        subfolder: string;
        type: string;
      }>;
    };
  };
  status: {
    status_str: string;
    completed: boolean;
    messages: Array<[string, Record<string, unknown>]>;
  };
};

function generateClientId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class ComfyUIClient {
  private config: ComfyUIClientConfig;
  private clientId: string;
  private ws: WebSocket | null = null;
  private progressCallbacks: Array<(event: ComfyUIProgressEvent) => void> = [];
  private pendingPromises: Map<string, {
    resolve: (images: Array<{ filename: string; subfolder: string; type: string }>) => void;
    reject: (error: Error) => void;
  }> = new Map();

  constructor(config: ComfyUIClientConfig) {
    this.config = {
      timeout: 10000,
      ...config,
    };
    this.clientId = generateClientId();
  }

  getClientId(): string {
    return this.clientId;
  }

  /**
   * Test connection to ComfyUI server
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.config.serverUrl}/system_stats`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `Server returned ${response.status}: ${response.statusText}`,
        };
      }

      return { success: true };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        return {
          success: false,
          error: "Connection timeout. Is ComfyUI running?",
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  /**
   * Connect to ComfyUI WebSocket for real-time progress
   */
  connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.config.serverUrl.replace(/^http/, "ws") + `/ws?clientId=${this.clientId}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log("[ComfyUI] WebSocket connected");
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as ComfyUIProgressEvent;
            this.handleWSMessage(message);
          } catch (error) {
            console.warn("[ComfyUI] Failed to parse WebSocket message:", error);
          }
        };

        this.ws.onerror = (error) => {
          console.error("[ComfyUI] WebSocket error:", error);
          reject(new Error("WebSocket connection failed"));
        };

        this.ws.onclose = () => {
          console.log("[ComfyUI] WebSocket disconnected");
          this.ws = null;
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWSMessage(message: ComfyUIProgressEvent): void {
    // Forward to all registered callbacks
    this.progressCallbacks.forEach((callback) => callback(message));

    // Handle execution completion
    if (message.type === "executed" && message.data.prompt_id && message.data.output?.images) {
      const pending = this.pendingPromises.get(message.data.prompt_id);
      if (pending) {
        pending.resolve(message.data.output.images);
        this.pendingPromises.delete(message.data.prompt_id);
      }
    }

    // Handle execution errors
    if (message.type === "execution_error" && message.data.prompt_id) {
      const pending = this.pendingPromises.get(message.data.prompt_id);
      if (pending) {
        pending.reject(new Error(message.data.exception_message || "Execution failed"));
        this.pendingPromises.delete(message.data.prompt_id);
      }
    }
  }

  /**
   * Register a progress callback
   */
  onProgress(callback: (event: ComfyUIProgressEvent) => void): () => void {
    this.progressCallbacks.push(callback);
    return () => {
      this.progressCallbacks = this.progressCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Queue a workflow for execution
   */
  async queuePrompt(workflow: ComfyUIWorkflow): Promise<QueuePromptResponse> {
    const body = {
      client_id: this.clientId,
      prompt: workflow,
    };

    const response = await fetch(`${this.config.serverUrl}/prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to queue prompt: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Queue a workflow and wait for completion
   */
  async queuePromptAndWait(
    workflow: ComfyUIWorkflow,
    timeoutMs: number = 300000
  ): Promise<Array<{ filename: string; subfolder: string; type: string }>> {
    const queueResponse = await this.queuePrompt(workflow);
    const promptId = queueResponse.prompt_id;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingPromises.delete(promptId);
        reject(new Error("Generation timeout"));
      }, timeoutMs);

      this.pendingPromises.set(promptId, {
        resolve: (images) => {
          clearTimeout(timeout);
          resolve(images);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
    });
  }

  /**
   * Get object info (models, samplers, etc.)
   */
  async getObjectInfo(): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.config.serverUrl}/object_info`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch object info: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get available checkpoint models
   */
  async getModels(): Promise<ComfyUIModel[]> {
    const objectInfo = await this.getObjectInfo();
    const checkpointLoader = objectInfo["CheckpointLoaderSimple"] as {
      input?: { required?: { ckpt_name?: [string[]] } };
    } | undefined;

    const modelNames = checkpointLoader?.input?.required?.ckpt_name?.[0] || [];
    return modelNames.map((name: string) => ({ name, path: name }));
  }

  /**
   * Get available samplers
   */
  async getSamplers(): Promise<ComfyUISampler[]> {
    const objectInfo = await this.getObjectInfo();
    const ksampler = objectInfo["KSampler"] as {
      input?: { required?: { sampler_name?: [string[]] } };
    } | undefined;

    const samplerNames = ksampler?.input?.required?.sampler_name?.[0] || [];
    return samplerNames.map((name: string) => ({ name }));
  }

  /**
   * Get available schedulers
   */
  async getSchedulers(): Promise<ComfyUIScheduler[]> {
    const objectInfo = await this.getObjectInfo();
    const ksampler = objectInfo["KSampler"] as {
      input?: { required?: { scheduler?: [string[]] } };
    } | undefined;

    const schedulerNames = ksampler?.input?.required?.scheduler?.[0] || [];
    return schedulerNames.map((name: string) => ({ name }));
  }

  /**
   * Get execution history
   */
  async getHistory(maxItems?: number): Promise<Record<string, HistoryEntry>> {
    const url = maxItems
      ? `${this.config.serverUrl}/history?max_items=${maxItems}`
      : `${this.config.serverUrl}/history`;

    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      throw new Error(`Failed to fetch history: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get specific prompt history
   */
  async getPromptHistory(promptId: string): Promise<HistoryEntry | undefined> {
    const response = await fetch(`${this.config.serverUrl}/history/${promptId}`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch prompt history: ${response.status}`);
    }

    const history = await response.json();
    return history[promptId];
  }

  /**
   * Fetch generated image as Blob
   */
  async getImage(filename: string, subfolder: string = "", type: string = "output"): Promise<Blob> {
    const params = new URLSearchParams({ filename, subfolder, type });
    const response = await fetch(`${this.config.serverUrl}/view?${params.toString()}`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    return response.blob();
  }

  /**
   * Upload an image to ComfyUI
   */
  async uploadImage(blob: Blob, filename: string, subfolder: string = "", overwrite: boolean = true): Promise<{
    name: string;
    subfolder: string;
    type: string;
  }> {
    const formData = new FormData();
    formData.append("image", blob, filename);
    formData.append("subfolder", subfolder);
    formData.append("overwrite", overwrite.toString());

    const response = await fetch(`${this.config.serverUrl}/upload/image`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload image: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Interrupt current generation
   */
  async interrupt(): Promise<void> {
    const response = await fetch(`${this.config.serverUrl}/interrupt`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Failed to interrupt: ${response.status}`);
    }
  }

  /**
   * Get current queue status
   */
  async getQueue(): Promise<{
    queue_running: Array<[number, string, ComfyUIWorkflow]>;
    queue_pending: Array<[number, string, ComfyUIWorkflow]>;
  }> {
    const response = await fetch(`${this.config.serverUrl}/queue`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch queue: ${response.status}`);
    }

    return response.json();
  }
}
