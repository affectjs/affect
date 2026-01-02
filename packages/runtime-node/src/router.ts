/**
 * @affectjs/runtime - Backend Router
 *
 * Routes operations to appropriate backend based on media type and format
 */

import { extname } from "path";
import type { MediaType, Operation, Backend } from "./types";
import { fluentFfmpegBackend } from "./backends/ffmpeg";
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
 * Get appropriate backend for media type and file path
 * Selects backend based on supported formats
 */
export function getBackend(
    mediaType: MediaType,
    filePath: string,
    operations: Operation[] = []
): Backend {
    const backends = [fluentFfmpegBackend, sharpBackend];
    
    // Find backend that supports the media type and file format
    for (const backend of backends) {
        if (backend.supportedTypes.includes(mediaType)) {
            if (backend.supportsFormat(filePath, mediaType)) {
                return backend;
            }
        }
    }
    
    // If no backend supports the format, throw error
    const lastDot = filePath.lastIndexOf(".");
    const ext = lastDot === -1 ? "(no extension)" : filePath.substring(lastDot);
    const supportedFormats = backends
        .filter(b => b.supportedTypes.includes(mediaType))
        .map(b => b.supportedFormats[mediaType] || [])
        .flat()
        .filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
        .join(", ");
    
    throw new Error(
        `No backend supports ${mediaType} format: ${ext}. ` +
        `Supported formats: ${supportedFormats || "none"}`
    );
}
