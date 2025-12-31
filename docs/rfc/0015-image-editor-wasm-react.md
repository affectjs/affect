# RFC-015: 纯浏览器图像编辑器（WASM + React）

**状态**: 规划中
**日期**: 2025-12-30
**作者**: Albert Li
**相关议题**: 基于 WASM 的纯浏览器图像编辑器，使用 React 和 wasm-vips

## 摘要

本文档描述了一个**纯浏览器图像编辑器**的设计和实现，使用 **React** 作为 UI 框架，**wasm-vips** 作为图像处理引擎，**Affect DSL** 作为操作描述语言。编辑器完全在浏览器中运行，无需服务器，支持常见的图像编辑操作。

**核心特性**:

- 🌐 **纯浏览器运行**: 无需服务器，完全离线工作
- ⚡ **WASM 图像处理**: 使用 wasm-vips 提供高性能图像处理
- 📝 **DSL 驱动**: 使用 Affect DSL 描述图像操作
- 🎨 **React UI**: 现代化的图像编辑界面
- 🔄 **实时预览**: 即时预览编辑效果

**与相关 RFC 的关系**:

- **对应**: [RFC-014: 纯浏览器视频编辑器](./0014-web-video-editor-wasm-react.md) - 视频编辑器的姊妹项目
- **基于**: [RFC-003: 浏览器运行时](./0003-browser-runtime.md) - 使用 wasm-vips 后端
- **配合**: Editor 包作为媒体类型路由器，自动选择视频或图像编辑器

## 动机

1. **纯浏览器处理**: 图像文件通常较小，非常适合在浏览器中处理
2. **隐私保护**: 图像数据不上传服务器，完全本地处理
3. **快速迭代**: 实时预览编辑效果，无需等待服务器
4. **DSL 统一**: 与视频编辑器使用相同的 DSL 语法
5. **AI 友好**: DSL 驱动的设计使得 AI 可以轻松生成编辑操作

## 技术栈

### 核心技术

- **React 18+**: UI 框架
- **wasm-vips**: 图像处理 WASM 库（基于 libvips）
- **@affectjs/dsl**: DSL 解析器和编译器
- **Zustand**: 状态管理
- **Vite**: 构建工具

### UI 组件

- **Canvas/SVG**: 图像显示和交互
- **Tailwind CSS**: 样式
- **Radix UI**: 基础组件

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│         React Image Editor (Browser Only)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Canvas     │  │   Toolbar    │  │   Inspector   │ │
│  │   Editor     │  │   (Tools)    │  │   Panel       │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                          │                              │
│                          ▼                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │         DSL Generation                           │  │
│  │  (User Actions → Affect DSL)                     │  │
│  └──────────────────────────────────────────────────┘  │
│                          │                              │
│                          ▼                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │     wasm-vips Image Processing                   │  │
│  │  ┌──────────────┐      ┌──────────────┐         │  │
│  │  │ wasm-vips    │      │ Affect DSL   │         │  │
│  │  │  Backend     │ ←──→ │  Executor    │         │  │
│  │  └──────────────┘      └──────────────┘         │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 核心功能

### 1. 基础编辑操作

#### 几何变换

- **缩放 (Resize)**: 调整图像尺寸
- **裁剪 (Crop)**: 裁剪指定区域
- **旋转 (Rotate)**: 任意角度旋转
- **翻转 (Flip)**: 水平/垂直翻转

#### 颜色调整

- **亮度/对比度**: 调整图像明暗
- **饱和度**: 调整色彩饱和度
- **色调**: 调整色调偏移
- **曝光**: 调整曝光度

#### 滤镜效果

- **模糊**: 高斯模糊、运动模糊
- **锐化**: 增强图像锐度
- **灰度**: 转换为黑白
- **色彩滤镜**: 复古、暖色调、冷色调等

### 2. 图层系统

```typescript
interface Layer {
  id: string;
  type: "image" | "text" | "shape";
  visible: boolean;
  opacity: number;
  blendMode: BlendMode;
  transform: Transform;
  filters: Filter[];
}

interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}
```

### 3. 文字和图形

- **文字图层**: 添加文字，支持字体、大小、颜色
- **形状图层**: 矩形、圆形、线条等基础图形
- **蒙版**: 支持图层蒙版

## DSL 示例

### 基础图像编辑

```dsl
affect image "photo.jpg" "edited.jpg" {
  resize 1920 1080
  rotate 90
  filter brightness 1.2
  filter saturation 1.1
  filter blur 2
}
```

### 复杂图像处理

```dsl
affect image "portrait.jpg" "output.jpg" {
  crop 800 800 200 100
  filter grayscale
  filter contrast 1.3
  rotate -5
  save "output.jpg"
}
```

## 实现细节

### 项目结构

```
packages/@affectjs/image-editor/
├── src/
│   ├── components/
│   │   ├── Canvas/
│   │   │   ├── CanvasEditor.tsx    # 主画布组件
│   │   │   ├── LayerRenderer.tsx   # 图层渲染
│   │   │   └── InteractionLayer.tsx # 交互层
│   │   ├── Toolbar/
│   │   │   ├── ToolPanel.tsx       # 工具面板
│   │   │   ├── FilterPanel.tsx     # 滤镜面板
│   │   │   └── AdjustPanel.tsx     # 调整面板
│   │   ├── Inspector/
│   │   │   ├── LayerList.tsx       # 图层列表
│   │   │   └── PropertyPanel.tsx   # 属性面板
│   │   └── Preview/
│   │       └── ImagePreview.tsx    # 预览组件
│   ├── services/
│   │   ├── vips/
│   │   │   └── vips.ts             # wasm-vips 封装
│   │   └── dsl/
│   │       └── dsl-generator.ts    # DSL 生成器
│   ├── store/
│   │   ├── editor.ts               # 编辑器状态
│   │   ├── layers.ts               # 图层状态
│   │   └── history.ts              # 历史记录
│   ├── types/
│   │   ├── layer.ts
│   │   └── filter.ts
│   └── utils/
│       ├── image.ts                # 图像工具
│       └── transform.ts            # 变换工具
├── package.json
└── vite.config.ts
```

### wasm-vips 集成

```typescript
// services/vips/vips.ts
import Vips from "wasm-vips";

export class VipsService {
  private vips: any = null;
  private loaded = false;

  async load() {
    if (this.loaded) return;

    this.vips = await Vips({
      // wasm-vips 配置
      locateFile: (fileName: string) => {
        return `https://cdn.jsdelivr.net/npm/wasm-vips@latest/lib/${fileName}`;
      },
    });

    this.loaded = true;
    console.log("wasm-vips loaded");
  }

  async processImage(inputBuffer: ArrayBuffer, operations: Operation[]): Promise<ArrayBuffer> {
    if (!this.loaded) await this.load();

    // 从 buffer 创建图像
    let image = this.vips.Image.newFromBuffer(new Uint8Array(inputBuffer));

    // 应用操作
    for (const op of operations) {
      image = this.applyOperation(image, op);
    }

    // 导出为 buffer
    const outputBuffer = image.writeToBuffer(".jpg");
    return outputBuffer.buffer;
  }

  private applyOperation(image: any, op: Operation): any {
    switch (op.type) {
      case "resize":
        return image.resize(op.scale);
      case "rotate":
        return image.rotate(op.angle);
      case "crop":
        return image.crop(op.left, op.top, op.width, op.height);
      case "filter":
        return this.applyFilter(image, op.name, op.value);
      default:
        return image;
    }
  }

  private applyFilter(image: any, filterName: string, value?: number): any {
    switch (filterName) {
      case "blur":
        return image.gaussblur(value || 5);
      case "sharpen":
        return image.sharpen();
      case "grayscale":
        return image.colourspace("b-w");
      case "brightness":
        return image.linear(value || 1.2, 0);
      default:
        return image;
    }
  }
}

export const vipsService = new VipsService();
```

### Canvas 编辑器组件

```typescript
// components/Canvas/CanvasEditor.tsx
import { useRef, useEffect } from 'react';
import { useEditorStore } from '../../store/editor';

export function CanvasEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { currentImage, layers } = useEditorStore();

  useEffect(() => {
    if (!canvasRef.current || !currentImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 渲染图像和图层
    renderLayers(ctx, currentImage, layers);
  }, [currentImage, layers]);

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        className="main-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
    </div>
  );
}
```

### DSL 生成器

```typescript
// services/dsl/dsl-generator.ts
export function generateImageDSL(
  inputFile: string,
  outputFile: string,
  operations: ImageOperation[]
): string {
  let dsl = `affect image "${inputFile}" "${outputFile}" {\n`;

  for (const op of operations) {
    switch (op.type) {
      case "resize":
        dsl += `  resize ${op.width} ${op.height}\n`;
        break;
      case "rotate":
        dsl += `  rotate ${op.angle}\n`;
        break;
      case "crop":
        dsl += `  crop ${op.width} ${op.height} ${op.x} ${op.y}\n`;
        break;
      case "filter":
        dsl += `  filter ${op.name}${op.value ? ` ${op.value}` : ""}\n`;
        break;
    }
  }

  dsl += "}\n";
  return dsl;
}
```

## 性能考虑

### 1. 图像大小限制

- 建议最大尺寸: 8192 x 8192
- 建议最大文件大小: 50MB
- 超大图像自动降采样预览

### 2. 实时预览优化

- 使用降采样版本进行预览
- 仅在导出时使用原始尺寸
- Canvas 渲染优化

### 3. 内存管理

- 及时释放不再使用的图像 buffer
- 限制历史记录数量
- 使用 Web Worker 处理大图像

## 使用流程

### 典型编辑流程

1. **打开图像**
   - 拖拽或选择图像文件
   - 自动加载到画布

2. **编辑操作**
   - 使用工具栏进行基础编辑
   - 应用滤镜和效果
   - 添加文字和图形

3. **实时预览**
   - 每次操作自动更新预览
   - 使用 wasm-vips 实时处理

4. **导出**
   - 选择导出格式（JPEG, PNG, WebP）
   - 调整质量参数
   - 下载编辑后的图像

## 与 RFC-014 的关系

### 共享架构

- 都使用 Affect DSL
- 都支持 BrowserAdapter 和 ApiAdapter
- 都使用 React + Zustand

### 差异点

- **RFC-014**: 视频编辑，使用 ffmpeg.wasm，时间轴 UI
- **RFC-015**: 图像编辑，使用 wasm-vips，画布 UI

### Editor 包集成

```typescript
// @affectjs/editor 自动检测媒体类型
import { detectMediaType } from '@affectjs/editor';
import { VideoEditor } from '@affectjs/video-editor';
import { ImageEditor } from '@affectjs/image-editor';

function MediaEditor({ file }: { file: File }) {
  const mediaType = detectMediaType(file);

  if (mediaType === 'video' || mediaType === 'audio') {
    return <VideoEditor file={file} />;
  } else if (mediaType === 'image') {
    return <ImageEditor file={file} />;
  }

  return <div>Unsupported media type</div>;
}
```

## 测试计划

### 功能测试

- [ ] 图像加载和显示
- [ ] 基础编辑操作（resize, crop, rotate）
- [ ] 滤镜效果
- [ ] 图层系统
- [ ] DSL 生成准确性
- [ ] 导出功能

### 性能测试

- [ ] 大图像处理（> 10MB）
- [ ] 实时预览性能
- [ ] 多图层性能
- [ ] 内存使用情况

### 兼容性测试

- [ ] 不同图像格式（JPEG, PNG, WebP, GIF）
- [ ] 不同尺寸
- [ ] 不同浏览器（Chrome, Firefox, Safari）

## 迁移路径

### 阶段 1: 基础功能（2-3周）

1. **wasm-vips 集成**
2. **Canvas 编辑器**
3. **基础工具**（resize, crop, rotate）

### 阶段 2: 进阶功能（2-3周）

1. **滤镜系统**
2. **图层支持**
3. **DSL 生成器**

### 阶段 3: 完善（1-2周）

1. **UI 优化**
2. **性能优化**
3. **测试和验证**

## 参考

### 相关 RFC

- [RFC-014: 纯浏览器视频编辑器](./0014-web-video-editor-wasm-react.md)
- [RFC-003: 浏览器运行时](./0003-browser-runtime.md)
- [RFC-004: Affect DSL](./completed/0004-fluent-ffmpeg-dsl.md)

### 外部文档

- [wasm-vips 文档](https://github.com/kleisauke/wasm-vips)
- [libvips 文档](https://www.libvips.org/)
- [React 文档](https://react.dev/)

## 变更日志

### 2025-12-30

- 初始 RFC 创建
- 定义纯浏览器图像编辑器架构
- 规划 wasm-vips 集成
- 设计与 RFC-014（视频编辑器）的协同工作方式
