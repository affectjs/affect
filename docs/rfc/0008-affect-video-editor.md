# RFC-008: Affect 快速视频编辑器

**状态**: 计划中  
**日期**: 2025-12-29  
**作者**: Albert Li  
**相关问题**: 基于 Affect DSL 的快速视频编辑器，支持浏览器预览和服务器端渲染

## 摘要

本文档描述了一个基于 **Affect DSL** 的快速视频编辑器，采用 **Bun + Elysia** 作为服务器端，**React** 作为客户端。编辑器可以动态创建 Affect DSL，利用 **ffmpeg.wasm** 在浏览器中进行预览，最终渲染在 Bun 服务器端完成（特别是对于大型视频）。设计目标是提供一个快速、轻量的视频编辑器，专注于处理中等大小的视频，而非大型专业视频编辑器。

**核心特性**:
- 🚀 一键启动：`npx affect-fluent` 启动服务器并打开浏览器
- 🎨 React 前端：现代化的视频编辑界面
- ⚡ Bun + Elysia 后端：高性能 API 服务器
- 📝 DSL 驱动：动态生成 Affect DSL 进行视频处理
- 🌐 浏览器预览：使用 [RFC-009 浏览器预览运行时](./0009-browser-preview-runtime.md) 进行实时预览（基于 [RFC-003 浏览器运行时](./0003-browser-runtime.md)）
- 🖥️ 服务器渲染：大型视频在服务器端渲染

**相关 RFC**:
- [RFC-003: 浏览器运行时](./0003-browser-runtime.md) - 提供通用的浏览器运行时基础（ffmpeg.wasm + sharp.wasm）
- [RFC-009: 浏览器预览运行时](./0009-browser-preview-runtime.md) - 在 RFC-003 基础上为编辑器优化的专门预览运行时

## 动机

1. **快速编辑**: 提供快速、轻量的视频编辑体验，适合中等大小视频
2. **DSL 驱动**: 利用 Affect DSL 的统一语法，实现编辑操作的抽象化
3. **混合渲染**: 浏览器预览 + 服务器渲染，兼顾速度和性能
4. **易于部署**: 一键启动，无需复杂配置
5. **AI 友好**: DSL 驱动的设计使得 AI 可以轻松生成编辑操作

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    React Client (Browser)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Timeline   │  │   Preview    │  │   Inspector   │ │
│  │   Editor     │  │  (ffmpeg.wasm)│  │   Panel       │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │         Dynamic DSL Generation                    │  │
│  │  (User Actions → Affect DSL)                      │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          │ HTTP/WebSocket
                          │
┌─────────────────────────────────────────────────────────┐
│              Bun + Elysia Server                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   API Routes │  │  DSL Executor │  │   Render     │ │
│  │   (Elysia)   │  │ (@affectjs/   │  │   Queue      │ │
│  │              │  │  affect)      │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │         FFmpeg Processing (fluent-ffmpeg)         │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 技术栈

#### 服务器端
- **运行时**: Bun 1.0+
- **框架**: Elysia
- **语言**: TypeScript
- **视频处理**: `@affectjs/affect` + `@affectjs/fluent-ffmpeg`
- **DSL 处理**: `@affectjs/dsl`

#### 客户端
- **框架**: React 18+
- **构建工具**: Vite
- **视频预览**: ffmpeg.wasm
- **UI 组件**: 自定义组件 + 轻量级 UI 库
- **状态管理**: Zustand 或 Jotai
- **类型**: TypeScript

### 核心设计理念

#### 1. DSL 驱动的编辑操作

所有编辑操作都转换为 Affect DSL：

```typescript
// 用户操作：调整视频大小
// ↓
// 生成 DSL
affect video "input.mp4" "output.mp4" {
  resize 1280 720
}

// 用户操作：添加滤镜
// ↓
// 生成 DSL
affect video "input.mp4" "output.mp4" {
  filter grayscale
  filter blur 5
}
```

#### 2. 混合渲染策略

- **浏览器预览** (ffmpeg.wasm):
  - 适用于小到中等视频（< 100MB）
  - 实时预览，无需服务器往返
  - 快速迭代编辑操作

- **服务器渲染** (Bun + fluent-ffmpeg):
  - 适用于大型视频（> 100MB）
  - 利用服务器性能
  - 最终导出

#### 3. 动态 DSL 生成

编辑器界面操作自动生成 DSL：

```typescript
// 时间轴操作
timeline.addClip(video, { start: 0, duration: 10 })
// → 生成 DSL: affect video ... { ... }

// 滤镜应用
applyFilter('grayscale')
// → 生成 DSL: affect video ... { filter grayscale }

// 裁剪操作
crop({ x: 0, y: 0, width: 1280, height: 720 })
// → 生成 DSL: affect video ... { crop 1280 720 0 0 }
```

## 功能设计

### 核心编辑功能

#### 1. 时间轴编辑器

- **多轨道支持**:
  - 视频轨道（主视频、叠加视频）
  - 音频轨道（主音频、背景音乐）
  - 文字轨道（标题、字幕）
  - 特效轨道（滤镜、转场）

- **时间轴特性**:
  - 拖拽调整片段位置
  - 拖拽调整片段时长
  - 时间轴缩放（毫秒级精度）
  - 播放头控制
  - 吸附功能

#### 2. 视频处理

- **基础操作**:
  - 裁剪（时间范围）
  - 分割（多个片段）
  - 合并（多个视频）
  - 速度调整（0.25x - 4x）

- **变换操作**:
  - 位置调整
  - 缩放
  - 旋转
  - 翻转

#### 3. 音频处理

- **基础处理**:
  - 音量调整
  - 淡入/淡出
  - 静音/取消静音
  - 音频分离

#### 4. 文字和图形

- **文字叠加**:
  - 多行文本
  - 字体、大小、颜色
  - 位置调整
  - 文字动画

#### 5. 滤镜和效果

- **颜色调整**:
  - 亮度、对比度、饱和度
  - 色温、色调

- **视觉效果**:
  - 模糊
  - 锐化
  - 黑白/复古滤镜

#### 6. 转场效果

- 淡入淡出
- 滑动（左、右、上、下）
- 缩放
- 旋转

### 预览系统

#### 浏览器预览 (ffmpeg.wasm)

浏览器预览功能由 [RFC-009: 浏览器预览运行时](./0009-browser-preview-runtime.md) 提供，该运行时基于 [RFC-003: 浏览器运行时](./0003-browser-runtime.md) 构建。

```typescript
// 使用浏览器预览运行时（RFC-009）
import { execute as executeBrowser } from '@affectjs/affect-browser';

// 执行 DSL 操作进行预览
const previewDSL = generatePreviewDSL(operations);
const previewVideo = await executeBrowser(previewDSL);
```

**优势**:
- 实时预览，无需等待服务器
- 减少服务器负载
- 快速迭代编辑操作

**限制**:
- 仅适用于中小型视频（< 100MB）
- 性能受浏览器限制

**实现细节**: 详见 [RFC-009: 浏览器预览运行时](./0009-browser-preview-runtime.md)

#### 服务器预览

```typescript
// 对于大型视频，使用服务器预览
POST /api/preview
Body: { dsl: string, timeRange: { start: number, end: number } }

// 服务器生成预览片段
const preview = await executeDSL(dsl, { 
  timeRange: { start: 0, end: 10 } 
});
```

### 渲染系统

#### 最终渲染流程

```typescript
// 1. 客户端生成完整 DSL
const finalDSL = generateFinalDSL(project);

// 2. 发送到服务器
POST /api/render
Body: { dsl: string, options: RenderOptions }

// 3. 服务器执行渲染
const result = await executeDSL(finalDSL, {
  input: project.inputFile,
  output: project.outputFile,
});

// 4. WebSocket 推送进度
ws.send({ type: 'progress', progress: 45 });

// 5. 完成后返回下载链接
ws.send({ type: 'complete', downloadUrl: '...' });
```

## 实现细节

### 服务器端实现 (Bun + Elysia)

#### 项目结构

```
packages/@affectjs/editor/
├── server/
│   ├── src/
│   │   ├── index.ts              # Elysia 应用入口
│   │   ├── routes/
│   │   │   ├── upload.ts         # 文件上传
│   │   │   ├── project.ts        # 项目管理
│   │   │   ├── preview.ts        # 预览生成
│   │   │   ├── render.ts         # 渲染任务
│   │   │   └── ws.ts             # WebSocket
│   │   ├── services/
│   │   │   ├── dsl-generator.ts  # DSL 生成服务
│   │   │   ├── render-queue.ts   # 渲染队列
│   │   │   └── storage.ts         # 文件存储
│   │   └── types/
│   │       └── editor.ts
│   ├── package.json
│   └── tsconfig.json
├── client/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Timeline/
│   │   │   ├── Preview/
│   │   │   ├── Inspector/
│   │   │   └── Toolbar/
│   │   ├── hooks/
│   │   │   ├── useDSLGenerator.ts
│   │   │   └── usePreview.ts
│   │   └── services/
│   │       ├── api.ts
│   │       └── ffmpeg-wasm.ts
│   ├── package.json
│   └── vite.config.ts
└── package.json
```

#### API 端点设计

##### 1. 文件上传

```typescript
POST /api/v1/upload
Body: FormData { file: File }

Response: {
  id: string;
  filename: string;
  metadata: {
    duration: number;
    width: number;
    height: number;
    fps: number;
  };
}
```

##### 2. 项目管理

```typescript
// 创建项目
POST /api/v1/projects
Body: { name: string, inputFileId: string }

// 获取项目
GET /api/v1/projects/:id

// 更新项目（保存编辑操作）
PUT /api/v1/projects/:id
Body: { operations: Operation[] }

// 删除项目
DELETE /api/v1/projects/:id
```

##### 3. 预览生成

```typescript
// 浏览器预览（返回 DSL）
GET /api/v1/projects/:id/preview-dsl
Query: { timeRange?: string }

Response: {
  dsl: string;
  previewType: 'browser' | 'server';
}

// 服务器预览（生成预览视频）
POST /api/v1/projects/:id/preview
Body: { dsl: string, timeRange: { start: number, end: number } }

Response: {
  previewUrl: string;
}
```

##### 4. 渲染任务

```typescript
// 开始渲染
POST /api/v1/projects/:id/render
Body: { 
  dsl: string,
  options: {
    format: string;
    quality: string;
  }
}

Response: {
  taskId: string;
}

// 查询渲染状态
GET /api/v1/render/:taskId

Response: {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string;
  error?: string;
}
```

##### 5. WebSocket 实时通信

```typescript
WS /ws/projects/:projectId

// 消息类型
interface WSMessage {
  type: 'progress' | 'complete' | 'error' | 'collaboration';
  data: any;
}
```

#### Elysia 实现示例

```typescript
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { websocket } from '@elysiajs/websocket';
import { execute } from '@affectjs/affect';
import { compileDsl } from '@affectjs/dsl';

const app = new Elysia()
  .use(cors())
  .use(websocket())
  
  // 文件上传
  .post('/api/v1/upload', async ({ body }) => {
    const file = body.file;
    // 处理上传...
    return { id: '...', filename: '...', metadata: {...} };
  })
  
  // 项目管理
  .post('/api/v1/projects', async ({ body }) => {
    // 创建项目...
    return { id: '...', ... };
  })
  
  // 渲染任务
  .post('/api/v1/projects/:id/render', async ({ params, body }) => {
    const { dsl, options } = body;
    
    // 编译 DSL
    const compiledCode = compileDsl(dsl);
    
    // 执行渲染
    const taskId = await startRenderTask({
      projectId: params.id,
      dsl: compiledCode,
      options,
    });
    
    return { taskId };
  })
  
  // WebSocket 渲染进度
  .ws('/ws/render/:taskId', {
    message: async (ws, message) => {
      // 处理消息...
    },
    open: async (ws) => {
      // 开始推送进度
      const task = getRenderTask(ws.data.params.taskId);
      task.onProgress((progress) => {
        ws.send({ type: 'progress', progress });
      });
    },
  })
  
  .listen(3000);
```

### 客户端实现 (React)

#### DSL 生成器 Hook

```typescript
// hooks/useDSLGenerator.ts
export function useDSLGenerator(project: Project) {
  const generateDSL = useCallback((operations: Operation[]) => {
    let dsl = `affect video "${project.inputFile}" "${project.outputFile}" {\n`;
    
    for (const op of operations) {
      switch (op.type) {
        case 'resize':
          dsl += `  resize ${op.width} ${op.height}\n`;
          break;
        case 'filter':
          dsl += `  filter ${op.name}${op.value ? ` ${op.value}` : ''}\n`;
          break;
        case 'crop':
          dsl += `  crop ${op.width} ${op.height} ${op.x} ${op.y}\n`;
          break;
        // ... 更多操作
      }
    }
    
    dsl += '}\n';
    return dsl;
  }, [project]);
  
  return { generateDSL };
}
```

#### 预览系统

```typescript
// hooks/usePreview.ts
export function usePreview(project: Project) {
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const generatePreview = useCallback(async (timeRange?: TimeRange) => {
    setIsLoading(true);
    
    try {
      // 生成预览 DSL
      const previewDSL = generatePreviewDSL(project, timeRange);
      
      // 判断使用浏览器预览还是服务器预览
      const shouldUseBrowser = project.inputFileSize < 100 * 1024 * 1024; // 100MB
      
      if (shouldUseBrowser) {
        // 使用 ffmpeg.wasm
        const video = await executeDSLInBrowser(previewDSL);
        setPreviewVideo(video);
      } else {
        // 使用服务器预览
        const response = await api.post(`/api/v1/projects/${project.id}/preview`, {
          dsl: previewDSL,
          timeRange,
        });
        setPreviewVideo(response.previewUrl);
      }
    } finally {
      setIsLoading(false);
    }
  }, [project]);
  
  return { previewVideo, isLoading, generatePreview };
}
```

#### 时间轴组件

```typescript
// components/Timeline/Timeline.tsx
export function Timeline({ project, onOperationAdd }: TimelineProps) {
  const { generateDSL } = useDSLGenerator(project);
  
  const handleClipAdd = (clip: Clip) => {
    // 添加片段到时间轴
    const operation: Operation = {
      type: 'addClip',
      clip,
    };
    
    onOperationAdd(operation);
    
    // 生成 DSL 并预览
    const dsl = generateDSL([...project.operations, operation]);
    // 触发预览更新...
  };
  
  return (
    <div className="timeline">
      {/* 时间轴 UI */}
    </div>
  );
}
```

### 一键启动系统

#### CLI 命令实现

```typescript
// packages/@affectjs/editor/cli.ts
#!/usr/bin/env bun

import { $ } from 'bun';
import { serve } from 'bun';

async function startEditor() {
  console.log('🚀 Starting Affect Video Editor...');
  
  // 1. 检查 Bun 环境
  if (!process.env.BUN_VERSION) {
    console.error('❌ Bun is required. Install: curl -fsSL https://bun.sh/install | bash');
    process.exit(1);
  }
  
  // 2. 启动服务器
  console.log('📡 Starting Elysia server...');
  const server = await import('./server/src/index.ts');
  
  // 3. 打开浏览器
  const port = process.env.PORT || 3000;
  const url = `http://localhost:${port}`;
  
  console.log(`✅ Server running at ${url}`);
  console.log('🌐 Opening browser...');
  
  // 打开浏览器
  await $`open ${url}`; // macOS
  // await $`xdg-open ${url}`; // Linux
  // await $`start ${url}`; // Windows
}

startEditor();
```

#### package.json 配置

```json
{
  "name": "@affectjs/editor",
  "version": "1.0.0",
  "bin": {
    "affect-fluent": "./cli.js"
  },
  "scripts": {
    "start": "bun run server/src/index.ts",
    "build:client": "cd client && vite build",
    "build:server": "bun build server/src/index.ts --outdir dist",
    "dev": "bun run --watch server/src/index.ts"
  }
}
```

## 数据模型

### 项目数据模型

```typescript
interface Project {
  id: string;
  name: string;
  inputFileId: string;
  inputFile: string;
  inputFileSize: number;
  outputFile?: string;
  operations: Operation[];
  settings: {
    width: number;
    height: number;
    fps: number;
    format: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface Operation {
  id: string;
  type: 'resize' | 'filter' | 'crop' | 'rotate' | 'addClip' | 'removeClip';
  params: Record<string, any>;
  startTime?: number;
  duration?: number;
}

interface Clip {
  id: string;
  assetId: string;
  startTime: number;
  duration: number;
  trackId: string;
  properties: ClipProperties;
}

interface ClipProperties {
  position?: { x: number; y: number };
  scale?: { x: number; y: number };
  rotation?: number;
  opacity?: number;
  filters?: Filter[];
}
```

## 使用流程

### 典型编辑流程

1. **启动编辑器**
   ```bash
   npx affect-fluent
   ```

2. **上传视频**
   - 拖拽或选择视频文件
   - 自动提取元数据

3. **编辑操作**
   - 在时间轴上添加片段
   - 应用滤镜和效果
   - 添加文字和图形
   - 调整音频

4. **实时预览**
   - 浏览器使用 ffmpeg.wasm 预览（小视频）
   - 或服务器生成预览片段（大视频）

5. **最终渲染**
   - 生成完整 DSL
   - 提交渲染任务到服务器
   - 通过 WebSocket 监控进度
   - 下载最终视频

### DSL 生成示例

```typescript
// 用户操作序列
1. 上传视频: input.mp4
2. 调整大小: 1280x720
3. 应用滤镜: 灰度 + 模糊
4. 添加文字: "Hello World"
5. 裁剪: 0-10秒

// 生成的 DSL
affect video "input.mp4" "output.mp4" {
  resize 1280 720
  filter grayscale
  filter blur 5
  text "Hello World" {
    position 100 100
    size 24
    color white
  }
  crop 1280 720 0 0
  save "output.mp4"
}
```

## 性能考虑

### 浏览器预览限制

- **文件大小**: < 100MB 推荐使用浏览器预览
- **分辨率**: 建议预览时降低分辨率（如 720p）
- **时长**: 建议预览片段 < 30秒

### 服务器渲染优化

- **队列管理**: 渲染任务队列，限制并发数
- **进度推送**: WebSocket 实时推送进度
- **缓存机制**: 缓存中间结果，避免重复计算
- **资源清理**: 自动清理临时文件

## 部署和分发

### 发布到 npm

```json
{
  "name": "@affectjs/editor",
  "version": "1.0.0",
  "bin": {
    "affect-fluent": "./cli.js"
  },
  "files": [
    "cli.js",
    "server/",
    "client/dist/"
  ]
}
```

### 使用方式

```bash
# 全局安装
npm install -g @affectjs/editor
affect-fluent

# 或使用 npx（推荐）
npx @affectjs/editor
```

## 测试计划

### 功能测试

- [ ] 文件上传和元数据提取
- [ ] 时间轴编辑操作
- [ ] DSL 生成准确性
- [ ] 浏览器预览（ffmpeg.wasm）
- [ ] 服务器预览
- [ ] 最终渲染
- [ ] WebSocket 进度推送

### 性能测试

- [ ] 浏览器预览性能（不同文件大小）
- [ ] 服务器渲染性能
- [ ] 并发渲染任务
- [ ] 大文件处理（> 1GB）

### 兼容性测试

- [ ] 不同视频格式
- [ ] 不同分辨率
- [ ] 不同浏览器（Chrome, Firefox, Safari）
- [ ] 不同操作系统

## 迁移路径

### 阶段 1: 基础功能（4-6周）

1. **服务器端**:
   - Elysia 基础框架
   - 文件上传 API
   - 项目管理 API
   - DSL 执行集成

2. **客户端**:
   - React 基础框架
   - 时间轴组件
   - 预览组件
   - DSL 生成器

3. **CLI**:
   - 一键启动脚本
   - 浏览器自动打开

### 阶段 2: 预览系统（2-3周）

1. **浏览器预览**:
   - ffmpeg.wasm 集成
   - DSL 到 ffmpeg.wasm 转换
   - 预览性能优化

2. **服务器预览**:
   - 预览片段生成
   - 预览缓存

### 阶段 3: 渲染系统（3-4周）

1. **渲染队列**:
   - 任务队列管理
   - 并发控制
   - 进度追踪

2. **WebSocket**:
   - 实时进度推送
   - 错误处理
   - 连接管理

### 阶段 4: 完善和优化（2-3周）

1. **用户体验**:
   - UI 优化
   - 错误处理
   - 加载状态

2. **性能优化**:
   - 缓存策略
   - 资源清理
   - 内存管理

## 未来扩展

### 短期改进

1. **更多编辑功能**:
   - 关键帧动画
   - 颜色校正
   - 音频混音

2. **协作功能**:
   - 项目分享
   - 多人协作编辑

### 长期扩展

1. **AI 功能**:
   - 自动剪辑建议
   - 智能字幕生成
   - 场景识别

2. **模板系统**:
   - 编辑模板
   - 预设效果

3. **云存储集成**:
   - 项目云端保存
   - 视频云端存储

## 参考

### 相关 RFC

- [RFC-003: 浏览器运行时（ffmpeg.wasm + sharp.wasm）](./0003-browser-runtime.md) - 通用的浏览器运行时基础实现
- [RFC-009: 浏览器预览运行时](./0009-browser-preview-runtime.md) - 专门为编辑器优化的浏览器预览运行时（基于 RFC-003）
- [RFC-004: @affectjs/dsl - 统一媒体处理 DSL](./completed/0004-fluent-ffmpeg-dsl.md) - DSL 语法和设计
- [RFC-005: @affectjs/affect - AffectJS 运行时引擎](./0005-affectjs-runtime.md) - 服务器端运行时引擎
- [RFC-007: AffectJS 架构设计](./0007-affectjs-architecture.md) - 整体架构设计
- [RFC-010: Affect Agent](./0010-affect-agent.md) - LLM 驱动的 DSL 生成和优化，可为编辑器提供智能 DSL 生成功能
- [RFC-011: Monaco DSL 代码编辑器](./0011-monaco-dsl-editor.md) - 代码编辑模式，提供专业的 DSL 编辑体验
- [RFC-012: React Flow DSL 可视化编辑器](./0012-react-flow-visual-editor.md) - 可视化编辑模式，通过拖拽节点创建 DSL

### 外部文档

- [Elysia 文档](https://elysiajs.com/)
- [ffmpeg.wasm 文档](https://ffmpegwasm.netlify.app/)
- [React 文档](https://react.dev/)

## 变更日志

### 2025-12-29
- 初始 RFC 创建
- 合并 RFC-002 和 RFC-003 的有用内容
- 定义基于 Affect DSL 的快速视频编辑器架构
- 设计浏览器预览 + 服务器渲染的混合方案
- 规划一键启动系统

