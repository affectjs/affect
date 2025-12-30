# @affectjs/runtime

统一媒体处理运行时引擎 - 集成 fluent-ffmpeg 和 sharp

@affectjs/runtime 是 AffectJS 的运行时引擎，自动选择最适合的后端来处理视频、音频和图像。

## 特性

- 🎬 **多后端支持**: 自动选择 fluent-ffmpeg（视频/音频）或 sharp（图像）
- 🚀 **统一 API**: 一致的接口，隐藏后端差异
- 🧠 **智能路由**: 根据媒体类型和操作自动选择最优后端
- ⚡ **性能优化**: 利用各后端的优势，提供最佳性能

## 安装

```bash
pnpm add @affectjs/runtime
```

## 使用

### 基础用法

```typescript
import { affect } from "@affectjs/runtime";

// 视频处理
await affect("input.mp4").resize(1280, 720).encode("h264", 2000).save("output.mp4");

// 图像处理
await affect("photo.jpg").resize(1920, 1080).filter("grayscale").save("output.jpg");
```

### 执行编译后的 DSL 代码

```typescript
import { execute } from "@affectjs/runtime";
import { compileDslFile } from "@affectjs/dsl";

const compiledCode = compileDslFile("video.affect");
const result = await execute(compiledCode);
```

### 批量处理

```typescript
import { affectBatch } from '@affectjs/runtime';

await affectBatch([
  { input: 'video1.mp4', output: 'out1.mp4', operations: [...] },
  { input: 'image1.jpg', output: 'out1.jpg', operations: [...] },
]);
```

## API

### `affect(input: string)`

创建媒体处理链，自动检测媒体类型并选择后端。

### `execute(compiledCode: string, options?: RuntimeOptions)`

执行由 `@affectjs/dsl` 编译生成的代码。

### `affectBatch(items: BatchItem[])`

批量处理多个文件。

## 后端选择

运行时根据以下规则自动选择后端：

- **图像文件** (`.jpg`, `.png`, `.webp`, 等) → `sharp`
- **视频文件** (`.mp4`, `.avi`, `.mov`, 等) → `fluent-ffmpeg`
- **音频文件** (`.mp3`, `.wav`, `.aac`, 等) → `fluent-ffmpeg`

## 文档

详细文档请参考 [RFC-005](../docs/rfc/0005-affectjs-runtime.md)。

## License

MIT
