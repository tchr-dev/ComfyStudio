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
        _meta?: {
            title: string;
        };
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
export declare class ComfyUIClient {
    private config;
    private clientId;
    private ws;
    private progressCallbacks;
    private pendingPromises;
    constructor(config: ComfyUIClientConfig);
    getClientId(): string;
    /**
     * Test connection to ComfyUI server
     */
    testConnection(): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Connect to ComfyUI WebSocket for real-time progress
     */
    connectWebSocket(): Promise<void>;
    /**
     * Disconnect WebSocket
     */
    disconnectWebSocket(): void;
    /**
     * Handle incoming WebSocket messages
     */
    private handleWSMessage;
    /**
     * Register a progress callback
     */
    onProgress(callback: (event: ComfyUIProgressEvent) => void): () => void;
    /**
     * Queue a workflow for execution
     */
    queuePrompt(workflow: ComfyUIWorkflow): Promise<QueuePromptResponse>;
    /**
     * Queue a workflow and wait for completion
     */
    queuePromptAndWait(workflow: ComfyUIWorkflow, timeoutMs?: number): Promise<Array<{
        filename: string;
        subfolder: string;
        type: string;
    }>>;
    /**
     * Get object info (models, samplers, etc.)
     */
    getObjectInfo(): Promise<Record<string, unknown>>;
    /**
     * Get available checkpoint models
     */
    getModels(): Promise<ComfyUIModel[]>;
    /**
     * Get available samplers
     */
    getSamplers(): Promise<ComfyUISampler[]>;
    /**
     * Get available schedulers
     */
    getSchedulers(): Promise<ComfyUIScheduler[]>;
    /**
     * Get execution history
     */
    getHistory(maxItems?: number): Promise<Record<string, HistoryEntry>>;
    /**
     * Get specific prompt history
     */
    getPromptHistory(promptId: string): Promise<HistoryEntry | undefined>;
    /**
     * Fetch generated image as Blob
     */
    getImage(filename: string, subfolder?: string, type?: string): Promise<Blob>;
    /**
     * Upload an image to ComfyUI
     */
    uploadImage(blob: Blob, filename: string, subfolder?: string, overwrite?: boolean): Promise<{
        name: string;
        subfolder: string;
        type: string;
    }>;
    /**
     * Interrupt current generation
     */
    interrupt(): Promise<void>;
    /**
     * Get current queue status
     */
    getQueue(): Promise<{
        queue_running: Array<[number, string, ComfyUIWorkflow]>;
        queue_pending: Array<[number, string, ComfyUIWorkflow]>;
    }>;
}
