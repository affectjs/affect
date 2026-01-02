/**
 * @affectjs/runtime - Router Tests
 *
 * Tests for backend routing logic
 */

import { describe, it, expect } from "vitest";
import { detectMediaType, getBackend } from "../src/router";
import { fluentFfmpegBackend } from "../src/backends/ffmpeg";
import { sharpBackend } from "../src/backends/sharp";

describe("Router", () => {
    describe("detectMediaType()", () => {
        it("should detect image types", () => {
            expect(detectMediaType("image.jpg")).toBe("image");
            expect(detectMediaType("image.jpeg")).toBe("image");
            expect(detectMediaType("image.png")).toBe("image");
            expect(detectMediaType("image.webp")).toBe("image");
            expect(detectMediaType("image.gif")).toBe("image");
            expect(detectMediaType("image.svg")).toBe("image");
            expect(detectMediaType("image.bmp")).toBe("image");
            expect(detectMediaType("image.tiff")).toBe("image");
        });

        it("should detect video types", () => {
            expect(detectMediaType("video.mp4")).toBe("video");
            expect(detectMediaType("video.avi")).toBe("video");
            expect(detectMediaType("video.mov")).toBe("video");
            expect(detectMediaType("video.mkv")).toBe("video");
            expect(detectMediaType("video.webm")).toBe("video");
            expect(detectMediaType("video.flv")).toBe("video");
            expect(detectMediaType("video.wmv")).toBe("video");
            expect(detectMediaType("video.m4v")).toBe("video");
        });

        it("should detect audio types", () => {
            expect(detectMediaType("audio.mp3")).toBe("audio");
            expect(detectMediaType("audio.wav")).toBe("audio");
            expect(detectMediaType("audio.aac")).toBe("audio");
            expect(detectMediaType("audio.ogg")).toBe("audio");
            expect(detectMediaType("audio.flac")).toBe("audio");
            expect(detectMediaType("audio.m4a")).toBe("audio");
            expect(detectMediaType("audio.wma")).toBe("audio");
        });

        it("should handle case-insensitive extensions", () => {
            expect(detectMediaType("IMAGE.JPG")).toBe("image");
            expect(detectMediaType("VIDEO.MP4")).toBe("video");
            expect(detectMediaType("Audio.Mp3")).toBe("audio");
        });

        it("should throw error for unsupported types", () => {
            expect(() => detectMediaType("file.txt")).toThrow(
                "Unsupported media type"
            );
            expect(() => detectMediaType("file.doc")).toThrow(
                "Unsupported media type"
            );
            expect(() => detectMediaType("file")).toThrow(
                "Unsupported media type"
            );
        });
    });

    describe("getBackend()", () => {
        it("should return sharp backend for image media type with supported format", () => {
            const backend = getBackend("image", "test.jpg", []);
            expect(backend).toBe(sharpBackend);
            expect(backend.name).toBe("sharp");
        });

        it("should return fluent-ffmpeg backend for video media type with supported format", () => {
            const backend = getBackend("video", "test.mp4", []);
            expect(backend).toBe(fluentFfmpegBackend);
            expect(backend.name).toBe("fluent-ffmpeg");
        });

        it("should return fluent-ffmpeg backend for audio media type with supported format", () => {
            const backend = getBackend("audio", "test.mp3", []);
            expect(backend).toBe(fluentFfmpegBackend);
            expect(backend.name).toBe("fluent-ffmpeg");
        });

        it("should throw error for unsupported format", () => {
            expect(() => {
                getBackend("image", "test.xyz", []);
            }).toThrow("No backend supports");
        });

        it("should return backend based on format support", () => {
            const backend1 = getBackend("video", "test.avi", [
                { type: "resize", width: 1280, height: 720 },
            ]);
            expect(backend1).toBe(fluentFfmpegBackend);

            const backend2 = getBackend("audio", "test.wav", [
                { type: "encode", codec: "aac" },
            ]);
            expect(backend2).toBe(fluentFfmpegBackend);
        });
    });
});

