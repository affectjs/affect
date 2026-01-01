/**
 * Browser Adapter - 使用浏览器 WASM 运行时执行 Affect DSL
 *
 * 基于 RFC-003 (Browser Runtime) 和 RFC-009 (Browser Preview Runtime)
 * 封装了 @affectjs/runtime-browser 提供统一的 DSL 执行入口
 */

import { BrowserRuntime } from "@affectjs/runtime-browser";
import type { MediaAdapter, ExecutionOptions, ExecutionResult } from "./types";
import type { AffectDSL, InputSource } from "@affectjs/core";

export class BrowserAdapter implements MediaAdapter {
  public readonly name = "browser" as const;
  private runtime: BrowserRuntime | null = null;
  private ready = false;

  /**
   * 初始化浏览器适配器
   */
  async initialize(): Promise<void> {
    if (this.ready) return;

    this.runtime = new BrowserRuntime({
      worker: true,
    });

    await this.runtime.ready();
    this.ready = true;
    console.log("[BrowserAdapter] Initialized with @affectjs/runtime-browser");
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.ready && this.runtime !== null;
  }

  /**
   * 执行 Affect DSL（委托给 BrowserRuntime）
   *
   * @param dslStr - Affect DSL 字符串
   * @param options - 执行选项
   */
  async executeDSL(dslStr: string, options: ExecutionOptions): Promise<ExecutionResult> {
    if (!this.isReady()) {
      await this.initialize();
    }

    if (!this.runtime) throw new Error("Runtime not initialized");

    try {
      // 1. 解析 DSL
      const dsl: AffectDSL = JSON.parse(dslStr);

      // 2. 准备 Inputs
      const inputName = dsl.input?.replace("file:///", "") || "input.mp4";
      const inputs: Record<string, InputSource> = {
        [inputName]: options.input,
      };

      // 3. 执行
      const result = await this.runtime.execute(dsl, inputs);

      if (!result.success || !result.output) {
        const errorMsg =
          typeof result.error === "string"
            ? result.error
            : (result.error as Error)?.message || "Execution failed";
        return {
          success: false,
          error: new Error(errorMsg),
        };
      }

      // 4. 将输出 Blob 转换为 URL
      const blob = result.output as Blob;
      const blobUrl = URL.createObjectURL(blob);

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
   * 清理资源
   */
  async dispose(): Promise<void> {
    if (this.runtime) {
      await this.runtime.terminate();
      this.runtime = null;
    }
    this.ready = false;
    console.log("[BrowserAdapter] Disposed");
  }
}
