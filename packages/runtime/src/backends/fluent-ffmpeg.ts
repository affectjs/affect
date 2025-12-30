/**
 * @affectjs/runtime - Fluent-FFmpeg Backend Adapter
 *
 * Adapter for @affectjs/fluent-ffmpeg backend
 */

import type { Backend, Operation, ExecutionContext, Result, MediaType } from "../types";
// @ts-ignore - CommonJS module
import ffmpeg from "@affectjs/fluent-ffmpeg";

export const fluentFfmpegBackend: Backend = {
    name: "fluent-ffmpeg",
    supportedTypes: ["video", "audio"] as const,
    supportedFormats: {
        video: [".mp4", ".avi", ".mov", ".mkv", ".webm", ".flv", ".wmv", ".m4v", ".3gp", ".ogv"],
        audio: [".mp3", ".wav", ".aac", ".ogg", ".flac", ".m4a", ".wma", ".opus", ".amr"],
    },

    canHandle(operation: Operation, mediaType: string): boolean {
        return mediaType === "video" || mediaType === "audio";
    },

    supportsFormat(filePath: string, mediaType: MediaType): boolean {
        const lastDot = filePath.lastIndexOf(".");
        if (lastDot === -1) return false;
        const ext = filePath.substring(lastDot).toLowerCase();
        const formats = this.supportedFormats[mediaType] || [];
        return formats.includes(ext);
    },

    createCommand(input: string, mediaType: MediaType): any {
        return ffmpeg(input);
    },

    applyOperation(command: any, operation: Operation, mediaType: MediaType): any {
        switch (operation.type) {
            case "resize":
                if (operation.width && operation.height) {
                    return command.size(`${operation.width}x${operation.height}`);
                } else if (operation.width) {
                    return command.size(`${operation.width}x?`);
                }
                break;
            case "encode":
                if (mediaType === "video") {
                    command = command.videoCodec(operation.codec);
                    if (operation.param) {
                        command = command.videoBitrate(String(operation.param));
                    }
                } else if (mediaType === "audio") {
                    command = command.audioCodec(operation.codec);
                    if (operation.param) {
                        command = command.audioBitrate(String(operation.param));
                    }
                }
                break;
            case "filter":
                const filterStr =
                    operation.value !== undefined && operation.value !== null
                        ? `${operation.name}=${operation.value}`
                        : operation.name;
                return command.videoFilters(filterStr);
            case "crop":
                if (operation.x === "center") {
                    return command.videoFilters(`crop=${operation.width}:${operation.height}`);
                } else {
                    const yVal = operation.y === "auto" ? 0 : operation.y;
                    return command.videoFilters(`crop=${operation.width}:${operation.height}:${operation.x}:${yVal}`);
                }
            case "rotate":
                command = command.videoFilters(`rotate=${(operation.angle * Math.PI) / 180}`);
                if (operation.flip) {
                    command = command.videoFilters(operation.flip === "horizontal" ? "hflip" : "vflip");
                }
                break;
            case "videoCodec":
                return command.videoCodec(operation.codec);
            case "videoBitrate":
                return command.videoBitrate(String(operation.bitrate));
            case "audioCodec":
                return command.audioCodec(operation.codec);
            case "audioBitrate":
                return command.audioBitrate(String(operation.bitrate));
            case "format":
                return command.format(operation.format);
            case "size":
                return command.size(operation.size);
            case "fps":
                return command.fps(operation.fps);
            case "noVideo":
                return command.noVideo();
            case "noAudio":
                return command.noAudio();
            case "audioChannels":
                return command.audioChannels(operation.channels);
            case "audioFrequency":
                return command.audioFrequency(operation.frequency);
            case "outputOptions":
                return command.outputOptions(operation.options);
            case "save":
                return command.save(operation.path);
        }
        return command;
    },

    async getMetadata(input: string): Promise<any> {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(input, (err: Error, metadata: any) => {
                if (err) reject(err);
                else {
                    const videoStream = metadata.streams?.find((s: any) => s.codec_type === "video");
                    const audioStream = metadata.streams?.find((s: any) => s.codec_type === "audio");
                    resolve({
                        width: videoStream?.width,
                        height: videoStream?.height,
                        duration: metadata.format?.duration,
                        size: metadata.format?.size,
                        bitrate: metadata.format?.bit_rate,
                        codec: videoStream?.codec_name || audioStream?.codec_name,
                        fps: videoStream?.r_frame_rate ? eval(videoStream.r_frame_rate) : undefined,
                    });
                }
            });
        });
    },

    async execute(
        operation: Operation,
        context: ExecutionContext
    ): Promise<Result> {
        try {
            let command = ffmpeg(context.input);

            // Apply all operations from context
            for (const op of context.operations) {
                switch (op.type) {
                    case "resize":
                        if (op.width && op.height) {
                            command = command.size(`${op.width}x${op.height}`);
                        } else if (op.width) {
                            command = command.size(`${op.width}x?`);
                        }
                        break;
                    case "encode":
                        if (context.mediaType === "video") {
                            command = command.videoCodec(op.codec);
                            if (op.param) {
                                command = command.videoBitrate(String(op.param));
                            }
                        } else if (context.mediaType === "audio") {
                            command = command.audioCodec(op.codec);
                            if (op.param) {
                                command = command.audioBitrate(String(op.param));
                            }
                        }
                        break;
                    case "filter":
                        const filterStr =
                            op.value !== undefined && op.value !== null
                                ? `${op.name}=${op.value}`
                                : op.name;
                        command = command.videoFilters(filterStr);
                        break;
                    case "crop":
                        if (op.x === "center") {
                            command = command.videoFilters(
                                `crop=${op.width}:${op.height}`
                            );
                        } else {
                            const yVal = op.y === "auto" ? 0 : op.y;
                            command = command.videoFilters(
                                `crop=${op.width}:${op.height}:${op.x}:${yVal}`
                            );
                        }
                        break;
                    case "rotate":
                        command = command.videoFilters(
                            `rotate=${(op.angle * Math.PI) / 180}`
                        );
                        if (op.flip) {
                            command = command.videoFilters(
                                op.flip === "horizontal" ? "hflip" : "vflip"
                            );
                        }
                        break;
                    case "videoCodec":
                        command = command.videoCodec(op.codec);
                        break;
                    case "videoBitrate":
                        command = command.videoBitrate(String(op.bitrate));
                        break;
                    case "audioCodec":
                        command = command.audioCodec(op.codec);
                        break;
                    case "audioBitrate":
                        command = command.audioBitrate(String(op.bitrate));
                        break;
                    case "format":
                        command = command.format(op.format);
                        break;
                }
            }

            // Execute and save
            if (context.output) {
                await new Promise<void>((resolve, reject) => {
                    command
                        .on("end", () => resolve())
                        .on("error", (err: Error) => reject(err))
                        .save(context.output!);
                });

                return {
                    success: true,
                    output: context.output,
                };
            } else {
                // No output specified, just execute
                await new Promise<void>((resolve, reject) => {
                    command
                        .on("end", () => resolve())
                        .on("error", (err: Error) => reject(err))
                        .run();
                });

                return {
                    success: true,
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error as Error,
            };
        }
    },
};
