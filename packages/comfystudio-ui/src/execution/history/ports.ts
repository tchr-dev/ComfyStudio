/**
 * History Store Ports
 *
 * Dependency injection interfaces for I/O operations.
 * Enables testing without real filesystem/clock access.
 *
 * Milestone: M2 - History Store (Files-as-Truth)
 */

/**
 * Filesystem operations port
 *
 * All filesystem access must go through this interface.
 * Enables testing with in-memory implementations.
 */
export interface FileSystemPort {
  /**
   * Read entire file as UTF-8 string
   */
  readFile(path: string): Promise<string>;

  /**
   * Write entire file as UTF-8 string (creates parent dirs if needed)
   */
  writeFile(path: string, content: string): Promise<void>;

  /**
   * Atomic rename (POSIX rename semantics - overwrites destination)
   */
  rename(oldPath: string, newPath: string): Promise<void>;

  /**
   * Create directory (recursive, no-op if exists)
   */
  mkdir(path: string): Promise<void>;

  /**
   * Check if path exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get file stats (size, mtime, etc.)
   */
  stat(path: string): Promise<FileStats>;

  /**
   * List directory contents (files and dirs)
   */
  readdir(path: string): Promise<string[]>;

  /**
   * Delete file
   */
  unlink(path: string): Promise<void>;

  /**
   * Delete directory (recursive)
   */
  rmdir(path: string, options?: { recursive?: boolean }): Promise<void>;

  /**
   * Append to file (creates if not exists)
   */
  appendFile(path: string, content: string): Promise<void>;
}

export type FileStats = {
  size: number;
  mtimeMs: number;
  isFile: () => boolean;
  isDirectory: () => boolean;
};

/**
 * Clock port for timestamps
 *
 * Enables testing with frozen/controlled time.
 */
export interface ClockPort {
  /**
   * Get current time as ISO-8601 string
   */
  now(): string;

  /**
   * Get current time as Date object
   */
  nowDate(): Date;

  /**
   * Get current timestamp in milliseconds
   */
  nowMs(): number;
}

/**
 * ID generation port
 *
 * Enables testing with deterministic IDs.
 */
export interface IdPort {
  /**
   * Generate UUID v4
   */
  uuid(): string;
}

/**
 * All ports bundled together
 */
export type HistoryStorePorts = {
  fs: FileSystemPort;
  clock: ClockPort;
  id: IdPort;
};

/**
 * Default ports using real implementations
 */
export function createDefaultPorts(): HistoryStorePorts {
  return {
    fs: createNodeFsPort(),
    clock: createSystemClockPort(),
    id: createCryptoIdPort(),
  };
}

/**
 * Node.js filesystem implementation (browser-compatible via Vite)
 */
function createNodeFsPort(): FileSystemPort {
  // In browser environment, this needs a virtual filesystem
  // For now, throw with clear message - will be injected during tests
  const isBrowser = typeof window !== "undefined";

  if (isBrowser) {
    throw new Error(
      "FileSystemPort not available in browser - use createHistoryStore with custom ports"
    );
  }

  // Node.js implementation (for tests and future SSR)
  const fs = require("fs").promises;
  const path = require("path");

  return {
    async readFile(filePath: string): Promise<string> {
      return await fs.readFile(filePath, "utf8");
    },

    async writeFile(filePath: string, content: string): Promise<void> {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, content, "utf8");
    },

    async rename(oldPath: string, newPath: string): Promise<void> {
      await fs.rename(oldPath, newPath);
    },

    async mkdir(dirPath: string): Promise<void> {
      await fs.mkdir(dirPath, { recursive: true });
    },

    async exists(filePath: string): Promise<boolean> {
      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    },

    async stat(filePath: string): Promise<FileStats> {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        mtimeMs: stats.mtimeMs,
        isFile: () => stats.isFile(),
        isDirectory: () => stats.isDirectory(),
      };
    },

    async readdir(dirPath: string): Promise<string[]> {
      return await fs.readdir(dirPath);
    },

    async unlink(filePath: string): Promise<void> {
      await fs.unlink(filePath);
    },

    async rmdir(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
      await fs.rm(dirPath, options);
    },

    async appendFile(filePath: string, content: string): Promise<void> {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.appendFile(filePath, content, "utf8");
    },
  };
}

/**
 * System clock implementation
 */
function createSystemClockPort(): ClockPort {
  return {
    now: () => new Date().toISOString(),
    nowDate: () => new Date(),
    nowMs: () => Date.now(),
  };
}

/**
 * Crypto-based UUID implementation
 */
function createCryptoIdPort(): IdPort {
  return {
    uuid: () => crypto.randomUUID(),
  };
}
