/**
 * Adapter 接口：定义编辑器执行引擎的统一接口
 *
 * 支持两种实现：
 * 1. BrowserAdapter - 使用浏览器 WASM 运行时（ffmpeg.wasm, wasm-vips）
 * 2. ApiAdapter - 使用 Bun + Elysia API 服务器
 */

export interface ExecutionResult {
  success: boolean;
  output?: string | Blob; // Blob URL for browser, file URL for API
  error?: Error;
  progress?: number;
}

export interface ExecutionOptions {
  input: string | File | Blob;
  onProgress?: (progress: { percent: number; message?: string }) => void;
  timeout?: number;
}

/**
 * 媒体处理适配器接口
 */
export interface MediaAdapter {
  /**
   * 适配器名称
   */
  name: 'browser' | 'api';

  /**
   * 初始化适配器
   */
  initialize(): Promise<void>;

  /**
   * 检查适配器是否已初始化
   */
  isReady(): boolean;

  /**
   * 执行 Affect DSL
   * @param dsl - Affect DSL 字符串
   * @param options - 执行选项
   */
  executeDSL(dsl: string, options: ExecutionOptions): Promise<ExecutionResult>;

  /**
   * 清理资源
   */
  dispose(): Promise<void>;
}

/**
 * API 配置（用于 ApiAdapter）
 */
export interface ApiConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}
