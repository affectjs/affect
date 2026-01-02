interface HeifModule {
  FS: {
    readFile: (path: string) => Uint8Array;
    writeFile: (path: string, data: Uint8Array) => void;
  };
  decode: (
    data: Uint8Array,
    length: number,
    channels: number
  ) => {
    data: Uint8Array;
    dimensions: { width: number; height: number };
  };
}

import type { Backend, ExecutionContext, Operation } from "../types";
// @ts-ignore
import initHeif from "@saschazar/wasm-heif";

export class HeifBackend implements Backend {
  name = "wasm-heif";
  supportedTypes = ["image"] as const;

  private heif: HeifModule | null = null;
  private ready = false;

  async initialize(): Promise<void> {
    if (this.ready) return;
    this.heif = (await initHeif()) as unknown as HeifModule;
    this.ready = true;
  }

  async execute(_operations: Operation[], context: ExecutionContext): Promise<Uint8Array> {
    if (!this.ready || !this.heif) await this.initialize();
    if (!this.heif) throw new Error("Heif not initialized");

    const { input } = context;
    console.log(`Decoding HEIF file: ${input}`);

    try {
      // In a real browser environment, 'input' is a filename in the Emscripten FS
      // wasm-heif usually takes a buffer.
      // Since we are in a worker, we should have the data already or read it.

      const data = (this.heif as unknown).FS.readFile(input);
      const decoded = (this.heif as unknown).decode(data, data.length, 3); // 3 channels (RGB)

      // decoded contains { dimensions: { width, height }, data: Uint8Array (raw pixels) }
      // For now, we return the raw pixels or encode to something else.
      // But RFC-003 implies we should return something the next stage can use.
      // If the next stage is VIPS, we might need a format it likes.

      return decoded.data;
    } catch (e) {
      console.error("HEIF decoding failed:", e);
      throw e;
    }
  }

  async writeFile(name: string, data: Uint8Array): Promise<void> {
    if (!this.ready || !this.heif) await this.initialize();
    if (!this.heif) throw new Error("Heif not initialized");
    (this.heif as unknown).FS.writeFile(name, data);
  }

  async dispose(): Promise<void> {
    this.ready = false;
  }
}
