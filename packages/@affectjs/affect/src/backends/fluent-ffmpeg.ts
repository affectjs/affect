/**
 * @affectjs/affect - Fluent-FFmpeg Backend Adapter
 *
 * Adapter for @luban-ws/fluent-ffmpeg backend
 */

// @ts-ignore - fluent-ffmpeg types will be added later
import ffmpeg from "../../../fluent-ffmpeg";
import type { Backend, Operation, ExecutionContext, Result } from "../types";

export const fluentFfmpegBackend: Backend = {
    name: "fluent-ffmpeg",
    supportedTypes: ["video", "audio"] as const,

    canHandle(operation: Operation, mediaType: string): boolean {
        return mediaType === "video" || mediaType === "audio";
    },

    async execute(
        operation: Operation,
        context: ExecutionContext
    ): Promise<Result> {
        // TODO: Implement fluent-ffmpeg backend execution
        // This will convert operations to fluent-ffmpeg API calls
        throw new Error("Fluent-FFmpeg backend not implemented yet");
    },
};
