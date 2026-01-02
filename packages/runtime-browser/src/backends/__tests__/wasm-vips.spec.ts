import { describe, it, expect, vi, beforeEach } from "vitest";
import { WasmVipsBackend } from "../wasm-vips";

// Mock Vips
vi.mock("wasm-vips", () => {
  return {
    default: vi.fn(async () => ({
      Image: {
        newFromFile: vi.fn(() => ({
          width: 1000,
          height: 800,
          resize: vi.fn(() => ({
            writeToBuffer: vi.fn(() => new Uint8Array([1, 2, 3])),
            delete: vi.fn(),
          })),
          extractArea: vi.fn(() => ({
            writeToBuffer: vi.fn(() => new Uint8Array([1, 2, 3])),
            delete: vi.fn(),
          })),
          composite2: vi.fn(() => ({
            writeToBuffer: vi.fn(() => new Uint8Array([1, 2, 3])),
            delete: vi.fn(),
          })),
          delete: vi.fn(),
          writeToBuffer: vi.fn(() => new Uint8Array([1, 2, 3])),
        })),
      },
      FS: {
        writeFile: vi.fn(),
      },
      shutdown: vi.fn(),
    })),
  };
});

describe("WasmVipsBackend", () => {
  let backend: WasmVipsBackend;

  beforeEach(() => {
    backend = new WasmVipsBackend();
  });

  it("should initialize and execute resize operation", async () => {
    const result = await backend.execute([{ type: "resize", width: 500 } as unknown], {
      input: "test.jpg",
      mediaType: "image",
      operations: [],
    });

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should handle composite operation", async () => {
    const result = await backend.execute(
      [{ type: "composite", overlay: "logo.png", x: 10, y: 10 } as unknown],
      {
        input: "test.jpg",
        mediaType: "image",
        operations: [],
      }
    );

    expect(result).toBeInstanceOf(Uint8Array);
  });
});
