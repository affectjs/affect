# RFC-009: 浏览器预览运行时（ffmpeg.wasm + sharp.wasm）

**状态**: 计划中  
**日期**: 2025-12-29  
**作者**: Albert Li  
**相关议题**: 为 RFC-008 视频编辑器构建浏览器预览运行时，支持在浏览器中使用 ffmpeg.wasm 和 sharp.wasm 进行实时预览

## 摘要

本文档描述了为 **RFC-008: Affect 快速视频编辑器** 构建浏览器预览运行时的设计和实现。该运行时基于 **RFC-003: 浏览器运行时** 的基础实现，专门为编辑器优化预览功能。运行时允许视频编辑器在浏览器中实时预览编辑效果，使用 **ffmpeg.wasm** 处理视频/音频预览，使用 **sharp.wasm** 处理图像预览，无需等待服务器往返，提供快速迭代的编辑体验。

**核心特性**:
- 🌐 **浏览器预览**: 在浏览器中实时预览编辑效果
- ⚡ **WASM 后端**: 使用 ffmpeg.wasm 和 sharp.wasm 提供高性能预览
- 📝 **DSL 支持**: 完全支持 Affect DSL 语法
- 🔄 **无缝集成**: 与 RFC-008 视频编辑器无缝集成
- 🚀 **快速迭代**: 快速预览和迭代编辑操作

**与相关 RFC 的关系**:
- **基于**: [RFC-003: 浏览器运行时](./0003-browser-runtime.md) - 使用 RFC-003 的基础实现（ffmpeg.wasm + sharp.wasm 后端）
- **服务于**: [RFC-008: Affect 快速视频编辑器](./0008-affect-video-editor.md) - 专门为编辑器提供预览功能
- **定位**: RFC-003 提供通用基础，RFC-009 在此基础上为编辑器优化预览功能

## 动机

1. **实时预览**: 在浏览器中实时预览编辑效果，无需等待服务器往返
2. **快速迭代**: 快速预览和迭代编辑操作，提升用户体验
3. **降低服务器负载**: 将预览任务转移到客户端，减少服务器压力
4. **离线预览**: 支持离线预览，不依赖服务器
5. **统一体验**: 与服务器端渲染使用相同的 DSL，保证一致性

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│         RFC-008: Affect 快速视频编辑器 (React)          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Timeline   │  │   Preview    │  │   Inspector   │ │
│  │   Editor     │  │  Component   │  │   Panel       │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                          │                              │
│                          ▼                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │     Browser Preview Runtime                      │  │
│  │     (@affectjs/affect-browser)                   │  │
│  │  ┌──────────────┐      ┌──────────────┐         │  │
│  │  │ ffmpeg.wasm  │      │ sharp.wasm   │         │  │
│  │  │  Backend     │      │  Backend     │         │  │
│  │  └──────────────┘      └──────────────┘         │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          │ (Large files)
                          ▼
┌─────────────────────────────────────────────────────────┐
│         Bun + Elysia Server (Final Render)              │
│  ┌──────────────────────────────────────────────────┐  │
│  │         FFmpeg Processing (fluent-ffmpeg)         │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 技术栈

#### 浏览器预览运行时
- **@ffmpeg/ffmpeg**: ffmpeg.wasm - 浏览器中的 FFmpeg
- **sharp-wasm**: sharp.wasm - 浏览器中的 Sharp（图像处理）
- **@affectjs/dsl**: DSL 解析器和编译器
- **Web Workers**: 在后台线程中执行预览任务

#### 与 RFC-008 的集成
- **React Hooks**: `usePreview` hook 集成浏览器运行时
- **自动选择**: 根据文件大小自动选择浏览器预览或服务器预览
- **统一 API**: 与服务器端运行时使用相同的 API

## 实现细节

### 1. 浏览器运行时包结构

```
packages/@affectjs/affect-browser/
├── src/
│   ├── index.ts                    # 主入口
│   ├── runtime.ts                  # 浏览器运行时
│   ├── router.ts                   # 媒体类型路由
│   ├── backends/
│   │   ├── ffmpeg-wasm.ts         # ffmpeg.wasm 后端
│   │   └── sharp-wasm.ts          # sharp.wasm 后端
│   └── types.ts                    # 类型定义
├── package.json
└── vite.config.ts
```

### 2. ffmpeg.wasm 后端实现

```typescript
// packages/@affectjs/affect-browser/src/backends/ffmpeg-wasm.ts
import { createFFmpeg, FFmpeg } from '@ffmpeg/ffmpeg';
import type { Backend, Operation, ExecutionContext, Result } from '../types';

let ffmpegInstance: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegInstance) {
    ffmpegInstance = createFFmpeg({
      log: false,
      corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
    });
    await ffmpegInstance.load();
  }
  return ffmpegInstance;
}

export const ffmpegWasmBackend: Backend = {
  name: 'ffmpeg-wasm',
  supportedTypes: ['video', 'audio'] as const,

  canHandle(operation: Operation, mediaType: string): boolean {
    return mediaType === 'video' || mediaType === 'audio';
  },

  async execute(
    operation: Operation,
    context: ExecutionContext
  ): Promise<Result> {
    const ffmpeg = await getFFmpeg();
    const { input, output, operations } = context;

    try {
      // 读取输入文件（支持 File/Blob/URL）
      let inputData: ArrayBuffer;
      if (input instanceof File || input instanceof Blob) {
        inputData = await input.arrayBuffer();
      } else {
        const response = await fetch(input);
        inputData = await response.arrayBuffer();
      }

      const inputName = 'input.' + (context.mediaType === 'video' ? 'mp4' : 'mp3');
      await ffmpeg.FS('writeFile', inputName, new Uint8Array(inputData));

      // 构建 FFmpeg 命令
      const args: string[] = ['-i', inputName];

      // 应用操作
      for (const op of operations) {
        switch (op.type) {
          case 'resize':
            args.push('-vf', `scale=${op.width}:${op.height}`);
            break;
          case 'encode':
            if (context.mediaType === 'video') {
              args.push('-c:v', op.codec);
              if (op.param) args.push('-b:v', String(op.param) + 'k');
            } else if (context.mediaType === 'audio') {
              args.push('-c:a', op.codec);
              if (op.param) args.push('-b:a', String(op.param) + 'k');
            }
            break;
          case 'filter':
            const filterValue = op.value ? `=${op.value}` : '';
            args.push('-vf', `${op.name}${filterValue}`);
            break;
          case 'crop':
            args.push('-vf', `crop=${op.width}:${op.height}:${op.x}:${op.y}`);
            break;
          case 'rotate':
            args.push('-vf', `rotate=${(op.angle * Math.PI) / 180}`);
            if (op.flip === 'horizontal') {
              args.push('-vf', 'hflip');
            } else if (op.flip === 'vertical') {
              args.push('-vf', 'vflip');
            }
            break;
        }
      }

      // 输出文件
      const outputName = output || 'output.mp4';
      args.push(outputName);

      // 执行 FFmpeg
      await ffmpeg.run(...args);

      // 读取输出文件
      const outputData = ffmpeg.FS('readFile', outputName);
      const blob = new Blob([outputData.buffer], { 
        type: context.mediaType === 'video' ? 'video/mp4' : 'audio/mpeg' 
      });
      const outputUrl = URL.createObjectURL(blob);

      // 清理
      ffmpeg.FS('unlink', inputName);
      ffmpeg.FS('unlink', outputName);

      return {
        success: true,
        output: outputUrl, // 返回 Blob URL
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  },
};
```

### 3. sharp.wasm 后端实现

```typescript
// packages/@affectjs/affect-browser/src/backends/sharp-wasm.ts
import sharp from 'sharp-wasm';
import type { Backend, Operation, ExecutionContext, Result } from '../types';

export const sharpWasmBackend: Backend = {
  name: 'sharp-wasm',
  supportedTypes: ['image'] as const,

  canHandle(operation: Operation, mediaType: string): boolean {
    return mediaType === 'image';
  },

  async execute(
    operation: Operation,
    context: ExecutionContext
  ): Promise<Result> {
    try {
      // 读取输入图像
      let inputBuffer: ArrayBuffer;
      if (context.input instanceof File || context.input instanceof Blob) {
        inputBuffer = await context.input.arrayBuffer();
      } else {
        const response = await fetch(context.input);
        inputBuffer = await response.arrayBuffer();
      }

      let image = sharp(new Uint8Array(inputBuffer));

      // 应用操作
      for (const op of context.operations) {
        switch (op.type) {
          case 'resize':
            image = image.resize(Number(op.width), Number(op.height));
            break;
          case 'encode':
            image = image.toFormat(op.codec as any, {
              quality: op.param ? Number(op.param) : undefined,
            });
            break;
          case 'filter':
            switch (op.name) {
              case 'grayscale':
                image = image.grayscale();
                break;
              case 'blur':
                image = image.blur(op.value ? Number(op.value) : 1);
                break;
              case 'brightness':
                image = image.modulate({
                  brightness: op.value ? Number(op.value) : 1,
                });
                break;
              case 'saturate':
                image = image.modulate({
                  saturation: op.value ? Number(op.value) : 1,
                });
                break;
            }
            break;
          case 'crop':
            image = image.extract({
              left: Number(op.x),
              top: Number(op.y),
              width: op.width,
              height: op.height,
            });
            break;
          case 'rotate':
            image = image.rotate(op.angle);
            if (op.flip === 'horizontal') {
              image = image.flop();
            } else if (op.flip === 'vertical') {
              image = image.flip();
            }
            break;
        }
      }

      // 输出图像
      const outputBuffer = await image.toBuffer();
      const blob = new Blob([outputBuffer], { type: 'image/png' });
      const outputUrl = URL.createObjectURL(blob);

      return {
        success: true,
        output: outputUrl, // 返回 Blob URL
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  },
};
```

### 4. 与 RFC-008 视频编辑器的集成

#### 4.1 usePreview Hook 增强

```typescript
// packages/@affectjs/editor/client/src/hooks/usePreview.ts
import { useState, useCallback } from 'react';
import { execute as executeBrowser } from '@affectjs/affect-browser';
import { execute as executeServer } from '@affectjs/affect';
import { generatePreviewDSL } from './useDSLGenerator';

export function usePreview(project: Project) {
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewType, setPreviewType] = useState<'browser' | 'server'>('browser');

  const generatePreview = useCallback(async (timeRange?: TimeRange) => {
    setIsLoading(true);
    
    try {
      // 生成预览 DSL
      const previewDSL = generatePreviewDSL(project, timeRange);
      
      // 判断使用浏览器预览还是服务器预览
      const fileSize = project.inputFileSize || 0;
      const shouldUseBrowser = fileSize < 100 * 1024 * 1024; // 100MB
      
      if (shouldUseBrowser) {
        // 使用浏览器预览（ffmpeg.wasm）
        setPreviewType('browser');
        const result = await executeBrowser(previewDSL, {
          input: project.inputFile,
          onProgress: (progress) => {
            console.log(`Browser preview: ${progress.percent}%`);
          },
        });
        
        if (result.success) {
          setPreviewVideo(result.output); // Blob URL
        } else {
          console.error('Browser preview failed:', result.error);
          // 降级到服务器预览
          return await generateServerPreview(previewDSL, timeRange);
        }
      } else {
        // 使用服务器预览
        setPreviewType('server');
        return await generateServerPreview(previewDSL, timeRange);
      }
    } finally {
      setIsLoading(false);
    }
  }, [project]);

  const generateServerPreview = async (dsl: string, timeRange?: TimeRange) => {
    const response = await fetch(`/api/v1/projects/${project.id}/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dsl, timeRange }),
    });
    
    const data = await response.json();
    setPreviewVideo(data.previewUrl);
    return data.previewUrl;
  };

  return { 
    previewVideo, 
    isLoading, 
    previewType,
    generatePreview 
  };
}
```

#### 4.2 Preview 组件集成

```typescript
// packages/@affectjs/editor/client/src/components/Preview/VideoPreview.tsx
import { usePreview } from '../../hooks/usePreview';
import { useEffect } from 'react';

export function VideoPreview({ project, currentTime }: VideoPreviewProps) {
  const { previewVideo, isLoading, previewType, generatePreview } = usePreview(project);

  useEffect(() => {
    // 生成预览片段（当前时间前后 10 秒）
    const timeRange = {
      start: Math.max(0, currentTime - 10),
      end: currentTime + 10,
    };
    generatePreview(timeRange);
  }, [currentTime, project]);

  if (isLoading) {
    return (
      <div className="preview-loading">
        <div className="spinner" />
        <p>Generating preview ({previewType})...</p>
      </div>
    );
  }

  if (!previewVideo) {
    return <div className="preview-empty">No preview available</div>;
  }

  return (
    <div className="video-preview">
      <video 
        src={previewVideo} 
        controls 
        autoPlay
        onLoadedData={() => {
          // 清理旧的 Blob URL
          if (previewVideo.startsWith('blob:')) {
            // 延迟清理，确保视频已加载
            setTimeout(() => URL.revokeObjectURL(previewVideo), 1000);
          }
        }}
      />
      <div className="preview-info">
        Preview type: {previewType === 'browser' ? 'Browser (ffmpeg.wasm)' : 'Server'}
      </div>
    </div>
  );
}
```

### 5. 自动选择逻辑

```typescript
// packages/@affectjs/affect/src/runtime.ts
import { execute as executeBrowser } from '@affectjs/affect-browser';
import { execute as executeServer } from '@affectjs/affect';

export async function execute(
  dsl: string,
  options?: RuntimeOptions
): Promise<Result> {
  // 检测运行环境
  const isBrowser = typeof window !== 'undefined';
  
  if (!isBrowser) {
    // 服务器环境，直接使用服务器运行时
    return await executeServer(dsl, options);
  }

  // 浏览器环境，检测文件大小
  const fileSize = await getFileSize(options?.input);
  const useBrowser = fileSize < 100 * 1024 * 1024; // 100MB

  if (useBrowser) {
    try {
      return await executeBrowser(dsl, options);
    } catch (error) {
      // 浏览器预览失败，降级到服务器
      console.warn('Browser preview failed, falling back to server:', error);
      return await executeServer(dsl, options);
    }
  } else {
    // 大文件，使用服务器预览
    return await executeServer(dsl, options);
  }
}

async function getFileSize(input?: string | File | Blob): Promise<number> {
  if (!input) return 0;
  
  if (input instanceof File || input instanceof Blob) {
    return input.size;
  }
  
  // 对于 URL，需要获取文件大小
  try {
    const response = await fetch(input, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : 0;
  } catch {
    return 0;
  }
}
```

## 性能优化

### 1. Web Worker 支持

```typescript
// packages/@affectjs/affect-browser/src/worker.ts
import { execute } from './runtime';

self.onmessage = async (event) => {
  const { dsl, options } = event.data;
  
  try {
    const result = await execute(dsl, options);
    self.postMessage({ 
      success: true, 
      result,
      type: 'complete'
    });
  } catch (error) {
    self.postMessage({ 
      success: false, 
      error: error.message,
      type: 'error'
    });
  }
};

// 进度回调
export function executeInWorker(
  dsl: string,
  options?: RuntimeOptions
): Promise<Result> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url));
    
    worker.postMessage({ dsl, options });
    
    worker.onmessage = (event) => {
      const { success, result, error, type } = event.data;
      
      if (type === 'progress' && options?.onProgress) {
        options.onProgress(result);
      } else if (type === 'complete') {
        worker.terminate();
        if (success) {
          resolve(result);
        } else {
          reject(new Error(error));
        }
      }
    };
    
    worker.onerror = (error) => {
      worker.terminate();
      reject(error);
    };
  });
}
```

### 2. 预览缓存

```typescript
// packages/@affectjs/editor/client/src/hooks/usePreviewCache.ts
import { useMemo } from 'react';

const previewCache = new Map<string, string>();

export function usePreviewCache(projectId: string, dsl: string) {
  const cacheKey = useMemo(() => {
    return `${projectId}-${hashDSL(dsl)}`;
  }, [projectId, dsl]);

  const getCachedPreview = (): string | null => {
    return previewCache.get(cacheKey) || null;
  };

  const setCachedPreview = (url: string) => {
    previewCache.set(cacheKey, url);
  };

  const clearCache = () => {
    previewCache.delete(cacheKey);
  };

  return { getCachedPreview, setCachedPreview, clearCache };
}

function hashDSL(dsl: string): string {
  // 简单的哈希函数
  let hash = 0;
  for (let i = 0; i < dsl.length; i++) {
    const char = dsl.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}
```

### 3. 内存管理

```typescript
// 清理 Blob URL
export function cleanupBlobUrl(url: string) {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

// 在组件卸载时清理
useEffect(() => {
  return () => {
    if (previewVideo) {
      cleanupBlobUrl(previewVideo);
    }
  };
}, [previewVideo]);
```

## 使用场景

### 场景 1: 快速预览（浏览器）

```typescript
// 用户调整视频大小
timeline.resizeClip(clipId, { width: 1280, height: 720 });

// 自动生成预览 DSL
const previewDSL = generatePreviewDSL(project);

// 使用浏览器预览（< 100MB）
const result = await executeBrowser(previewDSL);
// 立即显示预览，无需等待服务器
```

### 场景 2: 大文件预览（服务器）

```typescript
// 大文件（> 100MB）
const result = await execute(dsl, { input: largeFile });
// 自动使用服务器预览
```

### 场景 3: 最终渲染（服务器）

```typescript
// 最终渲染始终使用服务器
const finalDSL = generateFinalDSL(project);
const result = await executeServer(finalDSL);
// 使用高性能服务器渲染
```

## 测试计划

### 功能测试

- [ ] 浏览器预览（ffmpeg.wasm）
- [ ] 图像预览（sharp.wasm）
- [ ] 自动选择逻辑
- [ ] 降级到服务器预览
- [ ] 预览缓存
- [ ] Web Worker 支持
- [ ] 内存管理

### 性能测试

- [ ] 小文件预览（< 10MB）
- [ ] 中等文件预览（10MB - 100MB）
- [ ] 预览速度基准
- [ ] 内存使用情况
- [ ] 并发预览

### 兼容性测试

- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] 移动浏览器

## 迁移路径

### 阶段 1: 基础实现（2-3周）

1. **创建浏览器运行时包**:
   - 创建 `@affectjs/affect-browser` 包
   - 实现 ffmpeg.wasm 后端
   - 实现 sharp.wasm 后端

2. **基础集成**:
   - 集成到 RFC-008 编辑器
   - 实现 `usePreview` hook
   - 测试基础预览功能

### 阶段 2: 优化和增强（2-3周）

1. **性能优化**:
   - Web Worker 支持
   - 预览缓存
   - 内存管理优化

2. **自动选择**:
   - 实现自动选择逻辑
   - 降级机制
   - 错误处理

### 阶段 3: 完善和测试（1-2周）

1. **测试和验证**:
   - 全面功能测试
   - 性能基准测试
   - 兼容性测试

2. **文档和示例**:
   - 编写使用文档
   - 创建示例代码
   - 更新 README

## 参考

### 相关 RFC

- [RFC-003: 浏览器运行时（ffmpeg.wasm + sharp.wasm）](./0003-browser-runtime.md) - **基础实现**: 提供通用的浏览器运行时基础，本 RFC 在此基础上为编辑器优化
- [RFC-008: Affect 快速视频编辑器](./0008-affect-video-editor.md) - **目标应用**: 本运行时专门为 RFC-008 编辑器提供预览功能
- [RFC-004: @affectjs/dsl - 统一媒体处理 DSL](./completed/0004-fluent-ffmpeg-dsl.md) - DSL 语法和设计
- [RFC-005: @affectjs/affect - AffectJS 运行时引擎](./0005-affectjs-runtime.md) - 服务器端运行时引擎
- [RFC-007: AffectJS 架构设计](./0007-affectjs-architecture.md) - 整体架构设计

### 外部文档

- [ffmpeg.wasm 文档](https://ffmpegwasm.netlify.app/)
- [sharp-wasm 文档](https://github.com/lovell/sharp-wasm)

## 变更日志

### 2025-12-29
- 创建 RFC-009 浏览器预览运行时文档
- 设计 ffmpeg.wasm 和 sharp.wasm 后端适配器
- 规划与 RFC-008 视频编辑器的集成方案
- 定义自动选择逻辑和降级机制

