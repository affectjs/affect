/**
 * @affectjs/runtime - Runtime Engine
 *
 * Core runtime for executing media processing operations
 */

import type { Operation, Result, RuntimeOptions } from "./types";
import { detectMediaType } from "./router";
import { getBackend } from "./router";

/**
 * Main affect function - creates a media processing chain
 */
export function affect(input: string, options?: RuntimeOptions) {
  const mediaType = detectMediaType(input);
  const operations: Operation[] = [];
  let outputPath: string | undefined;
  const progressCallback = options?.progress;

  const backend = getBackend(mediaType, input, operations);
  let command: unknown = backend.createCommand(input, mediaType);

  const chain = {
    resize(width: number | string, height?: number | string) {
      const op: Operation = { type: "resize", width, height };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    encode(codec: string, param?: number | string) {
      const op: Operation = { type: "encode", codec, param };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    filter(name: string, value?: number | string) {
      const op: Operation = { type: "filter", name, value };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    crop(x: number | string, y: number | string, width: number, height: number) {
      const op: Operation = { type: "crop", x, y, width, height };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    rotate(angle: number, flip?: string) {
      const op: Operation = { type: "rotate", angle, flip };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    videoCodec(codec: string) {
      const op: Operation = { type: "videoCodec", codec };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    videoBitrate(bitrate: string | number) {
      const op: Operation = { type: "videoBitrate", bitrate };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    size(size: string) {
      const op: Operation = { type: "size", size };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    fps(fps: number) {
      const op: Operation = { type: "fps", fps };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    noVideo() {
      const op: Operation = { type: "noVideo" };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    audioCodec(codec: string) {
      const op: Operation = { type: "audioCodec", codec };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    audioBitrate(bitrate: string | number) {
      const op: Operation = { type: "audioBitrate", bitrate };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    audioChannels(channels: number) {
      const op: Operation = { type: "audioChannels", channels };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    audioFrequency(frequency: number) {
      const op: Operation = { type: "audioFrequency", frequency };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    noAudio() {
      const op: Operation = { type: "noAudio" };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    format(fmt: string) {
      const op: Operation = { type: "format", format: fmt };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    options(opts: { timeout?: number; [key: string]: unknown }) {
      const op: Operation = { type: "options", options: opts };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    outputOptions(opts: string | string[]) {
      const optsArray = Array.isArray(opts) ? opts : [opts];
      const op: Operation = { type: "outputOptions", options: optsArray };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    save(path: string) {
      outputPath = path;
      const op: Operation = { type: "save", path };
      operations.push(op);
      if (command) {
        command = backend.applyOperation(command, op, mediaType);
      }
      return chain;
    },

    async getMetadata(): Promise<unknown> {
      return backend.getMetadata(input);
    },

    async execute(): Promise<Result> {
      try {
        let cmd = command || backend.createCommand(input, mediaType);

        for (const op of operations) {
          if (op.type !== "save") {
            cmd = backend.applyOperation(cmd, op, mediaType);
          }
        }

        if (backend.name === "fluent-ffmpeg") {
          if (progressCallback) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (cmd as any).on("progress", (progress: { percent?: number }) => {
              const percent = progress.percent || 0;
              progressCallback({
                percent: Math.min(100, Math.max(0, percent)),
                current: 1,
                total: 1,
                message: `Processing ${mediaType}...`,
              });
            });
          }

          if (!outputPath) {
            await new Promise<void>((resolve, reject) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (cmd as any).on("end", () => resolve());
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (cmd as any).on("error", (err: Error) => reject(err));
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (cmd as any).run();
            });
          }
          return {
            success: true,
            output: outputPath,
          };
        } else if (backend.name === "sharp") {
          if (progressCallback) {
            progressCallback({
              percent: 50,
              current: 1,
              total: 1,
              message: `Processing image...`,
            });
          }

          if (outputPath) {
            await (cmd as unknown as { toFile: (p: string) => Promise<void> }).toFile(outputPath);
          } else {
            await (cmd as unknown as { toBuffer: () => Promise<void> }).toBuffer();
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

export type AffectChain = ReturnType<typeof affect>;

export async function execute(
  dsl:
    | {
        input: string;
        output?: string;
        mediaType?: "auto" | "video" | "audio" | "image";
        operations: Operation[];
      }
    | string
): Promise<Result> {
  const compiled = typeof dsl === "string" ? JSON.parse(dsl) : dsl;
  const options: RuntimeOptions = {};

  try {
    const { input, operations } = compiled as {
      input: string;
      output: string;
      operations: Operation[];
    };
    let chain = affect(input, options);

    for (const op of operations) {
      if (op.type === "save") {
        chain = chain.save(op.path);
      } else if (op.type === "resize") {
        chain = chain.resize(op.width, op.height);
      } else if (op.type === "encode") {
        chain = chain.encode(op.codec, op.param);
      } else if (op.type === "filter") {
        chain = chain.filter(op.name, op.value);
      } else if (op.type === "crop") {
        chain = chain.crop(
          op.x || "center",
          op.y || "auto",
          op.width as number,
          op.height as number
        );
      } else if (op.type === "rotate") {
        chain = chain.rotate(op.angle);
      } else if (op.type === "if") {
        const metadata = await chain.getMetadata();
        const conditionMet = evaluateCondition(op.condition, metadata);

        if (conditionMet) {
          for (const thenOp of op.thenOperations || []) {
            chain = applyOperationToChain(chain, thenOp);
          }
        } else {
          for (const elseOp of op.elseOperations || []) {
            chain = applyOperationToChain(chain, elseOp);
          }
        }
      }
    }

    return await chain.execute();
  } catch (error) {
    return {
      success: false,
      error: error as Error,
    };
  }
}

function applyOperationToChain(chain: AffectChain, op: Operation): AffectChain {
  if (op.type === "resize") {
    return chain.resize(op.width, op.height);
  } else if (op.type === "encode") {
    return chain.encode(op.codec, op.param);
  } else if (op.type === "filter") {
    return chain.filter(op.name, op.value);
  } else if (op.type === "crop") {
    return chain.crop(op.x || "center", op.y || "auto", op.width as number, op.height as number);
  } else if (op.type === "rotate") {
    return chain.rotate(op.angle);
  }
  return chain;
}

function evaluateCondition(condition: unknown, metadata: unknown): boolean {
  if (!condition) return true;

  const cond = condition as { type: string; left: unknown; right: unknown; operator: string };
  if (cond.type === "Comparison") {
    const left = resolveConditionValue(cond.left, metadata);
    const right = resolveConditionValue(cond.right, metadata);

    switch (cond.operator) {
      case ">":
        return (left as number) > (right as number);
      case "<":
        return (left as number) < (right as number);
      case ">=":
        return (left as number) >= (right as number);
      case "<=":
        return (left as number) <= (right as number);
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

function resolveConditionValue(value: unknown, metadata: unknown): unknown {
  if (value && typeof value === "object") {
    const val = value as { type: string; name: string };
    if (val.type === "Property") {
      return (metadata as Record<string, unknown>)[val.name];
    }
  }
  return value;
}

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

  if (progressCallback) {
    progressCallback({
      percent: 0,
      current: 0,
      total,
      message: `Starting batch processing...`,
    });
  }

  if (parallel) {
    const promises = items.map(async (item, index) => {
      try {
        let chain = affect(item.input, options);
        for (const op of item.operations) {
          if (op.type === "save") continue;
          chain = applyOperationToChain(chain, op);
        }
        const result = await chain.save(item.output).execute();
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
        return {
          success: false,
          error: error as Error,
        };
      }
    });

    return Promise.all(promises);
  } else {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        let chain = affect(item.input, options);
        for (const op of item.operations) {
          if (op.type === "save") continue;
          chain = applyOperationToChain(chain, op);
        }
        const result = await chain.save(item.output).execute();
        results.push(result);
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
      }
    }
  }

  return results;
}
