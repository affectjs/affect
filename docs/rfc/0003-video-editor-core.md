# RFC-003: 视频编辑器核心功能

**状态**: 计划中  
**日期**: 2024-12-29  
**作者**: AI Assistant  
**相关议题**: 基于 RFC-002 的视频编辑器中期改进计划

## 摘要

本文档描述了视频编辑器的核心功能实现计划，包括多轨道时间轴、视频裁剪、音频处理、文字叠加、转场效果、滤镜等基础编辑功能，以及关键帧动画、颜色校正、音频混音、绿幕抠像、运动跟踪等高级功能。同时还包括项目保存/加载、版本控制、多人协作等协作功能。

## 动机

1. **功能完整性**: 提供专业级视频编辑器的核心功能
2. **用户体验**: 让用户能够完成完整的视频编辑工作流
3. **技术验证**: 验证 fluent-ffmpeg 在复杂视频处理场景下的能力
4. **市场竞争力**: 提供与主流视频编辑器竞争的功能集
5. **扩展性**: 为后续 AI 功能和高级特性打下基础

## 设计决策

### 1. 核心编辑功能架构

#### 1.1 多轨道时间轴系统

- **轨道类型**:
  - 视频轨道（主视频、叠加视频）
  - 音频轨道（主音频、背景音乐、音效）
  - 文字轨道（标题、字幕、标注）
  - 特效轨道（滤镜、转场、动画）
- **时间轴特性**:
  - 无限轨道支持
  - 轨道锁定/隐藏
  - 轨道分组
  - 时间轴缩放（毫秒级精度）
  - 吸附功能（对齐到关键帧、片段边界）

#### 1.2 视频处理功能

- **裁剪和分割**:
  - 精确时间点裁剪
  - 多片段分割
  - 保留/删除片段选择
  - 撤销/重做支持
- **变换操作**:
  - 位置调整（X/Y 坐标）
  - 缩放（保持宽高比/自由缩放）
  - 旋转（0-360度）
  - 翻转（水平/垂直）
- **速度控制**:
  - 变速播放（0.25x - 4x）
  - 时间重映射
  - 慢动作/快动作

#### 1.3 音频处理功能

- **基础处理**:
  - 音量调整（-100% 到 +100%）
  - 淡入/淡出效果
  - 静音/取消静音
  - 音频分离（从视频中提取）
- **高级处理**:
  - 音频混音（多轨道混合）
  - 均衡器（EQ）
  - 降噪
  - 音频压缩/限制
  - 音调调整

#### 1.4 文字和图形

- **文字叠加**:
  - 多行文本支持
  - 字体、大小、颜色设置
  - 文字样式（粗体、斜体、下划线）
  - 文字对齐（左、中、右）
  - 文字动画（淡入、滑入、打字机效果）
- **图形元素**:
  - 形状绘制（矩形、圆形、箭头）
  - 线条和箭头
  - 标注和标记
  - 马赛克/模糊区域

#### 1.5 转场效果

- **基础转场**:
  - 淡入淡出
  - 滑动（左、右、上、下）
  - 缩放
  - 旋转
- **高级转场**:
  - 3D 转场
  - 粒子效果
  - 模糊转场
  - 自定义转场

#### 1.6 滤镜和效果

- **颜色调整**:
  - 亮度、对比度、饱和度
  - 色温、色调
  - 曝光、高光、阴影
  - 颜色曲线
- **视觉效果**:
  - 模糊（高斯模糊、运动模糊）
  - 锐化
  - 噪点
  - 老电影效果
  - 黑白/复古滤镜

### 2. 高级功能架构

#### 2.1 关键帧动画系统

- **关键帧类型**:
  - 位置关键帧
  - 缩放关键帧
  - 旋转关键帧
  - 透明度关键帧
  - 滤镜参数关键帧
- **动画曲线**:
  - 线性插值
  - 缓入/缓出
  - 贝塞尔曲线编辑
  - 自定义缓动函数

#### 2.2 颜色校正

- **专业工具**:
  - 色轮调整
  - 直方图显示
  - 波形图
  - 矢量示波器
- **预设**:
  - LUT（Look-Up Table）支持
  - 颜色预设库
  - 自定义 LUT 导入

#### 2.3 音频混音

- **混音器界面**:
  - 多轨道音量控制
  - 声像（Pan）调整
  - 发送/返回效果
  - 主音量控制
- **音频效果链**:
  - 多效果器串联
  - 实时预览
  - 效果预设

#### 2.4 绿幕抠像（Chroma Key）

- **抠像功能**:
  - 颜色选择（绿幕/蓝幕）
  - 容差调整
  - 边缘羽化
  - 去噪处理
- **背景替换**:
  - 纯色背景
  - 图片背景
  - 视频背景

#### 2.5 运动跟踪

- **跟踪类型**:
  - 点跟踪
  - 区域跟踪
  - 人脸跟踪
  - 物体跟踪
- **应用场景**:
  - 稳定视频
  - 添加跟踪元素
  - 运动模糊效果

### 3. 协作功能架构

#### 3.1 项目管理系统

- **项目结构**:
```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  settings: ProjectSettings;
  timeline: Timeline;
  assets: Asset[];
  collaborators: Collaborator[];
}
```

- **项目操作**:
  - 创建新项目
  - 保存项目（自动保存/手动保存）
  - 加载项目
  - 导出项目（JSON 格式）
  - 导入项目
  - 项目模板

#### 3.2 版本控制

- **版本管理**:
  - 自动版本快照
  - 手动创建版本
  - 版本历史查看
  - 版本对比
  - 版本回滚
- **版本数据结构**:
```typescript
interface ProjectVersion {
  id: string;
  projectId: string;
  version: number;
  name: string;
  description?: string;
  createdAt: Date;
  createdBy: string;
  snapshot: ProjectSnapshot;
}
```

#### 3.3 多人协作

- **实时协作**:
  - WebSocket 连接管理
  - 操作同步（OT - Operational Transform）
  - 冲突解决
  - 用户光标显示
  - 用户选择高亮
- **权限管理**:
  - 所有者权限
  - 编辑权限
  - 查看权限
  - 评论权限
- **协作数据结构**:
```typescript
interface Collaborator {
  userId: string;
  username: string;
  role: 'owner' | 'editor' | 'viewer' | 'commenter';
  joinedAt: Date;
  lastActive: Date;
  cursor?: CursorPosition;
  selection?: SelectionRange;
}
```

#### 3.4 评论和标注

- **评论功能**:
  - 时间轴评论（在特定时间点添加）
  - 片段评论（针对特定片段）
  - 回复评论
  - 评论解决/关闭
- **标注功能**:
  - 视频帧标注
  - 区域标注
  - 文字标注
  - 箭头/形状标注

## 实现细节

### 服务器端实现（Elysia）

#### 1. 项目管理 API

```typescript
// 创建项目
POST /api/v1/projects
Body: { name: string, description?: string, settings: ProjectSettings }

// 获取项目
GET /api/v1/projects/:id

// 更新项目
PUT /api/v1/projects/:id
Body: { timeline: Timeline, assets: Asset[] }

// 删除项目
DELETE /api/v1/projects/:id

// 获取项目列表
GET /api/v1/projects?userId=xxx&page=1&limit=20
```

#### 2. 视频编辑操作 API

```typescript
// 裁剪视频
POST /api/v1/video/:id/cut
Body: { startTime: number, endTime: number, outputFormat?: string }

// 分割视频
POST /api/v1/video/:id/split
Body: { splitPoints: number[] }

// 合并视频
POST /api/v1/video/merge
Body: { videoIds: string[], outputFormat?: string }

// 应用滤镜
POST /api/v1/video/:id/filter
Body: { filterType: string, parameters: Record<string, any> }

// 添加文字
POST /api/v1/video/:id/text
Body: { 
  text: string, 
  position: { x: number, y: number },
  style: TextStyle,
  startTime: number,
  duration: number
}

// 转场效果
POST /api/v1/video/:id/transition
Body: {
  fromVideoId: string,
  toVideoId: string,
  transitionType: string,
  duration: number
}
```

#### 3. 高级功能 API

```typescript
// 关键帧动画
POST /api/v1/video/:id/keyframes
Body: { keyframes: Keyframe[] }

// 颜色校正
POST /api/v1/video/:id/color-correction
Body: { adjustments: ColorAdjustment }

// 绿幕抠像
POST /api/v1/video/:id/chroma-key
Body: { 
  color: string, 
  tolerance: number,
  background: string | { type: 'image' | 'video', url: string }
}

// 运动跟踪
POST /api/v1/video/:id/track
Body: { 
  trackType: 'point' | 'region' | 'face',
  target: TrackTarget,
  options: TrackOptions
}
```

#### 4. 协作 API

```typescript
// 添加协作者
POST /api/v1/projects/:id/collaborators
Body: { userId: string, role: string }

// 获取协作者列表
GET /api/v1/projects/:id/collaborators

// 移除协作者
DELETE /api/v1/projects/:id/collaborators/:userId

// 添加评论
POST /api/v1/projects/:id/comments
Body: { 
  time: number, 
  content: string,
  type: 'timeline' | 'clip' | 'frame'
}

// 获取评论
GET /api/v1/projects/:id/comments

// WebSocket 协作连接
WS /ws/projects/:id
```

### 客户端实现（React + Remotion）

#### 1. 时间轴组件架构

```typescript
// Timeline.tsx
interface TimelineProps {
  tracks: Track[];
  currentTime: number;
  duration: number;
  onTimeChange: (time: number) => void;
  onClipMove: (clipId: string, newStart: number) => void;
  onClipResize: (clipId: string, newDuration: number) => void;
}

// Track.tsx
interface TrackProps {
  track: Track;
  clips: Clip[];
  onClipSelect: (clipId: string) => void;
  onClipEdit: (clipId: string) => void;
}

// Clip.tsx
interface ClipProps {
  clip: Clip;
  startTime: number;
  duration: number;
  isSelected: boolean;
  onSelect: () => void;
  onDrag: (newStart: number) => void;
}
```

#### 2. 预览组件架构

```typescript
// VideoPreview.tsx
interface VideoPreviewProps {
  project: Project;
  currentTime: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
}

// 使用 Remotion 渲染预览
const PreviewComposition = ({ project, currentTime }: PreviewProps) => {
  return (
    <Composition
      id="Preview"
      component={PreviewScene}
      durationInFrames={project.duration * project.fps}
      fps={project.fps}
      width={project.width}
      height={project.height}
    />
  );
};
```

#### 3. 属性面板组件

```typescript
// PropertyPanel.tsx
interface PropertyPanelProps {
  selectedClip: Clip | null;
  onPropertyChange: (property: string, value: any) => void;
}

// 支持多种属性编辑
- 视频属性：位置、缩放、旋转、透明度
- 音频属性：音量、淡入淡出、音调
- 文字属性：内容、字体、颜色、位置
- 滤镜属性：滤镜类型、参数调整
- 关键帧：关键帧列表、曲线编辑
```

#### 4. 状态管理（Zustand）

```typescript
// editorStore.ts
interface EditorStore {
  // 项目状态
  project: Project | null;
  setProject: (project: Project) => void;
  
  // 时间轴状态
  currentTime: number;
  setCurrentTime: (time: number) => void;
  selectedClips: string[];
  setSelectedClips: (clipIds: string[]) => void;
  
  // 播放状态
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  
  // 操作历史
  history: HistoryState[];
  undo: () => void;
  redo: () => void;
  
  // 协作状态
  collaborators: Collaborator[];
  setCollaborators: (collaborators: Collaborator[]) => void;
}
```

### FFmpeg 命令生成

#### 1. 视频裁剪

```typescript
function generateCutCommand(
  inputPath: string,
  outputPath: string,
  startTime: number,
  endTime: number
): string {
  const duration = endTime - startTime;
  return ffmpeg(inputPath)
    .setStartTime(startTime)
    .setDuration(duration)
    .output(outputPath)
    .run();
}
```

#### 2. 滤镜应用

```typescript
function applyFilter(
  inputPath: string,
  outputPath: string,
  filter: Filter
): string {
  let command = ffmpeg(inputPath);
  
  switch (filter.type) {
    case 'brightness':
      command = command.videoFilters(`eq=brightness=${filter.value}`);
      break;
    case 'contrast':
      command = command.videoFilters(`eq=contrast=${filter.value}`);
      break;
    case 'blur':
      command = command.videoFilters(`boxblur=${filter.radius}`);
      break;
    // ... 更多滤镜
  }
  
  return command.output(outputPath).run();
}
```

#### 3. 文字叠加

```typescript
function addText(
  inputPath: string,
  outputPath: string,
  text: TextOverlay
): string {
  const fontPath = text.fontPath || 'default';
  const fontSize = text.fontSize || 24;
  const color = text.color || 'white';
  const position = text.position || { x: 10, y: 10 };
  
  const filter = `drawtext=text='${text.content}':fontfile=${fontPath}:fontsize=${fontSize}:fontcolor=${color}:x=${position.x}:y=${position.y}`;
  
  return ffmpeg(inputPath)
    .videoFilters(filter)
    .output(outputPath)
    .run();
}
```

#### 4. 绿幕抠像

```typescript
function chromaKey(
  inputPath: string,
  outputPath: string,
  options: ChromaKeyOptions
): string {
  const color = options.color || '0x00ff00'; // 绿色
  const tolerance = options.tolerance || 0.3;
  const blend = options.blend || 0.1;
  
  const filter = `chromakey=${color}:similarity=${tolerance}:blend=${blend}`;
  
  return ffmpeg(inputPath)
    .videoFilters(filter)
    .output(outputPath)
    .run();
}
```

## 数据模型

### 项目数据模型

```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  settings: {
    width: number;
    height: number;
    fps: number;
    duration: number;
    audioSampleRate: number;
  };
  timeline: Timeline;
  assets: Asset[];
  collaborators: Collaborator[];
  comments: Comment[];
}

interface Timeline {
  tracks: Track[];
  markers: Marker[];
}

interface Track {
  id: string;
  type: 'video' | 'audio' | 'text' | 'effect';
  name: string;
  locked: boolean;
  hidden: boolean;
  clips: Clip[];
}

interface Clip {
  id: string;
  assetId: string;
  startTime: number;
  duration: number;
  trackStart: number;
  properties: ClipProperties;
  keyframes: Keyframe[];
}

interface ClipProperties {
  position?: { x: number; y: number };
  scale?: { x: number; y: number };
  rotation?: number;
  opacity?: number;
  volume?: number;
  filters?: Filter[];
}
```

## 测试计划

### 功能测试

- [ ] 多轨道时间轴操作
- [ ] 视频裁剪和分割
- [ ] 音频处理（音量、淡入淡出）
- [ ] 文字叠加和样式
- [ ] 转场效果
- [ ] 滤镜应用
- [ ] 关键帧动画
- [ ] 颜色校正
- [ ] 绿幕抠像
- [ ] 运动跟踪
- [ ] 项目保存/加载
- [ ] 版本控制
- [ ] 多人协作
- [ ] 评论和标注

### 性能测试

- [ ] 大文件处理（>1GB）
- [ ] 长时间视频编辑（>1小时）
- [ ] 多轨道性能（>10轨道）
- [ ] 实时预览性能
- [ ] WebSocket 连接稳定性
- [ ] 并发用户支持

### 兼容性测试

- [ ] 不同视频格式支持
- [ ] 不同分辨率支持
- [ ] 不同帧率支持
- [ ] 浏览器兼容性
- [ ] 移动端适配

## 迁移路径

### 阶段 1: 基础编辑功能（4-6周）

1. **时间轴系统**:
   - 单轨道时间轴
   - 基本剪辑操作
   - 播放控制

2. **视频处理**:
   - 裁剪
   - 分割
   - 基础变换

3. **项目管理**:
   - 保存/加载项目
   - 基础 UI

### 阶段 2: 高级编辑功能（6-8周）

1. **多轨道支持**:
   - 多视频轨道
   - 多音频轨道
   - 文字轨道

2. **效果和滤镜**:
   - 基础滤镜
   - 转场效果
   - 文字样式

3. **音频处理**:
   - 音量控制
   - 淡入淡出
   - 音频混音

### 阶段 3: 高级功能（8-10周）

1. **关键帧系统**:
   - 关键帧编辑
   - 动画曲线
   - 属性动画

2. **专业工具**:
   - 颜色校正
   - 绿幕抠像
   - 运动跟踪

3. **协作功能**:
   - 项目版本控制
   - 多人协作基础
   - 评论系统

## 破坏性变更

无。这是基于 RFC-002 的功能扩展。

## 未来考虑

### 短期优化

1. **性能优化**:
   - 视频预览缓存
   - 懒加载资源
   - Web Worker 处理

2. **用户体验**:
   - 快捷键支持
   - 自定义工具栏
   - 主题切换

3. **功能增强**:
   - 更多转场效果
   - 更多滤镜预设
   - 模板系统

### 长期扩展

- 参考 RFC-004（长期改进计划）

## 参考

- [RFC-002: Web UI 服务器](./0002-web-ui-server.md)
- [FFmpeg 滤镜文档](https://ffmpeg.org/ffmpeg-filters.html)
- [Remotion 文档](https://www.remotion.dev/)
- [Elysia 文档](https://elysiajs.com/)
- [WebSocket 协议](https://tools.ietf.org/html/rfc6455)

## 变更日志

### 2024-12-29
- 初始 RFC 创建
- 定义核心编辑功能需求
- 设计服务器端和客户端架构
- 规划实现阶段


