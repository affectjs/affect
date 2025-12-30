# RFC-0002: Fluent-FFmpeg Web UI 服务器

**状态**: 已实现  
**日期**: 2024-12-29  
**作者**: AI Assistant  
**相关议题**: 用于测试 fluent-ffmpeg 功能的交互式 Web 界面

## 摘要

本文档描述了基于 Bun 运行时的 Web UI 服务器的设计和实现，该服务器提供了一个交互式浏览器界面，用于测试和演示 fluent-ffmpeg 的各种功能。服务器允许用户上传视频文件、配置转换选项、实时监控进度并下载转换后的文件。

**扩展计划**: 将当前实现升级为完整的视频编辑器，使用 Bun + Elysia 作为后端服务器框架，并选择适合视频编辑的前端 UI 框架。

## 动机

1. **用户体验**: 提供直观的 Web 界面，无需编写代码即可测试 fluent-ffmpeg
2. **演示**: 通过交互式演示展示 fluent-ffmpeg 的功能
3. **测试**: 方便测试不同的转换选项和预设
4. **学习**: 通过可视化界面帮助用户理解 fluent-ffmpeg API
5. **性能**: 利用 Bun 运行时获得更好的性能和现代 JavaScript 特性

## 设计决策

### 1. 运行时选择

- **运行时**: Bun 1.0+（而非 Node.js）
- **原因**: 更好的性能、原生 TypeScript/ES 模块支持、内置 HTTP 服务器
- **备选方案**: 如需要可适配到 Node.js

### 2. 架构

#### 当前实现（基础版本）
- **服务器**: Bun 内置 HTTP 服务器（`serve()`）
- **前端**: 原生 HTML/CSS/JavaScript（无框架依赖）
- **API**: RESTful API，JSON 响应
- **进度**: 基于轮询（可升级为 WebSocket）

#### 视频编辑器扩展架构（计划中）
- **服务器端**: Bun + Elysia 框架
  - **Elysia**: 高性能、类型安全的 Web 框架，专为 Bun 优化
  - **优势**: 
    - 极快的性能（基于 Bun 的运行时）
    - 完整的 TypeScript 类型支持
    - 内置验证和序列化
    - 插件生态系统丰富
    - 支持 WebSocket、SSE 等实时通信
- **客户端**: 待选择适合视频编辑的 UI 框架
  - **候选方案**:
    1. **React + Remotion**: 
       - 优势: 声明式视频编辑、组件化、时间轴控制
       - 适用: 程序化视频生成、模板化编辑
    2. **React + Fabric.js/Konva.js**: 
       - 优势: Canvas 操作、图层管理、图形编辑
       - 适用: 需要复杂图形操作的编辑器
    3. **React + Video.js + 自定义时间轴**: 
       - 优势: 成熟的视频播放器、灵活扩展
       - 适用: 传统视频编辑界面
    4. **Vue 3 + VideoEditor.js**: 
       - 优势: 响应式、组合式 API
       - 适用: Vue 生态偏好
    5. **Svelte + 自定义组件**: 
       - 优势: 轻量级、高性能
       - 适用: 追求极致性能的场景
- **推荐方案**: **React + Remotion + 自定义时间轴组件**
  - 原因: 
    - Remotion 提供强大的视频编辑能力
    - React 生态成熟，组件丰富
    - 易于实现时间轴、预览、导出等功能
    - 支持服务器端渲染和客户端渲染

### 3. 文件管理

- **上传目录**: `examples/uploads/`（自动创建）
- **输出目录**: `examples/outputs/`（自动创建）
- **清理**: 自动清理超过 1 小时的文件
- **安全**: 路径遍历保护、文件名验证

### 4. 安全措施

- **文件类型验证**: 允许的视频 MIME 类型白名单
- **文件大小限制**: 最大 500MB
- **路径遍历保护**: 文件名清理和路径验证
- **并发任务限制**: 最多 3 个并发转换
- **输入验证**: 所有用户输入在处理前进行验证

### 5. API 设计

- **RESTful**: 标准 HTTP 方法和状态码
- **JSON**: 所有 API 响应为 JSON 格式
- **错误处理**: 完善的错误消息
- **任务管理**: 用于跟踪转换的唯一任务 ID

## 实现细节

### 文件结构

```
packages/fluent-ffmpeg-examples/
├── examples/
│   ├── web-ui-server.js      # Bun 服务器实现
│   ├── uploads/              # 上传的文件（自动创建）
│   ├── outputs/              # 转换后的文件（自动创建）
│   └── .gitignore            # 忽略上传和输出文件
├── package.json              # 添加了 web-ui 脚本
└── README.md                 # 更新了 Web UI 使用说明
```

### 核心功能

1. **文件上传**:
   - 拖拽上传支持
   - 点击选择文件
   - 使用 ffprobe 自动提取元数据
   - 文件类型和大小验证

2. **转换选项**:
   - 输出格式（MP4, AVI, WebM, MKV, FLV, MOV）
   - 视频编码器（H.264, H.265, VP9, VP8）
   - 音频编码器（AAC, MP3, Opus）
   - 视频码率
   - 音频码率
   - 分辨率（多种预设）
   - 帧率
   - 预设（Flash Video, Podcast, DivX）

3. **进度监控**:
   - 实时进度百分比
   - 当前 FPS
   - 当前码率（kbps）
   - 时间标记
   - 任务状态轮询

4. **文件管理**:
   - 自动清理旧文件
   - 安全的文件下载
   - 临时文件处理

### API 端点

#### 1. 上传文件

**端点**: `POST /api/upload`

**请求**: `multipart/form-data`，包含 `file` 字段

**响应**:
```json
{
  "success": true,
  "filename": "1234567890-video.mp4",
  "originalName": "video.mp4",
  "metadata": {
    "duration": 120.5,
    "size": 10485760,
    "bitrate": 800000,
    "streams": [...]
  }
}
```

#### 2. 开始转换

**端点**: `POST /api/convert`

**请求**:
```json
{
  "filename": "1234567890-video.mp4",
  "options": {
    "format": "mp4",
    "videoCodec": "libx264",
    "audioCodec": "aac",
    "videoBitrate": 1000,
    "audioBitrate": 128,
    "size": "1920x1080",
    "fps": 30,
    "preset": "flashvideo"
  }
}
```

**响应**:
```json
{
  "taskId": "task-1234567890-abc123",
  "outputFilename": "task-1234567890-abc123.mp4"
}
```

#### 3. 获取任务状态

**端点**: `GET /api/task/:taskId`

**响应**:
```json
{
  "id": "task-1234567890-abc123",
  "status": "processing",
  "progress": 45,
  "currentFps": 30,
  "currentKbps": 800,
  "timemark": "00:00:54.000",
  "inputFile": "1234567890-video.mp4",
  "outputFile": "task-1234567890-abc123.mp4",
  "startTime": 1234567890000,
  "endTime": null,
  "duration": null,
  "error": null
}
```

#### 4. 下载文件

**端点**: `GET /download/:filename`

**响应**: 二进制文件流

### 安全实现

#### 文件上传安全

```javascript
// 文件类型验证
const ALLOWED_VIDEO_TYPES = [
    "video/mp4", "video/avi", "video/quicktime", ...
];

// 文件大小限制
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

// 文件名清理
function sanitizeFilename(filename) {
    return filename
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/^\.+/, "")
        .substring(0, 255);
}
```

#### 路径遍历保护

```javascript
// 验证文件名
function isValidFilename(filename) {
    if (filename.includes("..") || filename.includes("/")) {
        return false;
    }
    return true;
}

// 确保路径在允许的目录内
if (!filePath.startsWith(UPLOAD_DIR)) {
    return new Response("非法路径", { status: 403 });
}
```

#### 资源限制

```javascript
const MAX_CONCURRENT_TASKS = 3;
let activeTasks = 0;

// 开始转换前检查
if (activeTasks >= MAX_CONCURRENT_TASKS) {
    return new Response("并发任务过多", { status: 429 });
}
```

## 前端设计

### UI 组件

1. **上传区域**: 支持拖拽的上传区域和文件选择
2. **配置面板**: 包含所有转换选项的表单
3. **进度显示**: 带有实时统计信息的进度条
4. **结果区域**: 成功消息和下载链接

### 用户流程

```
1. 用户上传视频
   ↓
2. 显示视频元数据
   ↓
3. 用户配置转换选项
   ↓
4. 用户点击"开始转换"
   ↓
5. 显示进度条，开始轮询状态
   ↓
6. 转换完成，显示下载链接
```

## 测试

### 手动测试

- [x] 文件上传（拖拽和点击）
- [x] 元数据提取
- [x] 使用各种选项进行转换
- [x] 进度监控
- [x] 文件下载
- [x] 错误处理
- [x] 并发任务限制

### 安全测试

- [x] 文件类型验证
- [x] 文件大小限制
- [x] 路径遍历保护
- [x] 文件名清理
- [x] 并发任务限制执行

## 迁移路径

### 新增

- ✅ `packages/fluent-ffmpeg-examples/examples/web-ui-server.js`
- ✅ `packages/fluent-ffmpeg-examples/examples/.gitignore`
- ✅ `package.json` 中的 `web-ui` 脚本
- ✅ Bun 引擎要求
- ✅ 更新了 README 中的 Web UI 使用说明

### 更新

- ✅ `run-example.js` - 添加了 Bun 运行时检测
- ✅ `package.json` - 添加了 web-ui 脚本和 Bun 引擎
- ✅ `README.md` - 添加了 Web UI 使用说明

## 破坏性变更

无。这是一个新功能添加。

## 视频编辑器扩展设计

### 服务器端架构（Elysia）

#### 技术栈
- **运行时**: Bun 1.0+
- **框架**: Elysia
- **类型**: TypeScript
- **验证**: Elysia 内置验证（基于 TypeBox）
- **实时通信**: WebSocket（Elysia WebSocket 插件）

#### 项目结构
```
packages/video-editor-server/
├── src/
│   ├── index.ts              # Elysia 应用入口
│   ├── routes/
│   │   ├── upload.ts         # 文件上传路由
│   │   ├── video.ts          # 视频处理路由
│   │   ├── edit.ts           # 编辑操作路由
│   │   ├── export.ts         # 导出路由
│   │   └── ws.ts             # WebSocket 路由
│   ├── services/
│   │   ├── ffmpeg.ts         # FFmpeg 服务封装
│   │   ├── storage.ts         # 文件存储服务
│   │   └── queue.ts          # 任务队列服务
│   ├── types/
│   │   └── video.ts          # 类型定义
│   └── utils/
│       └── validation.ts     # 验证工具
├── package.json
└── tsconfig.json
```

#### API 端点设计

##### 1. 文件上传（分块上传支持）
```typescript
POST /api/v1/upload
POST /api/v1/upload/chunk      // 分块上传
POST /api/v1/upload/complete   // 完成上传
```

##### 2. 视频编辑操作
```typescript
POST /api/v1/video/:id/cut          // 裁剪
POST /api/v1/video/:id/merge        // 合并
POST /api/v1/video/:id/filter       // 滤镜
POST /api/v1/video/:id/transform    // 变换（旋转、缩放等）
POST /api/v1/video/:id/text         // 添加文字
POST /api/v1/video/:id/audio        // 音频处理
```

##### 3. 时间轴和预览
```typescript
GET  /api/v1/project/:id            // 获取项目
POST /api/v1/project                 // 创建项目
PUT  /api/v1/project/:id             // 更新项目
GET  /api/v1/project/:id/preview     // 获取预览帧
```

##### 4. 导出
```typescript
POST /api/v1/export                  // 开始导出
GET  /api/v1/export/:taskId          // 查询导出状态
GET  /api/v1/export/:taskId/download // 下载导出文件
```

##### 5. WebSocket 实时通信
```typescript
WS /ws/:projectId                   // 项目实时协作
WS /ws/export/:taskId                // 导出进度推送
```

#### Elysia 实现示例

```typescript
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { websocket } from '@elysiajs/websocket';

const app = new Elysia()
  .use(cors())
  .use(swagger())
  .use(websocket())
  .group('/api/v1', (app) =>
    app
      .post('/upload', uploadHandler)
      .post('/video/:id/cut', cutVideoHandler)
      .ws('/ws/:projectId', {
        message: (ws, message) => {
          // 处理实时消息
        }
      })
  )
  .listen(3000);
```

### 客户端架构（React + Remotion）

#### 技术栈
- **框架**: React 18+
- **视频编辑**: Remotion
- **UI 组件库**: 
  - Ant Design 或 Material-UI（基础组件）
  - React DnD（拖拽）
  - React Player（视频播放）
- **状态管理**: Zustand 或 Redux Toolkit
- **构建工具**: Vite
- **类型**: TypeScript

#### 项目结构
```
packages/video-editor-client/
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── Timeline/              # 时间轴组件
│   │   │   ├── Timeline.tsx
│   │   │   ├── Track.tsx
│   │   │   └── Playhead.tsx
│   │   ├── Preview/               # 预览组件
│   │   │   ├── VideoPreview.tsx
│   │   │   └── CanvasPreview.tsx
│   │   ├── Library/               # 素材库
│   │   │   ├── MediaLibrary.tsx
│   │   │   └── AssetItem.tsx
│   │   ├── Inspector/             # 属性面板
│   │   │   └── PropertyPanel.tsx
│   │   └── Toolbar/               # 工具栏
│   │       └── EditorToolbar.tsx
│   ├── hooks/
│   │   ├── useVideoEditor.ts
│   │   ├── useTimeline.ts
│   │   └── useWebSocket.ts
│   ├── services/
│   │   ├── api.ts                 # API 客户端
│   │   └── websocket.ts           # WebSocket 客户端
│   ├── store/
│   │   └── editorStore.ts         # 状态管理
│   └── types/
│       └── editor.ts
├── package.json
└── vite.config.ts
```

#### 核心功能组件

##### 1. 时间轴组件
- 多轨道支持（视频、音频、文字、特效）
- 拖拽调整片段位置和时长
- 缩放和平移
- 播放头控制
- 关键帧编辑

##### 2. 预览组件
- 实时预览（使用 Remotion）
- 帧精确控制
- 播放/暂停/跳转
- 缩放控制

##### 3. 素材库
- 视频/音频/图片上传
- 媒体管理
- 搜索和筛选
- 缩略图预览

##### 4. 属性面板
- 片段属性编辑
- 滤镜参数调整
- 文字样式设置
- 动画关键帧

#### Remotion 集成示例

```typescript
import { Composition, Video, Audio, Sequence } from 'remotion';

export const EditorComposition: React.FC = () => {
  return (
    <Composition
      id="Editor"
      component={EditorScene}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

const EditorScene: React.FC = () => {
  return (
    <>
      <Sequence from={0} durationInFrames={100}>
        <Video src="/video1.mp4" />
      </Sequence>
      <Sequence from={100} durationInFrames={100}>
        <Video src="/video2.mp4" />
      </Sequence>
    </>
  );
};
```

### 数据流设计

```
用户操作 (客户端)
    ↓
React 组件更新状态
    ↓
API 调用 (Elysia 服务器)
    ↓
FFmpeg 处理 (fluent-ffmpeg)
    ↓
WebSocket 推送进度
    ↓
客户端更新 UI
```

### 关键技术决策

#### 1. 为什么选择 Elysia？
- **性能**: 基于 Bun，性能远超 Express/Fastify
- **类型安全**: 端到端 TypeScript 类型
- **开发体验**: 简洁的 API，丰富的插件
- **实时通信**: 原生 WebSocket 支持

#### 2. 为什么选择 React + Remotion？
- **Remotion**: 
  - 声明式视频编辑
  - 组件化架构
  - 时间轴精确控制
  - 支持预览和导出
- **React**: 
  - 生态成熟
  - 组件库丰富
  - 开发工具完善
  - 社区支持好

#### 3. 备选方案考虑
- **Vue 3**: 如果团队更熟悉 Vue
- **Svelte**: 如果追求极致性能
- **原生 Canvas**: 如果需要更底层的控制

## 未来考虑

### 短期改进（基础版本）

1. **功能**:
   - 批量转换支持
   - 视频裁剪
   - 水印添加
   - 字幕支持

2. **用户体验**:
   - WebSocket 实时更新（替代轮询）
   - 转换历史记录
   - 保存/加载预设
   - 拖拽排序转换队列

3. **性能**:
   - 分块文件上传
   - 转换队列管理
   - 缓存机制

### 中期改进（视频编辑器）

1. **核心编辑功能**:
   - 多轨道时间轴
   - 视频裁剪和分割
   - 音频处理（音量、淡入淡出）
   - 文字叠加
   - 转场效果
   - 基础滤镜（亮度、对比度、饱和度）

2. **高级功能**:
   - 关键帧动画
   - 颜色校正
   - 音频混音
   - 绿幕抠像
   - 运动跟踪

3. **协作功能**:
   - 项目保存/加载
   - 版本控制
   - 多人协作编辑
   - 评论和标注

### 长期改进

1. **扩展功能**:
   - 用户认证和授权
   - 多用户支持
   - 云存储集成
   - API 密钥管理
   - 模板市场

2. **AI 功能**:
   - 自动字幕生成
   - 智能剪辑建议
   - 场景识别
   - 人脸识别和跟踪
   - 语音转文字

3. **监控和优化**:
   - 转换统计
   - 错误日志
   - 性能监控
   - 使用分析
   - 资源使用优化

4. **部署**:
   - Docker 容器化
   - Kubernetes 支持
   - 负载均衡
   - CDN 集成
   - 边缘计算支持

## 参考

### 当前实现
- [Bun 文档](https://bun.sh/docs)
- [fluent-ffmpeg 文档](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg)
- [FFmpeg 文档](https://ffmpeg.org/documentation.html)

### 视频编辑器扩展
- [Elysia 文档](https://elysiajs.com/)
- [Remotion 文档](https://www.remotion.dev/)
- [React 文档](https://react.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

## 变更日志

### 2024-12-29
- 初始实现
- 基本文件上传和转换功能
- 实时进度监控
- Web UI 界面
- 安全增强（文件验证、路径遍历保护）
- 并发任务限制

### 2024-12-29（扩展）
- 添加视频编辑器扩展设计
- 确定技术栈：Bun + Elysia（后端），React + Remotion（前端）
- 设计服务器端架构和 API 端点
- 设计客户端架构和核心组件
- 规划短期、中期、长期改进路线图
