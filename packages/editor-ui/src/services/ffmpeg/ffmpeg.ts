import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

/**
 * 进度回调类型
 */
export type ProgressCallback = (progress: number) => void;

/**
 * FFmpeg操作选项
 */
export interface FFmpegOptions {
  onProgress?: ProgressCallback;
  onLog?: (message: string) => void;
}

/**
 * FFmpeg服务类
 * 基于RFC-003浏览器运行时设计
 * 封装ffmpeg.wasm的核心功能
 */
export class FFmpegService {
  private ffmpeg: FFmpeg;
  private loaded: boolean = false;
  private progressCallback?: ProgressCallback;
  private logCallback?: (message: string) => void;

  constructor() {
    this.ffmpeg = new FFmpeg();
  }

  /**
   * 加载ffmpeg.wasm
   * 基于RFC-003的初始化流程
   */
  public async load() {
    if (this.loaded) return;

    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

    // 设置日志回调
    this.ffmpeg.on("log", ({ message }) => {
      console.log("[FFmpeg]", message);
      this.logCallback?.(message);
    });

    // 设置进度回调
    this.ffmpeg.on("progress", ({ progress }) => {
      const percentage = Math.round(progress * 100);
      console.log(`[FFmpeg] Progress: ${percentage}%`);
      this.progressCallback?.(percentage);
    });

    // Load ffmpeg.wasm
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });

    this.loaded = true;
    console.log("[FFmpeg] Loaded successfully");
  }

  /**
   * 检查ffmpeg.wasm是否已加载
   */
  public isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * 获取FFmpeg实例（底层API）
   */
  public getInstance(): FFmpeg {
    return this.ffmpeg;
  }

  /**
   * 设置进度回调
   */
  public setProgressCallback(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * 设置日志回调
   */
  public setLogCallback(callback: (message: string) => void): void {
    this.logCallback = callback;
  }

  /**
   * 写入文件到FFmpeg虚拟文件系统
   * @param name - 文件名
   * @param data - 文件数据（File/Blob/URL/Uint8Array）
   */
  public async writeFile(name: string, data: File | Blob | string | Uint8Array): Promise<void> {
    if (!this.loaded) await this.load();

    let fileData: Uint8Array;

    if (data instanceof Uint8Array) {
      fileData = data;
    } else if (data instanceof File || data instanceof Blob) {
      const arrayBuffer = await data.arrayBuffer();
      fileData = new Uint8Array(arrayBuffer);
    } else if (typeof data === "string") {
      // URL
      fileData = await fetchFile(data);
    } else {
      throw new Error("Unsupported data type");
    }

    await this.ffmpeg.writeFile(name, fileData);
  }

  /**
   * 从FFmpeg虚拟文件系统读取文件
   * @param name - 文件名
   */
  public async readFile(name: string): Promise<Uint8Array> {
    if (!this.loaded) await this.load();

    const data = await this.ffmpeg.readFile(name);
    return data as Uint8Array;
  }

  /**
   * 删除FFmpeg虚拟文件系统中的文件
   * @param name - 文件名
   */
  public async deleteFile(name: string): Promise<void> {
    if (!this.loaded) await this.load();

    await this.ffmpeg.deleteFile(name);
  }

  /**
   * 执行FFmpeg命令
   * @param args - FFmpeg命令参数
   */
  public async exec(args: string[]): Promise<void> {
    if (!this.loaded) await this.load();

    await this.ffmpeg.exec(args);
  }

  /**
   * 终止当前FFmpeg进程
   */
  public terminate(): void {
    this.ffmpeg.terminate();
    this.loaded = false;
  }

  /**
   * 高级API：裁剪视频
   * @param input - 输入文件名
   * @param output - 输出文件名
   * @param startTime - 开始时间（秒）
   * @param duration - 持续时间（秒）
   */
  public async trim(
    input: string,
    output: string,
    startTime: number,
    duration: number
  ): Promise<void> {
    await this.exec([
      "-i",
      input,
      "-ss",
      startTime.toString(),
      "-t",
      duration.toString(),
      "-c",
      "copy", // 无损复制（快速）
      output,
    ]);
  }

  /**
   * 高级API：调整视频大小
   * @param input - 输入文件名
   * @param output - 输出文件名
   * @param width - 宽度
   * @param height - 高度
   */
  public async resize(input: string, output: string, width: number, height: number): Promise<void> {
    await this.exec([
      "-i",
      input,
      "-vf",
      `scale=${width}:${height}`,
      "-c:a",
      "copy", // 音频无损复制
      output,
    ]);
  }

  /**
   * 高级API：合并多个视频
   * @param inputs - 输入文件名列表
   * @param output - 输出文件名
   */
  public async concat(inputs: string[], output: string): Promise<void> {
    // 创建文件列表
    const fileList = inputs.map((file) => `file '${file}'`).join("\n");
    await this.writeFile("filelist.txt", new TextEncoder().encode(fileList));

    await this.exec(["-f", "concat", "-safe", "0", "-i", "filelist.txt", "-c", "copy", output]);

    // 清理临时文件
    await this.deleteFile("filelist.txt");
  }

  /**
   * 高级API：应用视频滤镜
   * @param input - 输入文件名
   * @param output - 输出文件名
   * @param filter - 滤镜字符串（例如："grayscale"）
   */
  public async applyFilter(input: string, output: string, filter: string): Promise<void> {
    await this.exec(["-i", input, "-vf", filter, "-c:a", "copy", output]);
  }

  /**
   * 高级API：提取视频元数据
   * @param input - 输入文件名
   */
  public async getMetadata(_input: string): Promise<{
    duration: number;
    width: number;
    height: number;
    fps: number;
  }> {
    // FFmpeg.wasm暂不支持ffprobe
    // 这里返回默认值，实际实现需要解析ffmpeg的输出
    // TODO: 解析FFmpeg日志输出获取元数据
    return {
      duration: 0,
      width: 1920,
      height: 1080,
      fps: 30,
    };
  }
}

/**
 * 全局FFmpeg服务实例
 */
export const ffmpegService = new FFmpegService();
