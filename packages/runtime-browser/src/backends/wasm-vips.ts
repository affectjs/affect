import type { Backend, ExecutionContext, Operation } from "../types";
import Vips from "wasm-vips";
// @ts-ignore
import vipsWasm from "wasm-vips/vips.wasm?url";

interface VipsModule {
  Image: {
    newFromFile: (path: string) => any;
  };
  FS: {
    writeFile: (path: string, data: Uint8Array) => void;
  };
  shutdown: () => void;
}

export class WasmVipsBackend implements Backend {
  name = "wasm-vips";
  supportedTypes = ["image"] as const;

  private vips: VipsModule | null = null;
  private ready = false;

  async initialize(): Promise<void> {
    if (this.ready) return;

    // Initialize Vips with local WASM
    this.vips = (await Vips({
      locateFile: (fileName: string) => {
        if (fileName.endsWith(".wasm")) return vipsWasm;
        return fileName;
      },
    })) as unknown as VipsModule;

    this.ready = true;
  }

  async execute(operations: Operation[], context: ExecutionContext): Promise<Uint8Array> {
    if (!this.ready) await this.initialize();
    if (!this.vips) throw new Error("Vips not initialized");

    const { input } = context;
    // Note: Input is expected to be written to MEMFS by the worker/caller
    // In wasm-vips, we can load from its virtual filesystem if supported,
    // or use memory buffers.

    // For now, let's assume we use memory buffers for simplicity and performance
    // worker/index.ts should be updated to pass data or we read it here from common FS
    const vips = this.vips;

    // Placeholder: In a real implementation we would:
    // 1. Load image: let image = vips.Image.newFromFile(input);
    // 2. Iterate operations:
    //    if (op.type === 'resize') image = image.resize(op.width / image.width);
    // 3. Write to buffer: const buffer = image.writeToBuffer('.jpg');

    console.log(`Processing ${input} with ${operations.length} operations using VIPS`);

    // Minimal realish skeleton
    try {
      let image = vips.Image.newFromFile(input);

      for (const op of operations) {
        if (op.type === "resize") {
          const { width } = op as unknown as { width: number };
          const scale = width / image.width;
          const resized = image.resize(scale);
          image.delete();
          image = resized;
        } else if (op.type === "crop") {
          const { x, y, width, height } = op as unknown as {
            x: number;
            y: number;
            width: number;
            height: number;
          };
          const cropped = image.extractArea(x, y, width, height);
          image.delete();
          image = cropped;
        } else if (op.type === "composite") {
          const {
            overlay,
            x = 0,
            y = 0,
          } = op as unknown as { overlay: string; x?: number; y?: number };
          const overlayImg = vips.Image.newFromFile(overlay);
          const composited = image.composite2(overlayImg, "over", { x, y });
          image.delete();
          overlayImg.delete();
          image = composited;
        }
      }

      const outputData = image.writeToBuffer(".png");
      image.delete();
      return outputData;
    } catch (e) {
      console.error("Vips execution failed:", e);
      throw e;
    }
  }

  async writeFile(name: string, data: Uint8Array): Promise<void> {
    if (!this.ready || !this.vips) await this.initialize();
    if (!this.vips) throw new Error("Vips not initialized");
    // wasm-vips uses emscripten FS
    (this.vips as any).FS.writeFile(name, data);
  }

  async dispose(): Promise<void> {
    if (this.vips) {
      this.vips.shutdown();
      this.vips = null;
    }
    this.ready = false;
  }
}
