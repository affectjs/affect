import { FFmpeg } from "@ffmpeg/ffmpeg";
import type { Backend, ExecutionContext, Operation } from "../types";
import { FFmpegAdapter } from "../adapters/ffmpeg";

// @ts-ignore - Vite will resolve these
import ffmpegCore from "@ffmpeg/core?url";
// @ts-ignore
import ffmpegWasm from "@ffmpeg/core/wasm?url";

export class FFmpegWasmBackend implements Backend {
  name = "ffmpeg-wasm";
  supportedTypes = ["video", "audio"] as const;

  private ffmpeg: FFmpeg | null = null;
  private ready = false;
  private adapter = new FFmpegAdapter();

  async initialize(): Promise<void> {
    if (this.ready) return;

    this.ffmpeg = new FFmpeg();

    await this.ffmpeg.load({
      coreURL: ffmpegCore,
      wasmURL: ffmpegWasm,
    });

    this.ready = true;
  }

  /*
   * Note: This execute matches Backend interface but for batch operations we usually pass array.
   * Logic adapted from worker/index.ts to here.
   */
  async execute(operations: Operation[], context: ExecutionContext): Promise<Uint8Array> {
    if (!this.ready) await this.initialize();
    if (!this.ffmpeg) throw new Error("FFmpeg not initialized");

    const { input, onLog } = context;

    // Log handling
    const logHandler = ({ message }: { message: string }) => {
      if (onLog) onLog(message);
    };
    this.ffmpeg.on("log", logHandler);

    try {
      const inputName = input || "input.mp4";
      const outputName = `result_${Date.now()}.mp4`; // Use unique output name

      const args = this.adapter.convert(operations, inputName, outputName);
      await this.ffmpeg.exec(args);

      const outputData = await this.ffmpeg.readFile(outputName);
      // Clean up output file after reading
      await this.ffmpeg.deleteFile(outputName);

      return outputData as Uint8Array;
    } finally {
      this.ffmpeg.off("log", logHandler);
    }
  }

  async writeFile(name: string, data: Uint8Array): Promise<void> {
    if (!this.ready) await this.initialize();
    await this.ffmpeg?.writeFile(name, data);
  }

  async readFile(name: string): Promise<Uint8Array> {
    if (!this.ready) await this.initialize();
    const data = await this.ffmpeg?.readFile(name);
    return data as Uint8Array;
  }

  async deleteFile(name: string): Promise<void> {
    await this.ffmpeg?.deleteFile(name);
  }

  async dispose(): Promise<void> {
    this.ffmpeg?.terminate();
    this.ready = false;
  }
}
