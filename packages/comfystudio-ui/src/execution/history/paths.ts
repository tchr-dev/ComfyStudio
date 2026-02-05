/**
 * History Store Path Helpers
 *
 * Centralized path management for files-as-truth storage layout.
 * Ensures consistent directory structure across all operations.
 *
 * Milestone: M2 - History Store (Files-as-Truth)
 */

import type { HistoryStorePaths } from "./types";

/**
 * Join path segments (cross-platform, browser-safe)
 */
export function joinPath(...segments: string[]): string {
  return segments.join("/").replace(/\/+/g, "/");
}

/**
 * Create path helpers for given workspace root
 *
 * Storage layout:
 * <workspace_root>/
 *   history/
 *     v1/
 *       README.md
 *       meta.json
 *       tools/
 *         <toolId>/
 *           executions/
 *             executions.jsonl
 *             executions.idx.json
 *             pruning.json
 *           artifacts/
 *             <executionId>/
 *               manifest.json
 *               files/
 *                 <artifact files>
 *           errors/
 *             errors.jsonl
 */
export function createPaths(workspaceRoot: string): HistoryStorePaths {
  const root = joinPath(workspaceRoot, "history", "v1");

  return {
    root,
    meta: joinPath(root, "meta.json"),
    tools: (toolId: string) => {
      const toolRoot = joinPath(root, "tools", toolId);

      return {
        root: toolRoot,
        executions: {
          jsonl: joinPath(toolRoot, "executions", "executions.jsonl"),
          index: joinPath(toolRoot, "executions", "executions.idx.json"),
          pruning: joinPath(toolRoot, "executions", "pruning.json"),
        },
        artifacts: {
          root: joinPath(toolRoot, "artifacts"),
          execution: (executionId: string) => {
            const execRoot = joinPath(toolRoot, "artifacts", executionId);
            const filesRoot = joinPath(execRoot, "files");

            return {
              root: execRoot,
              manifest: joinPath(execRoot, "manifest.json"),
              files: filesRoot,
              file: (filename: string) => joinPath(filesRoot, filename),
            };
          },
        },
        errors: {
          jsonl: joinPath(toolRoot, "errors", "errors.jsonl"),
        },
      };
    },
  };
}

/**
 * Get parent directory of path
 */
export function dirname(path: string): string {
  const parts = path.split("/");
  return parts.slice(0, -1).join("/");
}

/**
 * Get filename from path
 */
export function basename(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] || "";
}
