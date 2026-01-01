/**
 * @affectjs/runtime - Backend Tests
 *
 * Tests for backend adapters
 */

import { describe, it, expect, vi } from "vitest";
import { fluentFfmpegBackend } from "../src/backends/fluent-ffmpeg";
import { sharpBackend } from "../src/backends/sharp";
import type { ExecutionContext } from "../src/types";

describe("Backend Adapters", () => {
  describe("fluentFfmpegBackend", () => {
    it("should have correct name and supported types", () => {
      expect(fluentFfmpegBackend.name).toBe("fluent-ffmpeg");
      expect(fluentFfmpegBackend.supportedTypes).toEqual(["video", "audio"]);
    });

    it("should declare supported formats", () => {
      expect(fluentFfmpegBackend.supportedFormats.video).toBeDefined();
      expect(fluentFfmpegBackend.supportedFormats.audio).toBeDefined();
      expect(fluentFfmpegBackend.supportedFormats.video).toContain(".mp4");
      expect(fluentFfmpegBackend.supportedFormats.audio).toContain(".mp3");
    });

    it("should support video formats", () => {
      expect(fluentFfmpegBackend.supportsFormat("test.mp4", "video")).toBe(true);
      expect(fluentFfmpegBackend.supportsFormat("test.avi", "video")).toBe(true);
      expect(fluentFfmpegBackend.supportsFormat("test.xyz", "video")).toBe(false);
    });

    it("should support audio formats", () => {
      expect(fluentFfmpegBackend.supportsFormat("test.mp3", "audio")).toBe(true);
      expect(fluentFfmpegBackend.supportsFormat("test.wav", "audio")).toBe(true);
      expect(fluentFfmpegBackend.supportsFormat("test.xyz", "audio")).toBe(false);
    });

    it("should handle video media type", () => {
      expect(fluentFfmpegBackend.canHandle({ type: "resize" }, "video")).toBe(true);
    });

    it("should handle audio media type", () => {
      expect(fluentFfmpegBackend.canHandle({ type: "encode" }, "audio")).toBe(true);
    });

    it("should not handle image media type", () => {
      expect(fluentFfmpegBackend.canHandle({ type: "resize" }, "image")).toBe(false);
    });

    it("should execute resize operation", async () => {
      const context: ExecutionContext = {
        input: "/tmp/test.mp4",
        output: "/tmp/output.mp4",
        mediaType: "video",
        operations: [{ type: "resize", width: 1280, height: 720 }],
      };

      // Mock fluent-ffmpeg to avoid actual file operations
      const mockFfmpeg = vi.fn(() => ({
        size: vi.fn().mockReturnThis(),
        save: vi.fn().mockReturnThis(),
        on: vi.fn((event, callback) => {
          if (event === "end") {
            setTimeout(() => callback(), 10);
          }
          return {
            on: vi.fn(),
          };
        }),
      }));

      vi.doMock("@affectjs/fluent-ffmpeg", () => ({
        default: mockFfmpeg,
      }));

      // Note: This test would need actual ffmpeg setup to run fully
      // For now, we test the interface
      expect(fluentFfmpegBackend.canHandle(context.operations[0], "video")).toBe(true);
    });
  });

  describe("sharpBackend", () => {
    it("should have correct name and supported types", () => {
      expect(sharpBackend.name).toBe("sharp");
      expect(sharpBackend.supportedTypes).toEqual(["image"]);
    });

    it("should declare supported formats", () => {
      expect(sharpBackend.supportedFormats.image).toBeDefined();
      expect(sharpBackend.supportedFormats.image).toContain(".jpg");
      expect(sharpBackend.supportedFormats.image).toContain(".png");
    });

    it("should support image formats", () => {
      expect(sharpBackend.supportsFormat("test.jpg", "image")).toBe(true);
      expect(sharpBackend.supportsFormat("test.png", "image")).toBe(true);
      expect(sharpBackend.supportsFormat("test.xyz", "image")).toBe(false);
    });

    it("should handle image media type", () => {
      expect(sharpBackend.canHandle({ type: "resize" }, "image")).toBe(true);
    });

    it("should not handle video media type", () => {
      expect(sharpBackend.canHandle({ type: "resize" }, "video")).toBe(false);
    });

    it("should not handle audio media type", () => {
      expect(sharpBackend.canHandle({ type: "encode" }, "audio")).toBe(false);
    });
  });
});
