import * as Comlink from "comlink";
import { FFmpegWasmBackend } from "../backends/ffmpeg-wasm";
import { WasmVipsBackend } from "../backends/wasm-vips";
import { HeifBackend } from "../backends/heif";
import { ImageAdapter } from "../adapters/image";
import type {
  ExecutionResult,
  AffectDSL,
  InputSource,
  RuntimeConfig,
  Operation,
} from "@affectjs/core";

export class RuntimeWorker {
  private ffmpegBackend = new FFmpegWasmBackend();
  private vipsBackend = new WasmVipsBackend();
  private heifBackend = new HeifBackend();
  private imageAdapter = new ImageAdapter();
  private ready = false;
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  async initialize(): Promise<void> {
    if (this.ready) return;
    await Promise.all([
      this.ffmpegBackend.initialize(),
      this.vipsBackend.initialize(),
      this.heifBackend.initialize(),
    ]);
    this.ready = true;
  }

  async init(_config?: RuntimeConfig) {
    await this.initialize();
  }

  async addEventListener(event: string, callback: (...args: unknown[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  private emit(event: string, ...args: unknown[]) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(...args));
    }
  }

  async execute(dsl: AffectDSL, inputs?: Record<string, InputSource>): Promise<ExecutionResult> {
    if (!this.ready) await this.initialize();

    const inputName = dsl.input?.replace("file:///", "") || "input.mp4";
    const isImage = /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(inputName);
    const operations: Operation[] = dsl.steps || dsl.operations || [];

    const resolveToUint8Array = async (source: InputSource): Promise<Uint8Array> => {
      if (source instanceof Uint8Array) return source;
      if (source instanceof ArrayBuffer) return new Uint8Array(source);
      if (source instanceof Blob) return new Uint8Array(await source.arrayBuffer());
      if (typeof source === "string") {
        const response = await fetch(source);
        return new Uint8Array(await response.arrayBuffer());
      }
      return new Uint8Array();
    };

    const resolveToBlob = async (source: InputSource): Promise<Blob> => {
      if (source instanceof Blob) return source;
      const u8 = await resolveToUint8Array(source);
      return new Blob([u8 as unknown as BlobPart]);
    };

    if (isImage) {
      const source = inputs?.[inputName];
      if (!source) throw new Error(`Input ${inputName} not found`);

      try {
        const u8 = await resolveToUint8Array(source);
        let currentData = u8;
        let currentInputName = inputName;

        if (/\.(heic|heif)$/i.test(inputName)) {
          await this.heifBackend.writeFile(inputName, u8);
          currentData = await this.heifBackend.execute([], {
            input: inputName,
            mediaType: "image",
            operations: [],
          });
          currentInputName = "decoded.raw";
        }

        await this.vipsBackend.writeFile(currentInputName, currentData);

        const outputData = await this.vipsBackend.execute(operations, {
          input: currentInputName,
          mediaType: "image",
          operations,
        });

        return {
          success: true,
          output: new Blob([outputData as unknown as BlobPart], { type: "image/png" }),
          metrics: { duration: 0 },
        };
      } catch (e) {
        console.warn("WASM image processing failed, falling back to Native Canvas", e);
        const blob = await resolveToBlob(source);
        return await this.imageAdapter.execute(operations, blob);
      }
    }

    const startTime = performance.now();
    const logs: string[] = [];

    try {
      if (inputs) {
        for (const [name, source] of Object.entries(inputs)) {
          const u8 = await resolveToUint8Array(source);
          await this.ffmpegBackend.writeFile(name, u8);
        }
      }

      const outputData = await this.ffmpegBackend.execute(operations, {
        input: inputName,
        mediaType: "video",
        operations,
        onLog: (msg) => {
          logs.push(msg);
          this.emit("log", msg);
        },
      });

      const outputName = dsl.output?.replace("file:///", "") || "output.mp4";
      const mimeType = outputName.endsWith(".mp4") ? "video/mp4" : "application/octet-stream";

      return {
        success: true,
        output: new Blob([outputData as unknown as BlobPart], { type: mimeType }),
        logs,
        metrics: { duration: performance.now() - startTime },
      };
    } catch (e: unknown) {
      return { success: false, error: e, logs };
    }
  }
}

Comlink.expose(RuntimeWorker);
