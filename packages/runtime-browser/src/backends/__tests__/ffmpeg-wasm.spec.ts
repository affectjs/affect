import { describe, it, expect, vi, beforeEach } from "vitest";
import { FFmpegWasmBackend } from "../ffmpeg-wasm";

// Mock FFmpeg
vi.mock("@ffmpeg/ffmpeg", () => {
  return {
    FFmpeg: vi.fn().mockImplementation(() => ({
      load: vi.fn(),
      exec: vi.fn(),
      readFile: vi.fn(() => new Uint8Array([1, 2, 3])),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    })),
  };
});

vi.mock("@ffmpeg/util", () => ({
  toBlobURL: vi.fn(async (url) => url),
}));

describe("FFmpegWasmBackend", () => {
  let backend: FFmpegWasmBackend;

  beforeEach(() => {
    backend = new FFmpegWasmBackend();
  });

  it("should initialize and execute ffmpeg command", async () => {
    const result = await backend.execute([{ type: "trim", start: 0, duration: 5 } as any], {
      input: "input.mp4",
      mediaType: "video",
      operations: [],
      onLog: vi.fn(),
    });

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(3);
  });
});
