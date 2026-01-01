# RFC-005: @affectjs/runtime-node - Node.js 兼容运行时引擎

**状态**: ✅ Completed  
**日期**: 2024-12-29  
**完成日期**: 2025-12-29  
**作者**: Albert Li  
**包名**: `@affectjs/runtime-node` (原 `@affectjs/runtime`)

## 摘要

本文档描述了 **@affectjs/runtime-node**，这是一个专为 Node.js 和 Bun 等服务端环境设计的媒体处理运行时。它实现了 **@affectjs/core** 定义的标准 `Runtime` 接口。

## 核心架构

系统拆分为三个核心包以支持多环境：

1.  **@affectjs/core**: 定义核心接口 (`Runtime`, `InputSource`, `ExecutionResult`) 和类型。
2.  **@affectjs/runtime-node**: Node.js/Bun 实现，使用 `fluent-ffmpeg` 和 `sharp` (Native)。
3.  **@affectjs/runtime-browser**: 浏览器实现，使用 WASM (见 RFC-0003)。

### 接口定义 (Defined in @affectjs/core)

```typescript
// 强类定义的输入源
export type InputSource =
  | string // 文件路径 (Node) 或 URL (Browser)
  | ArrayBuffer // 内存数据
  | Uint8Array // 内存数据
  | Blob // 浏览器 Blob
  | File // 浏览器 File
  | ReadableStream; // 流式输入

export interface Runtime {
  /**
   * 执行 Affect DSL
   * @param dsl - 编译后的 DSL 对象或 JSON 字符串
   * @param inputs - (可选) 虚拟文件映射表，键为 ID，值为输入源
   */
  execute(dsl: AffectDSL | string, inputs?: Record<string, InputSource>): Promise<ExecutionResult>;

  registerBackend(name: string, backend: Backend): void;
  getBackend(mediaType: MediaType): Backend;
}
```

### 核心组件 (runtime-node)

#### 1. 运行时引擎 (RuntimeNode)

负责实现核心接口，管理服务端后端。

#### 2. 后端适配器 (Backend Adapters)

每个后端提供统一的适配器接口：

```typescript
interface Backend {
  name: string;
  supportedTypes: MediaType[];
  execute(operation: Operation): Promise<Result>;
  canHandle(operation: Operation): boolean;
}
```

#### 3. 操作路由器 (Router)

根据操作类型和媒体类型选择最优后端：

```typescript
interface Router {
  route(operation: Operation, mediaType: MediaType): Backend;
  getOptimalBackend(operations: Operation[]): Backend;
}
```

## API 设计

### 基础 API

```typescript
import { affect, execute } from "@affectjs/runtime";

// 方式 1: 直接执行 DSL 代码
const result = await execute(compiledCode);

// 方式 1.1: 传入虚拟输入 (支持 Node/Bun Buffer)
const buffer = await Bun.file("video.mp4").arrayBuffer();
const result = await execute(dsl, {
  "my-video": buffer,
});
// result.output 将包含处理后的 Buffer/Stream

// 方式 2: 使用 affect 函数（类似 DSL 语法）
await affect("video.mp4").resize(1280, 720).encode("h264", 2000).save("output.mp4");
```

### 后端选择 API

```typescript
import { affect, useBackend } from "@affectjs/runtime";

// 显式指定后端
await affect("image.jpg").useBackend("sharp").resize(1920, 1080).save("output.jpg");
```

### 批量处理 API

```typescript
import { affectBatch } from '@affectjs/runtime';

// 批量处理多个文件
await affectBatch([
  { input: 'video1.mp4', output: 'out1.mp4', operations: [...] },
  { input: 'image1.jpg', output: 'out1.jpg', operations: [...] },
]);
```

## 操作映射表

### 视频/音频操作 → fluent-ffmpeg

| DSL 操作             | fluent-ffmpeg API                        |
| -------------------- | ---------------------------------------- |
| `resize w h`         | `.size('wxh')`                           |
| `encode codec param` | `.videoCodec(codec).videoBitrate(param)` |
| `filter name value`  | `.videoFilters('name=value')`            |
| `crop x y w h`       | `.videoFilters('crop=w:h:x:y')`          |
| `rotate angle`       | `.videoFilters('rotate=angle')`          |

### 图像操作 → sharp

| DSL 操作                  | sharp API                                            |
| ------------------------- | ---------------------------------------------------- |
| `resize w h`              | `.resize(w, h)`                                      |
| `encode format quality`   | `.toFormat(format, { quality })`                     |
| `filter grayscale`        | `.greyscale()`                                       |
| `filter blur radius`      | `.blur(radius)`                                      |
| `filter brightness value` | `.modulate({ brightness })`                          |
| `crop x y w h`            | `.extract({ left: x, top: y, width: w, height: h })` |
| `rotate angle`            | `.rotate(angle)`                                     |

## 实现细节

### 1. 媒体类型检测

```typescript
function detectMediaType(filePath: string): MediaType {
  const ext = path.extname(filePath).toLowerCase();
  const imageExts = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"];
  const videoExts = [".mp4", ".avi", ".mov", ".mkv", ".webm"];
  const audioExts = [".mp3", ".wav", ".aac", ".ogg"];

  if (imageExts.includes(ext)) return "image";
  if (videoExts.includes(ext)) return "video";
  if (audioExts.includes(ext)) return "audio";
  throw new Error(`Unsupported media type: ${ext}`);
}
```

### 2. 后端路由逻辑

```typescript
function routeBackend(mediaType: MediaType, operations: Operation[]): Backend {
  // 图像操作优先使用 sharp
  if (mediaType === "image") {
    return sharpBackend;
  }

  // 视频/音频操作使用 fluent-ffmpeg
  if (mediaType === "video" || mediaType === "audio") {
    return fluentFfmpegBackend;
  }

  // 混合操作：根据主要操作类型选择
  const primaryOp = operations[0];
  if (isImageOperation(primaryOp)) {
    return sharpBackend;
  }
  return fluentFfmpegBackend;
}
```

### 3. 操作转换

```typescript
function convertOperation(operation: DSLOperation, backend: Backend): BackendOperation {
  if (backend.name === "sharp") {
    return convertToSharpOperation(operation);
  } else if (backend.name === "fluent-ffmpeg") {
    return convertToFfmpegOperation(operation);
  }
  throw new Error(`Unsupported backend: ${backend.name}`);
}
```

## 使用示例

### 示例 1: 视频处理

```typescript
import { affect } from "@affectjs/affect";

await affect("input.mp4")
  .resize(1280, 720)
  .encode("h264", 2000)
  .encode("aac", 128)
  .save("output.mp4");
```

### 示例 2: 图像处理

```typescript
import { affect } from "@affectjs/affect";

await affect("photo.jpg")
  .resize(1920, 1080)
  .filter("grayscale")
  .filter("brightness", 1.1)
  .encode("jpeg", 90)
  .save("output.jpg");
```

### 示例 3: 执行编译后的 DSL 代码

```typescript
import { execute } from "@affectjs/affect";
import { compileDslFile } from "@affectjs/dsl";

const compiledCode = compileDslFile("video.affect");
const result = await execute(compiledCode);
```

### 示例 4: 批量处理

```typescript
import { affectBatch } from "@affectjs/runtime";

await affectBatch([
  {
    input: "video1.mp4",
    output: "compressed1.mp4",
    operations: [
      { type: "resize", width: 1280, height: 720 },
      { type: "encode", codec: "h264", param: 2000 },
    ],
  },
  {
    input: "photo1.jpg",
    output: "resized1.jpg",
    operations: [{ type: "resize", width: 1920, height: 1080 }],
  },
]);
```

## 依赖关系

```
@affectjs/runtime
├── @affectjs/dsl          # DSL 编译器
├── @luban-ws/fluent-ffmpeg # 视频/音频处理
└── sharp                  # 图像处理
```

## 性能考虑

### 1. 后端选择优化

- 图像操作：sharp 性能优于 ffmpeg
- 视频操作：ffmpeg 是唯一选择
- 批量处理：并行执行，充分利用多核

### 2. 内存管理

- 流式处理大文件
- 及时释放后端资源
- 支持进度回调

### 3. 错误处理

- 统一的错误格式
- 详细的错误信息
- 自动回滚机制

## 迁移路径

### 从 DSL 编译器到运行时

1. **编译阶段**: `@affectjs/dsl` 将 DSL 编译为 JavaScript 代码
2. **执行阶段**: `@affectjs/runtime` 执行编译后的代码，自动选择后端

### 向后兼容

- 支持直接使用 fluent-ffmpeg API
- 支持直接使用 sharp API
- 提供迁移工具

## 测试策略

### 1. 单元测试

- 后端适配器测试
- 路由器测试
- 操作转换测试

### 2. 集成测试

- 端到端 DSL 执行测试
- 多后端切换测试
- 错误处理测试

### 3. 性能测试

- 后端选择性能
- 批量处理性能
- 内存使用测试

## 实现状态

### 阶段 1: 核心运行时 ✅ 已完成

- ✅ 基础运行时架构
- ✅ fluent-ffmpeg 适配器（完整实现）
- ✅ sharp 适配器（完整实现）
- ✅ 自动后端路由（基于格式支持）
- ✅ 适配器模式实现（完全可扩展）
- ✅ 格式支持声明和验证
- ✅ 统一操作接口（resize, encode, filter, crop, rotate, save）
- ✅ 条件逻辑支持（if/else）
- ✅ 元数据获取（getMetadata）
- ✅ 批量处理（affectBatch）
- ✅ 执行编译后的 DSL 操作（execute）

### 阶段 2: 高级功能 ✅ 已完成

- ✅ 进度追踪（progress callback 支持）
  - fluent-ffmpeg 进度事件集成
  - sharp 进度报告
  - 批量处理进度追踪
- ✅ 并行处理优化（affectBatch 支持 parallel 选项）
  - 并行处理多个文件
  - 顺序处理模式
  - 错误处理和进度报告
- ⏳ 流式处理支持（未来扩展）
- ⏳ 缓存机制（未来扩展）

### 阶段 3: 扩展性（未来考虑）

- ⏳ 自定义后端插件系统
- ⏳ WebAssembly 后端支持
- ⏳ GPU 加速后端
- ⏳ 云端处理后端

## 变更日志

### 2025-12-29（完成）

- ✅ 完成适配器模式重构，移除硬编码逻辑
- ✅ 实现格式支持声明和基于格式的后端选择
- ✅ 实现进度追踪功能（fluent-ffmpeg 和 sharp）
- ✅ 实现并行处理优化（affectBatch parallel 模式）
- ✅ 完善错误处理和格式验证
- ✅ 更新 execute() 函数支持 Operation[] 数据格式
- ✅ 添加完整的测试覆盖

### 2024-12-29（初始设计）

- 初始设计：@affectjs/runtime 运行时引擎
- 定义后端抽象层和适配器接口
- 设计自动后端路由机制
- 定义操作映射表
