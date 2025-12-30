/**
 * @affectjs/affect - Backend Router
 *
 * Routes operations to appropriate backend based on media type
 */

import { extname } from "path";
import type { MediaType, Operation, Backend } from "./types";
import { fluentFfmpegBackend } from "./backends/fluent-ffmpeg";
import { sharpBackend } from "./backends/sharp";

/**
 * Detect media type from file path
 */
export function detectMediaType(filePath: string): MediaType {
    const ext = extname(filePath).toLowerCase();
    const imageExts = [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".gif",
        ".svg",
        ".bmp",
        ".tiff",
    ];
    const videoExts = [
        ".mp4",
        ".avi",
        ".mov",
        ".mkv",
        ".webm",
        ".flv",
        ".wmv",
        ".m4v",
    ];
    const audioExts = [".mp3", ".wav", ".aac", ".ogg", ".flac", ".m4a", ".wma"];

    if (imageExts.includes(ext)) return "image";
    if (videoExts.includes(ext)) return "video";
    if (audioExts.includes(ext)) return "audio";

    throw new Error(`Unsupported media type: ${ext}`);
}

/**
 * Get appropriate backend for media type and operations
 */
export function getBackend(
    mediaType: MediaType,
    operations: Operation[]
): Backend {
    // Image operations always use sharp
    if (mediaType === "image") {
        return sharpBackend;
    }

    // Video and audio operations use fluent-ffmpeg
    if (mediaType === "video" || mediaType === "audio") {
        return fluentFfmpegBackend;
    }

    // Default to fluent-ffmpeg for unknown types
    return fluentFfmpegBackend;
}
