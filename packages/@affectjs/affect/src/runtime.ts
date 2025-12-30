/**
 * @affectjs/affect - Runtime Engine
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
export function affect(input: string) {
    const mediaType = detectMediaType(input);
    const operations: Operation[] = [];
    let outputPath: string | undefined;
    let outputOptions: string[] = [];
    let format: string | undefined;
    let timeout: number | undefined;

    // Get backend instance
    const backend = getBackend(mediaType, operations);

    // Create backend command instance
    let command: any;
    if (backend.name === "fluent-ffmpeg") {
        // @ts-ignore - fluent-ffmpeg types
        const ffmpeg = require("@luban-ws/fluent-ffmpeg");
        command = ffmpeg(input);
    } else if (backend.name === "sharp") {
        const sharp = require("sharp");
        command = sharp(input);
    }

    const chain = {
        // Unified operations
        resize(width: number | string, height?: number | string) {
            operations.push({ type: "resize", width, height });
            if (backend.name === "fluent-ffmpeg") {
                const sizeStr = height
                    ? `${width}x${height}`
                    : width === "auto"
                    ? "auto"
                    : `${width}x?`;
                command = command.size(sizeStr);
            } else if (backend.name === "sharp") {
                const w = width === "auto" ? null : Number(width);
                const h = height === "auto" || !height ? null : Number(height);
                command = command.resize(w, h);
            }
            return chain;
        },

        encode(codec: string, param?: number | string) {
            operations.push({ type: "encode", codec, param });
            if (backend.name === "fluent-ffmpeg") {
                // For video/audio, encode maps to videoCodec/audioCodec
                if (mediaType === "video") {
                    command = command.videoCodec(codec);
                    if (param) {
                        command = command.videoBitrate(String(param));
                    }
                } else if (mediaType === "audio") {
                    command = command.audioCodec(codec);
                    if (param) {
                        command = command.audioBitrate(String(param));
                    }
                }
            } else if (backend.name === "sharp") {
                // For images, encode maps to format
                command = command.toFormat(
                    codec,
                    param ? { quality: Number(param) } : {}
                );
            }
            return chain;
        },

        filter(name: string, value?: number | string) {
            operations.push({ type: "filter", name, value });
            if (backend.name === "fluent-ffmpeg") {
                const filterStr =
                    value !== undefined && value !== null
                        ? `${name}=${value}`
                        : name;
                command = command.videoFilters(filterStr);
            } else if (backend.name === "sharp") {
                // Map common filters to sharp methods
                switch (name) {
                    case "grayscale":
                        command = command.greyscale();
                        break;
                    case "blur":
                        command = command.blur(value ? Number(value) : 1);
                        break;
                    case "brightness":
                        command = command.modulate({
                            brightness: value ? Number(value) : 1,
                        });
                        break;
                    case "saturate":
                        command = command.modulate({
                            saturation: value ? Number(value) : 1,
                        });
                        break;
                    default:
                        // Generic filter - try to apply as sharp operation
                        if (value !== undefined && value !== null) {
                            command =
                                (command as any)[name]?.(Number(value)) ||
                                command;
                        } else {
                            command = (command as any)[name]?.() || command;
                        }
                }
            }
            return chain;
        },

        crop(
            x: number | string,
            y: number | string,
            width: number,
            height: number
        ) {
            operations.push({ type: "crop", x, y, width, height });
            if (backend.name === "fluent-ffmpeg") {
                if (x === "center") {
                    command = command.videoFilters(`crop=${width}:${height}`);
                } else {
                    const xVal = typeof x === "string" ? x : x;
                    const yVal =
                        y === "auto" ? 0 : typeof y === "string" ? y : y;
                    command = command.videoFilters(
                        `crop=${width}:${height}:${xVal}:${yVal}`
                    );
                }
            } else if (backend.name === "sharp") {
                const left = x === "center" ? 0 : Number(x);
                const top = y === "auto" ? 0 : Number(y);
                command = command.extract({ left, top, width, height });
            }
            return chain;
        },

        rotate(angle: number, flip?: string) {
            operations.push({ type: "rotate", angle, flip });
            if (backend.name === "fluent-ffmpeg") {
                command = command.videoFilters(
                    `rotate=${(angle * Math.PI) / 180}`
                );
                if (flip) {
                    command = command.videoFilters(
                        flip === "horizontal" ? "hflip" : "vflip"
                    );
                }
            } else if (backend.name === "sharp") {
                command = command.rotate(angle);
                if (flip === "horizontal") {
                    command = command.flop();
                } else if (flip === "vertical") {
                    command = command.flip();
                }
            }
            return chain;
        },

        // Video-specific operations
        videoCodec(codec: string) {
            operations.push({ type: "videoCodec", codec });
            if (backend.name === "fluent-ffmpeg") {
                command = command.videoCodec(codec);
            }
            return chain;
        },

        videoBitrate(bitrate: string | number) {
            operations.push({ type: "videoBitrate", bitrate });
            if (backend.name === "fluent-ffmpeg") {
                command = command.videoBitrate(String(bitrate));
            }
            return chain;
        },

        size(size: string) {
            operations.push({ type: "size", size });
            if (backend.name === "fluent-ffmpeg") {
                command = command.size(size);
            }
            return chain;
        },

        fps(fps: number) {
            operations.push({ type: "fps", fps });
            if (backend.name === "fluent-ffmpeg") {
                command = command.fps(fps);
            }
            return chain;
        },

        noVideo() {
            operations.push({ type: "noVideo" });
            if (backend.name === "fluent-ffmpeg") {
                command = command.noVideo();
            }
            return chain;
        },

        // Audio-specific operations
        audioCodec(codec: string) {
            operations.push({ type: "audioCodec", codec });
            if (backend.name === "fluent-ffmpeg") {
                command = command.audioCodec(codec);
            }
            return chain;
        },

        audioBitrate(bitrate: string | number) {
            operations.push({ type: "audioBitrate", bitrate });
            if (backend.name === "fluent-ffmpeg") {
                command = command.audioBitrate(String(bitrate));
            }
            return chain;
        },

        audioChannels(channels: number) {
            operations.push({ type: "audioChannels", channels });
            if (backend.name === "fluent-ffmpeg") {
                command = command.audioChannels(channels);
            }
            return chain;
        },

        audioFrequency(frequency: number) {
            operations.push({ type: "audioFrequency", frequency });
            if (backend.name === "fluent-ffmpeg") {
                command = command.audioFrequency(frequency);
            }
            return chain;
        },

        noAudio() {
            operations.push({ type: "noAudio" });
            if (backend.name === "fluent-ffmpeg") {
                command = command.noAudio();
            }
            return chain;
        },

        // Options
        format(fmt: string) {
            format = fmt;
            operations.push({ type: "format", format: fmt });
            if (backend.name === "fluent-ffmpeg") {
                command = command.format(fmt);
            }
            return chain;
        },

        options(opts: { timeout?: number; [key: string]: any }) {
            if (opts.timeout) {
                timeout = opts.timeout;
            }
            operations.push({ type: "options", options: opts });
            if (backend.name === "fluent-ffmpeg") {
                if (opts.timeout) {
                    command = command.outputOptions([`-t ${opts.timeout}`]);
                }
            }
            return chain;
        },

        outputOptions(opts: string | string[]) {
            const optsArray = Array.isArray(opts) ? opts : [opts];
            outputOptions.push(...optsArray);
            operations.push({ type: "outputOptions", options: optsArray });
            if (backend.name === "fluent-ffmpeg") {
                command = command.outputOptions(optsArray);
            }
            return chain;
        },

        // Save and execute
        save(path: string) {
            outputPath = path;
            operations.push({ type: "save", path });
            if (backend.name === "fluent-ffmpeg") {
                command = command.save(path);
            } else if (backend.name === "sharp") {
                command = command.toFile(path);
            }
            return chain;
        },

        // Get metadata for conditional logic
        async getMetadata(): Promise<any> {
            if (backend.name === "fluent-ffmpeg") {
                // @ts-ignore
                const ffmpeg = require("@luban-ws/fluent-ffmpeg");
                return new Promise((resolve, reject) => {
                    ffmpeg.ffprobe(input, (err: Error, metadata: any) => {
                        if (err) reject(err);
                        else {
                            // Extract useful metadata
                            const videoStream = metadata.streams?.find(
                                (s: any) => s.codec_type === "video"
                            );
                            const audioStream = metadata.streams?.find(
                                (s: any) => s.codec_type === "audio"
                            );
                            resolve({
                                width: videoStream?.width,
                                height: videoStream?.height,
                                duration: metadata.format?.duration,
                                size: metadata.format?.size,
                                bitrate: metadata.format?.bit_rate,
                                codec:
                                    videoStream?.codec_name ||
                                    audioStream?.codec_name,
                                fps: videoStream?.r_frame_rate
                                    ? eval(videoStream.r_frame_rate)
                                    : undefined,
                            });
                        }
                    });
                });
            } else if (backend.name === "sharp") {
                const sharp = require("sharp");
                const metadata = await sharp(input).metadata();
                return {
                    width: metadata.width,
                    height: metadata.height,
                    format: metadata.format,
                    size: metadata.size,
                };
            }
            throw new Error(`Unsupported backend: ${backend.name}`);
        },

        async execute(): Promise<Result> {
            try {
                if (backend.name === "fluent-ffmpeg") {
                    // fluent-ffmpeg's save() already executes
                    if (!outputPath) {
                        // If no save() was called, we need to execute manually
                        await new Promise((resolve, reject) => {
                            command.on("end", resolve);
                            command.on("error", reject);
                            command.run();
                        });
                    }
                    return {
                        success: true,
                        output: outputPath,
                    };
                } else if (backend.name === "sharp") {
                    // sharp's toFile() already executes
                    if (!outputPath) {
                        await command.toBuffer();
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
 * Execute compiled DSL code
 */
export async function execute(
    compiledCode: string,
    options?: RuntimeOptions
): Promise<Result> {
    try {
        // Replace require('@affectjs/affect') with direct affect reference
        // This avoids module resolution issues
        const modifiedCode = compiledCode.replace(
            /const\s+\{\s*affect\s*\}\s*=\s*require\(['"]@affectjs\/affect['"]\);/g,
            "// affect function injected from runtime"
        );

        // Wrap in async function and inject affect
        const wrappedCode = `
            (async function(affect) {
                ${modifiedCode}
            })
        `;

        // Create execution function with affect in scope
        const executeFn = new Function("affect", `return ${wrappedCode}`);
        const asyncFn = executeFn(affect);

        const result = await asyncFn(affect);
        return {
            success: true,
            output: result?.output,
            metadata: result?.metadata,
        };
    } catch (error) {
        return {
            success: false,
            error: error as Error,
        };
    }
}

/**
 * Batch process multiple files
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

    for (const item of items) {
        const mediaType = detectMediaType(item.input);
        const context: ExecutionContext = {
            input: item.input,
            output: item.output,
            mediaType,
            operations: item.operations,
        };
        const backend = getBackend(mediaType, item.operations);
        const result = await backend.execute(item.operations[0], context);
        results.push(result);
    }

    return results;
}
