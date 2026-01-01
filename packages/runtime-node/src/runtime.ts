/**
 * @affectjs/runtime - Runtime Engine
 *
 * Core runtime for executing media processing operations
 */

import type {
  MediaType,
  Operation,
  Result,
  RuntimeOptions,
  Backend,
  ExecutionContext,
} from "./types";
import { detectMediaType } from "./router";
import { getBackend } from "./router";
import { fluentFfmpegBackend } from "./backends/fluent-ffmpeg";
import { sharpBackend } from "./backends/sharp";

/**
 * Main affect function - creates a media processing chain
 */
export function affect(input: string, options?: RuntimeOptions) {
  const mediaType = detectMediaType(input);
  const operations: Operation[] = [];
  let outputPath: string | undefined;
  let outputOptions: string[] = [];
  let format: string | undefined;
  let timeout: number | undefined;
  const progressCallback = options?.progress;

  // Get backend instance based on media type and file format
  // This will throw error if no backend supports the format
  const backend = getBackend(mediaType, input, operations);

  // Create backend command instance using adapter pattern
  // Each backend adapter handles its own command creation
  let command: any = backend.createCommand(input, mediaType);

  const chain = {
    // Unified operations
    resize(width: number | string, height?: number | string) {
      const op = { type: "resize", width, height };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    encode(codec: string, param?: number | string) {
      const op = { type: "encode", codec, param };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    filter(name: string, value?: number | string) {
      const op = { type: "filter", name, value };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    crop(x: number | string, y: number | string, width: number, height: number) {
      const op = { type: "crop", x, y, width, height };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    rotate(angle: number, flip?: string) {
      const op = { type: "rotate", angle, flip };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    // Video-specific operations
    videoCodec(codec: string) {
      const op = { type: "videoCodec", codec };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    videoBitrate(bitrate: string | number) {
      const op = { type: "videoBitrate", bitrate };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    size(size: string) {
      const op = { type: "size", size };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    fps(fps: number) {
      const op = { type: "fps", fps };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    noVideo() {
      const op = { type: "noVideo" };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    // Audio-specific operations
    audioCodec(codec: string) {
      const op = { type: "audioCodec", codec };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    audioBitrate(bitrate: string | number) {
      const op = { type: "audioBitrate", bitrate };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    audioChannels(channels: number) {
      const op = { type: "audioChannels", channels };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    audioFrequency(frequency: number) {
      const op = { type: "audioFrequency", frequency };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    noAudio() {
      const op = { type: "noAudio" };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    // Options
    format(fmt: string) {
      format = fmt;
      const op = { type: "format", format: fmt };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    options(opts: { timeout?: number; [key: string]: any }) {
      if (opts.timeout) {
        timeout = opts.timeout;
      }
      const op = { type: "options", options: opts };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    outputOptions(opts: string | string[]) {
      const optsArray = Array.isArray(opts) ? opts : [opts];
      outputOptions.push(...optsArray);
      const op = { type: "outputOptions", options: optsArray };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    // Save and execute
    save(path: string) {
      outputPath = path;
      const op = { type: "save", path };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    // Get metadata for conditional logic - use adapter pattern
    async getMetadata(): Promise<any> {
      return backend.getMetadata(input);
    },

    async execute(): Promise<Result> {
      try {
        // Use adapter pattern: apply all operations through backend adapter
        let cmd = command || backend.createCommand(input, mediaType);

        // Apply all operations using adapter (except save which is handled separately)
        for (const op of operations) {
          if (op.type !== "save") {
            cmd = backend.applyOperation(cmd, op, mediaType);
          }
        }

        // Execute based on backend type using adapter pattern
        if (backend.name === "fluent-ffmpeg") {
          // Setup progress tracking for fluent-ffmpeg
          if (progressCallback) {
            cmd.on("progress", (progress: any) => {
              const percent = progress.percent || 0;
              progressCallback({
                percent: Math.min(100, Math.max(0, percent)),
                current: 1,
                total: 1,
                message: `Processing ${mediaType}...`,
              });
            });
          }

          // fluent-ffmpeg's save() already executes
          if (!outputPath) {
            // If no save() was called, we need to execute manually
            await new Promise((resolve, reject) => {
              cmd.on("end", resolve);
              cmd.on("error", reject);
              cmd.run();
            });
          }
          return {
            success: true,
            output: outputPath,
          };
        } else if (backend.name === "sharp") {
          // Sharp operations are typically fast, but we can still report progress
          if (progressCallback) {
            progressCallback({
              percent: 50,
              current: 1,
              total: 1,
              message: `Processing image...`,
            });
          }

          // Execute and save using adapter
          if (outputPath) {
            await cmd.toFile(outputPath);
          } else {
            await cmd.toBuffer();
          }

          if (progressCallback) {
            progressCallback({
              percent: 100,
              current: 1,
              total: 1,
              message: `Completed`,
            });
          }

          return {
            success: true,
            output: outputPath,
          };
        }
        throw new Error(`Unsupported backend: ${backend.name}`);
      } catch (error) {
        return {
          success: false,
          error: error as Error,
        };
      }
    },
  };

  return chain;
}

/**
 * Execute compiled DSL operations
 * @param compiled - Compiled operations from compileDslToOperations
 * @param options - Runtime options
 */
import type { InputSource, ExecutionResult } from "@affectjs/core";

/**
 * Execute compiled DSL operations
 * @param dsl - Compiled operations or DSL object
 * @param inputs - Optional virtual input sources
 */
export async function execute(
  dsl:
    | {
        input: string;
        output?: string;
        mediaType?: "auto" | "video" | "audio" | "image";
        operations: Operation[];
      }
    | string,
  inputs?: Record<string, InputSource>
): Promise<Result> {
  // TODO: Handle string compilation if dsl is string
  // TODO: Handle inputs (write to temp files for Node backend)
  const compiled = typeof dsl === "string" ? JSON.parse(dsl) : dsl; // Simplified
  const options: RuntimeOptions = {}; // Logic to extracting options if needed

  try {
    const { input, output, operations } = compiled;

    // Build affect chain with options (for progress tracking)
    let chain = affect(input, options);

    // Apply all operations
    for (const op of operations) {
      if (op.type === "save") {
        chain = chain.save(op.path || output || "");
      } else if (op.type === "resize") {
        chain = chain.resize(op.width, op.height);
      } else if (op.type === "encode") {
        chain = chain.encode(op.codec, op.param);
      } else if (op.type === "filter") {
        chain = chain.filter(op.name, op.value);
      } else if (op.type === "crop") {
        // Crop always uses x, y, width, height format
        chain = chain.crop(op.x, op.y, op.width, op.height);
      } else if (op.type === "rotate") {
        chain = chain.rotate(op.angle);
      } else if (op.type === "if") {
        // Handle conditional operations at runtime
        // First get metadata to evaluate condition
        const metadata = await chain.getMetadata();

        // Evaluate condition (simplified - full implementation would need expression evaluator)
        const conditionMet = evaluateCondition(op.condition, metadata);

        if (conditionMet) {
          // Apply then operations
          for (const thenOp of op.thenOperations || []) {
            chain = applyOperationToChain(chain, thenOp);
          }
        } else {
          // Apply else operations
          for (const elseOp of op.elseOperations || []) {
            chain = applyOperationToChain(chain, elseOp);
          }
        }
      }
      // Add other operation types as needed
    }

    // Execute
    const result = await chain.execute();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error as Error,
    };
  }
}

/**
 * Helper to apply operation to chain
 */
function applyOperationToChain(chain: any, op: Operation): any {
  if (op.type === "resize") {
    return chain.resize(op.width, op.height);
  } else if (op.type === "encode") {
    return chain.encode(op.codec, op.param);
  } else if (op.type === "filter") {
    return chain.filter(op.name, op.value);
  } else if (op.type === "crop") {
    if (op.region) {
      return chain.crop(op.region, op.y || "auto", op.width, op.height);
    } else {
      return chain.crop(op.x || "center", op.y || "auto", op.width, op.height);
    }
  } else if (op.type === "rotate") {
    return chain.rotate(op.angle);
  }
  return chain;
}

/**
 * Evaluate condition (simplified - would need full expression evaluator)
 */
function evaluateCondition(condition: any, metadata: any): boolean {
  // Simplified condition evaluation
  // Full implementation would need to handle all comparison operators, logical operators, etc.
  if (!condition) return true;

  if (condition.type === "Comparison") {
    const left = resolveConditionValue(condition.left, metadata);
    const right = resolveConditionValue(condition.right, metadata);

    switch (condition.operator) {
      case ">":
        return left > right;
      case "<":
        return left < right;
      case ">=":
        return left >= right;
      case "<=":
        return left <= right;
      case "==":
        return left == right;
      case "!=":
        return left != right;
      default:
        return false;
    }
  }

  return false;
}

/**
 * Resolve condition value from metadata or literal
 */
function resolveConditionValue(value: any, metadata: any): any {
  if (value && typeof value === "object") {
    if (value.type === "Property") {
      return metadata[value.name];
    }
  }
  return value;
}

/**
 * Batch process multiple files
 * Supports parallel processing when options.parallel is true
 */
export async function affectBatch(
  items: Array<{
    input: string;
    output: string;
    operations: Operation[];
  }>,
  options?: RuntimeOptions
): Promise<Result[]> {
  const results: Result[] = [];
  const progressCallback = options?.progress;
  const parallel = options?.parallel ?? false;
  const total = items.length;

  // Report initial progress
  if (progressCallback) {
    progressCallback({
      percent: 0,
      current: 0,
      total,
      message: `Starting batch processing of ${total} items...`,
    });
  }

  if (parallel) {
    // Parallel processing: process all items concurrently
    const promises = items.map(async (item, index) => {
      try {
        const mediaType = detectMediaType(item.input);
        const context: ExecutionContext = {
          input: item.input,
          output: item.output,
          mediaType,
          operations: item.operations,
        };
        const backend = getBackend(mediaType, item.input, item.operations);
        const result = await backend.execute(item.operations[0], context);

        // Report progress
        if (progressCallback) {
          progressCallback({
            percent: Math.round(((index + 1) / total) * 100),
            current: index + 1,
            total,
            message: `Processed ${item.input}`,
          });
        }

        return result;
      } catch (error) {
        if (progressCallback) {
          progressCallback({
            percent: Math.round(((index + 1) / total) * 100),
            current: index + 1,
            total,
            message: `Error processing ${item.input}`,
          });
        }
        return {
          success: false,
          error: error as Error,
        };
      }
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  } else {
    // Sequential processing: process items one by one
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const mediaType = detectMediaType(item.input);
        const context: ExecutionContext = {
          input: item.input,
          output: item.output,
          mediaType,
          operations: item.operations,
        };
        const backend = getBackend(mediaType, item.input, item.operations);
        const result = await backend.execute(item.operations[0], context);
        results.push(result);

        // Report progress
        if (progressCallback) {
          progressCallback({
            percent: Math.round(((i + 1) / total) * 100),
            current: i + 1,
            total,
            message: `Processed ${item.input}`,
          });
        }
      } catch (error) {
        results.push({
          success: false,
          error: error as Error,
        });

        if (progressCallback) {
          progressCallback({
            percent: Math.round(((i + 1) / total) * 100),
            current: i + 1,
            total,
            message: `Error processing ${item.input}`,
          });
        }
      }
    }
  }

  // Report completion
  if (progressCallback) {
    progressCallback({
      percent: 100,
      current: total,
      total,
      message: `Batch processing completed`,
    });
  }

  return results;
}
