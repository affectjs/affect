# RFC-005: @affectjs/affect - AffectJS 运行时引擎

**状态**: In Progress  
**日期**: 2024-12-29  
**作者**: Albert Li  
**相关问题**: 创建统一的媒体处理运行时，集成 fluent-ffmpeg 和 sharp

## 摘要

本文档描述了 **@affectjs/affect**，一个统一的媒体处理运行时引擎，用于执行由 `@affectjs/dsl` 编译生成的代码。该运行时设计为：
1. **多后端支持**: 自动选择最适合的后端（fluent-ffmpeg 用于视频/音频，sharp 用于图像）
2. **统一 API**: 提供一致的接口，隐藏后端差异
3. **智能路由**: 根据媒体类型和操作自动选择最优后端
4. **性能优化**: 利用各后端的优势，提供最佳性能

## 核心设计理念

### 1. 后端抽象层

运行时提供统一的操作接口，底层自动路由到不同的后端：

- **视频/音频处理**: 使用 `@luban-ws/fluent-ffmpeg`
- **图像处理**: 使用 `sharp`
- **混合操作**: 智能选择或组合使用多个后端

### 2. 自动后端选择

```typescript
// 运行时根据媒体类型自动选择后端
affect('video.mp4')  // → 使用 fluent-ffmpeg
affect('image.jpg')  // → 使用 sharp
```

### 3. 统一操作映射

DSL 中的操作自动映射到对应后端的 API：

```typescript
// DSL: resize 1280 720
// 视频 → ffmpeg.size('1280x720')
// 图像 → sharp.resize(1280, 720)
```

## 架构设计

### 包结构

```
@affectjs/affect/
├── src/
│   ├── index.ts           # 主入口
│   ├── runtime.ts         # 运行时核心
│   ├── backends/
│   │   ├── fluent-ffmpeg.ts  # fluent-ffmpeg 适配器
│   │   └── sharp.ts          # sharp 适配器
│   ├── router.ts          # 后端路由逻辑
│   └── types.ts           # 类型定义
├── package.json
└── README.md
```

### 核心组件

#### 1. 运行时引擎 (Runtime)

负责执行 DSL 编译后的代码，管理后端生命周期。

```typescript
interface Runtime {
  execute(compiledCode: string): Promise<Result>;
  registerBackend(name: string, backend: Backend): void;
  getBackend(mediaType: MediaType): Backend;
}
```

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
import { affect, execute } from '@affectjs/affect';

// 方式 1: 直接执行 DSL 代码
const result = await execute(compiledCode);

// 方式 2: 使用 affect 函数（类似 DSL 语法）
await affect('video.mp4')
  .resize(1280, 720)
  .encode('h264', 2000)
  .save('output.mp4');
```

### 后端选择 API

```typescript
import { affect, useBackend } from '@affectjs/affect';

// 显式指定后端
await affect('image.jpg')
  .useBackend('sharp')
  .resize(1920, 1080)
  .save('output.jpg');
```

### 批量处理 API

```typescript
import { affectBatch } from '@affectjs/affect';

// 批量处理多个文件
await affectBatch([
  { input: 'video1.mp4', output: 'out1.mp4', operations: [...] },
  { input: 'image1.jpg', output: 'out1.jpg', operations: [...] },
]);
```

## 操作映射表

### 视频/音频操作 → fluent-ffmpeg

| DSL 操作 | fluent-ffmpeg API |
|---------|------------------|
| `resize w h` | `.size('wxh')` |
| `encode codec param` | `.videoCodec(codec).videoBitrate(param)` |
| `filter name value` | `.videoFilters('name=value')` |
| `crop x y w h` | `.videoFilters('crop=w:h:x:y')` |
| `rotate angle` | `.videoFilters('rotate=angle')` |

### 图像操作 → sharp

| DSL 操作 | sharp API |
|---------|-----------|
| `resize w h` | `.resize(w, h)` |
| `encode format quality` | `.toFormat(format, { quality })` |
| `filter grayscale` | `.greyscale()` |
| `filter blur radius` | `.blur(radius)` |
| `filter brightness value` | `.modulate({ brightness })` |
| `crop x y w h` | `.extract({ left: x, top: y, width: w, height: h })` |
| `rotate angle` | `.rotate(angle)` |

## 实现细节

### 1. 媒体类型检测

```typescript
function detectMediaType(filePath: string): MediaType {
  const ext = path.extname(filePath).toLowerCase();
  const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
  const videoExts = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];
  const audioExts = ['.mp3', '.wav', '.aac', '.ogg'];
  
  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  throw new Error(`Unsupported media type: ${ext}`);
}
```

### 2. 后端路由逻辑

```typescript
function routeBackend(mediaType: MediaType, operations: Operation[]): Backend {
  // 图像操作优先使用 sharp
  if (mediaType === 'image') {
    return sharpBackend;
  }
  
  // 视频/音频操作使用 fluent-ffmpeg
  if (mediaType === 'video' || mediaType === 'audio') {
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
function convertOperation(
  operation: DSLOperation,
  backend: Backend
): BackendOperation {
  if (backend.name === 'sharp') {
    return convertToSharpOperation(operation);
  } else if (backend.name === 'fluent-ffmpeg') {
    return convertToFfmpegOperation(operation);
  }
  throw new Error(`Unsupported backend: ${backend.name}`);
}
```

## 使用示例

### 示例 1: 视频处理

```typescript
import { affect } from '@affectjs/affect';

await affect('input.mp4')
  .resize(1280, 720)
  .encode('h264', 2000)
  .encode('aac', 128)
  .save('output.mp4');
```

### 示例 2: 图像处理

```typescript
import { affect } from '@affectjs/affect';

await affect('photo.jpg')
  .resize(1920, 1080)
  .filter('grayscale')
  .filter('brightness', 1.1)
  .encode('jpeg', 90)
  .save('output.jpg');
```

### 示例 3: 执行编译后的 DSL 代码

```typescript
import { execute } from '@affectjs/affect';
import { compileDslFile } from '@affectjs/dsl';

const compiledCode = compileDslFile('video.affect');
const result = await execute(compiledCode);
```

### 示例 4: 批量处理

```typescript
import { affectBatch } from '@affectjs/affect';

await affectBatch([
  {
    input: 'video1.mp4',
    output: 'compressed1.mp4',
    operations: [
      { type: 'resize', width: 1280, height: 720 },
      { type: 'encode', codec: 'h264', param: 2000 },
    ],
  },
  {
    input: 'photo1.jpg',
    output: 'resized1.jpg',
    operations: [
      { type: 'resize', width: 1920, height: 1080 },
    ],
  },
]);
```

## 依赖关系

```
@affectjs/affect
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
2. **执行阶段**: `@affectjs/affect` 执行编译后的代码，自动选择后端

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

## 未来考虑

### 阶段 1: 核心运行时（当前）

- ✅ 基础运行时架构
- ✅ fluent-ffmpeg 适配器
- ✅ sharp 适配器
- ✅ 自动后端路由

### 阶段 2: 高级功能

- ⏳ 流式处理支持
- ⏳ 并行处理优化
- ⏳ 缓存机制
- ⏳ 进度追踪

### 阶段 3: 扩展性

- ⏳ 自定义后端插件系统
- ⏳ WebAssembly 后端支持
- ⏳ GPU 加速后端
- ⏳ 云端处理后端

## 变更日志

### 2024-12-29
- 初始设计：@affectjs/affect 运行时引擎
- 定义后端抽象层和适配器接口
- 设计自动后端路由机制
- 定义操作映射表

