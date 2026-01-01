import { describe, it, expect, vi, beforeEach } from "vitest";
import { HeifBackend } from "../heif";

// Mock wasm-heif
vi.mock("@saschazar/wasm-heif", () => {
  return {
    default: vi.fn(async () => ({
      FS: {
        readFile: vi.fn(() => new Uint8Array([1, 2, 3])),
        writeFile: vi.fn(),
      },
      decode: vi.fn(() => ({
        data: new Uint8Array([255, 0, 0]),
        dimensions: { width: 100, height: 100 },
      })),
    })),
  };
});

describe("HeifBackend", () => {
  let backend: HeifBackend;

  beforeEach(() => {
    backend = new HeifBackend();
  });

  it("should initialize and decode heif file", async () => {
    const result = await backend.execute([], {
      input: "test.heic",
      mediaType: "image",
      operations: [],
    });

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result[0]).toBe(255);
  });
});
