/**
 * API Adapter - 使用 Bun + Elysia API 服务器执行 Affect DSL
 *
 * 基于 RFC-008 (Affect 快速视频编辑器)
 * 将 DSL 发送到服务器端执行，使用 @affectjs/affect 运行时
 */

import type { MediaAdapter, ExecutionOptions, ExecutionResult, ApiConfig } from './types';

export class ApiAdapter implements MediaAdapter {
  public readonly name = 'api' as const;
  private ready = false;
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = {
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      timeout: config.timeout || 60000, // 默认 60 秒
    };
  }

  /**
   * 初始化 API 适配器（检查服务器连接）
   */
  async initialize(): Promise<void> {
    if (this.ready) return;

    try {
      // 健康检查
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Server health check failed: ${response.status}`);
      }

      this.ready = true;
      console.log('[ApiAdapter] Initialized, server is healthy');
    } catch (error) {
      throw new Error(`Failed to connect to API server: ${(error as Error).message}`);
    }
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * 执行 Affect DSL（通过 API 服务器）
   *
   * @param dsl - Affect DSL 字符串
   * @param options - 执行选项
   */
  async executeDSL(dsl: string, options: ExecutionOptions): Promise<ExecutionResult> {
    if (!this.isReady()) {
      await this.initialize();
    }

    try {
      // 1. 上传输入文件（如果是 File/Blob）
      let inputUrl: string;
      if (options.input instanceof File || options.input instanceof Blob) {
        inputUrl = await this.uploadFile(options.input);
      } else {
        inputUrl = options.input;
      }

      // 2. 提交执行任务
      const taskId = await this.submitTask(dsl, inputUrl);

      // 3. 轮询任务状态（或使用 WebSocket）
      const result = await this.pollTaskStatus(taskId, options.onProgress);

      return result;
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * 上传文件到服务器
   */
  private async uploadFile(file: File | Blob): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.config.baseUrl}/api/v1/upload`, {
      method: 'POST',
      headers: this.getHeaders(true), // 不包含 Content-Type，让浏览器自动设置
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`File upload failed: ${response.status}`);
    }

    const data = await response.json();
    return data.url; // 返回文件 URL
  }

  /**
   * 提交执行任务
   */
  private async submitTask(dsl: string, inputUrl: string): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/execute`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        dsl,
        input: inputUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(`Task submission failed: ${response.status}`);
    }

    const data = await response.json();
    return data.taskId;
  }

  /**
   * 轮询任务状态
   */
  private async pollTaskStatus(
    taskId: string,
    onProgress?: (progress: { percent: number; message?: string }) => void
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    while (true) {
      // 检查超时
      if (Date.now() - startTime > this.config.timeout!) {
        throw new Error('Task execution timeout');
      }

      const response = await fetch(`${this.config.baseUrl}/api/v1/tasks/${taskId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get task status: ${response.status}`);
      }

      const data = await response.json();

      // 更新进度
      if (onProgress && data.progress !== undefined) {
        onProgress({
          percent: data.progress,
          message: data.status,
        });
      }

      // 检查任务状态
      if (data.status === 'completed') {
        return {
          success: true,
          output: data.outputUrl,
          progress: 100,
        };
      } else if (data.status === 'failed') {
        return {
          success: false,
          error: new Error(data.error || 'Task failed'),
        };
      }

      // 等待后继续轮询
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  /**
   * 获取请求头
   */
  private getHeaders(skipContentType = false): Record<string, string> {
    const headers: Record<string, string> = {};

    if (!skipContentType) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  /**
   * 清理资源
   */
  async dispose(): Promise<void> {
    this.ready = false;
    console.log('[ApiAdapter] Disposed');
  }
}
