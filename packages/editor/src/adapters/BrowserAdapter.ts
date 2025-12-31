/**
 * Browser Adapter - 使用浏览器 WASM 运行时执行 Affect DSL
 *
 * 基于 RFC-003 (Browser Runtime) 和 RFC-009 (Browser Preview Runtime)
 * 使用 ffmpeg.wasm 处理视频，wasm-vips 处理图像
 */

import { ffmpegService } from '../services/ffmpeg/ffmpeg';
import type { MediaAdapter, ExecutionOptions, ExecutionResult } from './types';

export class BrowserAdapter implements MediaAdapter {
  public readonly name = 'browser' as const;
  private ready = false;

  /**
   * 初始化浏览器适配器（加载 ffmpeg.wasm）
   */
  async initialize(): Promise<void> {
    if (this.ready) return;

    // 加载 ffmpeg.wasm
    await ffmpegService.load();

    // TODO: 加载 wasm-vips（图像处理）
    // await wasmVipsService.load();

    this.ready = true;
    console.log('[BrowserAdapter] Initialized');
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.ready && ffmpegService.isLoaded();
  }

  /**
   * 执行 Affect DSL（使用浏览器 WASM 运行时）
   *
   * @param dsl - Affect DSL 字符串
   * @param options - 执行选项
   */
  async executeDSL(dsl: string, options: ExecutionOptions): Promise<ExecutionResult> {
    if (!this.isReady()) {
      await this.initialize();
    }

    try {
      // TODO: 解析 DSL，判断媒体类型（video/audio/image）
      const mediaType = this.detectMediaType(dsl);

      if (mediaType === 'video' || mediaType === 'audio') {
        return await this.executeVideoAudio(dsl, options);
      } else if (mediaType === 'image') {
        return await this.executeImage(dsl, options);
      } else {
        throw new Error(`Unknown media type: ${mediaType}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * 执行视频/音频处理（使用 ffmpeg.wasm）
   */
  private async executeVideoAudio(
    dsl: string,
    options: ExecutionOptions
  ): Promise<ExecutionResult> {
    const ffmpeg = ffmpegService.getInstance();

    try {
      // 1. 读取输入文件
      let inputData: Uint8Array;
      if (options.input instanceof File || options.input instanceof Blob) {
        const arrayBuffer = await options.input.arrayBuffer();
        inputData = new Uint8Array(arrayBuffer);
      } else {
        // 从 URL 加载
        const response = await fetch(options.input);
        const arrayBuffer = await response.arrayBuffer();
        inputData = new Uint8Array(arrayBuffer);
      }

      // 2. 写入 ffmpeg 文件系统
      const inputName = 'input.mp4'; // TODO: 从 DSL 或文件类型推断扩展名
      await ffmpeg.writeFile(inputName, inputData);

      // 3. 从 DSL 生成 ffmpeg 命令
      const ffmpegArgs = this.dslToFFmpegArgs(dsl, inputName);

      // 4. 执行 ffmpeg
      // TODO: 实现进度回调
      await ffmpeg.exec(ffmpegArgs);

      // 5. 读取输出文件
      const outputName = 'output.mp4'; // TODO: 从 DSL 推断
      const outputData = await ffmpeg.readFile(outputName);

      // 6. 创建 Blob URL
      const blob = new Blob([outputData], { type: 'video/mp4' });
      const blobUrl = URL.createObjectURL(blob);

      // 7. 清理文件系统
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);

      return {
        success: true,
        output: blobUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * 执行图像处理（使用 wasm-vips）
   */
  private async executeImage(
    dsl: string,
    options: ExecutionOptions
  ): Promise<ExecutionResult> {
    // TODO: 实现 wasm-vips 图像处理
    throw new Error('Image processing not implemented yet');
  }

  /**
   * 从 DSL 检测媒体类型
   */
  private detectMediaType(dsl: string): 'video' | 'audio' | 'image' {
    // 简单检测：从 DSL 的 affect 声明中提取类型
    // 例如：affect video "input.mp4" "output.mp4"
    const match = dsl.match(/affect\s+(video|audio|image)/);
    if (match) {
      return match[1] as 'video' | 'audio' | 'image';
    }
    return 'video'; // 默认视频
  }

  /**
   * 将 Affect DSL 转换为 ffmpeg 命令参数
   *
   * TODO: 实现完整的 DSL 到 ffmpeg 转换
   * 目前仅支持基础操作
   */
  private dslToFFmpegArgs(dsl: string, inputName: string): string[] {
    const args: string[] = ['-i', inputName];

    // TODO: 解析 DSL 并生成相应的 ffmpeg 参数
    // 示例：
    // - resize 1280 720 → -vf scale=1280:720
    // - filter grayscale → -vf grayscale
    // - encode h264 2000 → -c:v libx264 -b:v 2000k

    // 临时简单实现
    args.push('output.mp4');

    return args;
  }

  /**
   * 清理资源
   */
  async dispose(): Promise<void> {
    // ffmpeg.wasm 不需要显式清理
    this.ready = false;
    console.log('[BrowserAdapter] Disposed');
  }
}
