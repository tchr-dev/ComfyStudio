/**
 * History Store Path Helpers
 *
 * Centralized path management for files-as-truth storage layout.
 * Ensures consistent directory structure across all operations.
 *
 * Milestone: M2 - History Store (Files-as-Truth)
 */

import type { HistoryStorePaths } from "./types";
import { join } from "path";

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
  const root = join(workspaceRoot, "history", "v1");

  return {
    root,
    meta: join(root, "meta.json"),
    tools: (toolId: string) => {
      const toolRoot = join(root, "tools", toolId);

      return {
        root: toolRoot,
        executions: {
          jsonl: join(toolRoot, "executions", "executions.jsonl"),
          index: join(toolRoot, "executions", "executions.idx.json"),
          pruning: join(toolRoot, "executions", "pruning.json"),
        },
        artifacts: {
          root: join(toolRoot, "artifacts"),
          execution: (executionId: string) => {
            const execRoot = join(toolRoot, "artifacts", executionId);
            const filesRoot = join(execRoot, "files");

            return {
              root: execRoot,
              manifest: join(execRoot, "manifest.json"),
              files: filesRoot,
              file: (filename: string) => join(filesRoot, filename),
            };
          },
        },
        errors: {
          jsonl: join(toolRoot, "errors", "errors.jsonl"),
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

/**
 * Join path segments (cross-platform)
 */
export function joinPath(...segments: string[]): string {
  return segments.join("/").replace(/\/+/g, "/");
}
