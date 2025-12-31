/**
 * Adapter 导出
 *
 * 提供两种执行引擎：
 * 1. BrowserAdapter - 纯浏览器 WASM 运行时（RFC-003/009）
 * 2. ApiAdapter - Bun + Elysia API 服务器（RFC-008）
 */

export { BrowserAdapter } from './BrowserAdapter';
export { ApiAdapter } from './ApiAdapter';
export type { MediaAdapter, ExecutionOptions, ExecutionResult, ApiConfig } from './types';

/**
 * 适配器工厂函数
 */
import { BrowserAdapter } from './BrowserAdapter';
import { ApiAdapter } from './ApiAdapter';
import type { MediaAdapter, ApiConfig } from './types';

export function createBrowserAdapter(): MediaAdapter {
  return new BrowserAdapter();
}

export function createApiAdapter(config: ApiConfig): MediaAdapter {
  return new ApiAdapter(config);
}

/**
 * 自动选择适配器
 *
 * 根据文件大小或用户配置自动选择最合适的适配器：
 * - 小文件（< 100MB）：BrowserAdapter
 * - 大文件（≥ 100MB）：ApiAdapter
 */
export function createAutoAdapter(
  apiConfig?: ApiConfig,
  threshold: number = 100 * 1024 * 1024 // 100MB
): {
  getAdapter: (fileSize?: number) => MediaAdapter;
  browser: BrowserAdapter;
  api?: ApiAdapter;
} {
  const browser = new BrowserAdapter();
  const api = apiConfig ? new ApiAdapter(apiConfig) : undefined;

  return {
    browser,
    api,
    getAdapter: (fileSize?: number) => {
      // 如果没有配置 API 或没有提供文件大小，默认使用浏览器
      if (!api || !fileSize) {
        return browser;
      }

      // 根据文件大小选择
      return fileSize < threshold ? browser : api;
    },
  };
}
