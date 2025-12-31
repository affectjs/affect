# RFC-014: Web Video Editor - WASM + React 实现

**状态**: Draft
**日期**: 2025-12-30
**作者**: Albert Li
**相关问题**: 创建一个基于浏览器的实时视频编辑器，使用 WebAssembly 和 React

## 摘要

本文档描述了一个基于浏览器的视频编辑器实现方案，核心特点：

1. **WebAssembly**: 使用 FFmpeg.wasm 在浏览器中进行视频处理
2. **React 界面**: 现代化的 React 组件架构
3. **Timeline 时间线**: 可视化的视频/音频轨道编辑
4. **实时预览**: 浏览器内的即时视频预览
5. **无服务器依赖**: 所有处理在客户端完成

## 动机

1. **即时性**: 无需上传到服务器，在浏览器中直接编辑
2. **隐私性**: 视频文件不离开用户设备
3. **可访问性**: 仅需浏览器，无需安装软件
4. **成本效益**: 无服务器处理成本
5. **实时反馈**: 立即看到编辑效果

## 技术栈

### 核心技术

```
前端框架: React 18+
状态管理: Zustand / Jotai
视频处理: FFmpeg.wasm
UI 组件: Radix UI / shadcn/ui
样式: Tailwind CSS
时间线: @xzdarcy/react-timeline-editor
构建工具: Vite
类型: TypeScript
```

## 替代方案探讨 (Alternatives Considered)

### Remotion

**简介**: Remotion 是一个非常流行的 "Video as Code" 框架，允许使用 React 组件编写视频。

**对比分析**:

| 特性         | 本方案 (FFmpeg.wasm + NLE Component)                            | Remotion                                               |
| :----------- | :-------------------------------------------------------------- | :----------------------------------------------------- |
| **核心理念** | **非线性编辑器 (NLE)**: 剪辑现有素材                            | **程序化生成**: 代码驱动视频内容                       |
| **处理方式** | **Bitstream 操作**: 剪切/合并可无损 (Copy mode)，快且无需重编码 | **Frame 渲染**: 逐帧渲染 React 组件，必须重编码        |
| **适用场景** | 视频剪辑工具 (类似 Premiere/CapCut)                             | 动态图形、数据可视化视频、自动化营销视频               |
| **License**  | **MIT** (依赖库多为 MIT)                                        | **Polyform**: 商业使用需付费 (营收 > $0)               |
| **UI 组件**  | 需自行集成 Timeline UI (使用 `@xzdarcy/react-timeline-editor`)  | 自带 Studio (开发工具)，End-User 编辑器需购买/深度定制 |

**结论**:
虽然 Remotion 非常强大，但对于构建一个**通用的、面向最终用户的视频剪辑工具**（处理用户上传的 MP4，进行剪切、拼接），FFmpeg.wasm 方案在性能（无需全部重渲染）和许可（完全开源免费）上更符合本项目 RFC 0014 的目标。我们将专注于 NLE (Non-Linear Editing) 场景，而不是 Programmatic Video 场景。

### FFmpeg.wasm 能力

- **视频编解码**: H.264, VP8, VP9
- **音频编解码**: AAC, MP3, Opus
- **格式转换**: MP4, WebM, AVI 等
- **滤镜**: resize, crop, rotate, brightness, contrast
- **合并/分割**: 视频片段操作
- **字幕**: 添加硬字幕

## 架构设计

### 1. 项目结构

```
packages/web-editor/
├── src/
│   ├── components/
│   │   ├── Timeline/
│   │   │   ├── Timeline.tsx          # 时间线主组件
│   │   │   ├── Track.tsx             # 单个轨道
│   │   │   ├── Clip.tsx              # 视频片段
│   │   │   ├── Playhead.tsx          # 播放头
│   │   │   ├── Ruler.tsx             # 时间刻度尺
│   │   │   └── index.ts
│   │   ├── Preview/
│   │   │   ├── VideoPreview.tsx      # 视频预览窗口
│   │   │   ├── Controls.tsx          # 播放控制
│   │   │   └── index.ts
│   │   ├── Toolbar/
│   │   │   ├── Toolbar.tsx           # 工具栏
│   │   │   ├── ToolButton.tsx        # 工具按钮
│   │   │   └── index.ts
│   │   ├── Inspector/
│   │   │   ├── Inspector.tsx         # 属性检查器
│   │   │   ├── VideoProperties.tsx   # 视频属性
│   │   │   ├── EffectsList.tsx       # 效果列表
│   │   │   └── index.ts
│   │   └── Editor/
│   │       ├── Editor.tsx            # 主编辑器容器
│   │       └── index.ts
│   ├── store/
│   │   ├── timeline.ts               # 时间线状态
│   │   ├── project.ts                # 项目状态
│   │   ├── playback.ts               # 播放状态
│   │   └── index.ts
│   ├── services/
│   │   ├── ffmpeg/
│   │   │   ├── ffmpeg.ts             # FFmpeg.wasm 封装
│   │   │   ├── operations.ts         # 操作封装
│   │   │   └── index.ts
│   │   ├── video/
│   │   │   ├── decoder.ts            # 视频解码
│   │   │   ├── encoder.ts            # 视频编码
│   │   │   └── index.ts
│   │   └── file/
│   │       ├── loader.ts             # 文件加载
│   │       ├── saver.ts              # 文件保存
│   │       └── index.ts
│   ├── types/
│   │   ├── timeline.ts
│   │   ├── clip.ts
│   │   ├── effect.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── time.ts                   # 时间转换工具
│   │   ├── canvas.ts                 # Canvas 工具
│   │   └── index.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### 2. 核心数据模型

```typescript
// Timeline 数据结构
interface Timeline {
  id: string;
  duration: number; // 总时长（秒）
  tracks: Track[]; // 轨道列表
  currentTime: number; // 当前播放时间
  zoom: number; // 缩放级别
  frameRate: number; // 帧率（默认30fps）
}

interface Track {
  id: string;
  type: "video" | "audio";
  clips: Clip[];
  muted: boolean;
  locked: boolean;
  height: number; // 轨道高度（px）
}

interface Clip {
  id: string;
  trackId: string;
  file: File; // 原始文件
  startTime: number; // 在时间线上的开始时间
  duration: number; // 片段持续时间
  trimStart: number; // 原视频的裁剪开始点
  trimEnd: number; // 原视频的裁剪结束点
  effects: Effect[]; // 应用的效果
  volume: number; // 音量 0-1
  metadata?: VideoMetadata;
}

interface Effect {
  id: string;
  type: "filter" | "transition" | "text";
  name: string;
  params: Record<string, any>;
  enabled: boolean;
}

interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  codec: string;
  bitrate: number;
  fps: number;
}
```

### 3. Timeline 组件设计

```typescript
// Timeline 主组件
const Timeline: React.FC = () => {
  const timeline = useTimelineStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <div className="timeline-container">
      {/* 时间刻度尺 */}
      <Ruler
        duration={timeline.duration}
        zoom={timeline.zoom}
        currentTime={timeline.currentTime}
      />

      {/* 轨道列表 */}
      <div className="tracks">
        {timeline.tracks.map(track => (
          <Track
            key={track.id}
            track={track}
            zoom={timeline.zoom}
          />
        ))}
      </div>

      {/* 播放头 */}
      <Playhead
        currentTime={timeline.currentTime}
        zoom={timeline.zoom}
      />
    </div>
  );
};

// Track 组件
const Track: React.FC<{ track: Track; zoom: number }> = ({ track, zoom }) => {
  return (
    <div className="track" style={{ height: track.height }}>
      <div className="track-header">
        <button onClick={() => toggleMute(track.id)}>
          {track.muted ? <MuteIcon /> : <UnmuteIcon />}
        </button>
        <span>{track.type}</span>
      </div>

      <div className="track-content">
        {track.clips.map(clip => (
          <Clip
            key={clip.id}
            clip={clip}
            zoom={zoom}
            onDrag={handleClipDrag}
            onTrim={handleClipTrim}
          />
        ))}
      </div>
    </div>
  );
};

// Clip 组件
const Clip: React.FC<ClipProps> = ({ clip, zoom, onDrag, onTrim }) => {
  const x = clip.startTime * zoom;  // 像素位置
  const width = clip.duration * zoom;

  return (
    <div
      className="clip"
      style={{
        left: `${x}px`,
        width: `${width}px`
      }}
      draggable
      onDragStart={onDrag}
    >
      {/* 缩略图 */}
      <ClipThumbnail file={clip.file} />

      {/* 裁剪手柄 */}
      <div className="trim-handle left" onMouseDown={onTrim} />
      <div className="trim-handle right" onMouseDown={onTrim} />

      {/* 片段信息 */}
      <div className="clip-info">
        {clip.file.name}
      </div>
    </div>
  );
};
```

### 4. FFmpeg.wasm 集成

```typescript
// services/ffmpeg/ffmpeg.ts
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

class FFmpegService {
  private ffmpeg: FFmpeg | null = null;
  private loaded = false;

  async load() {
    if (this.loaded) return;

    this.ffmpeg = new FFmpeg();

    // 加载 FFmpeg.wasm
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd";
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });

    this.loaded = true;
  }

  async trim(file: File, startTime: number, duration: number): Promise<Blob> {
    await this.load();

    // 写入文件
    const data = await file.arrayBuffer();
    await this.ffmpeg!.writeFile("input.mp4", new Uint8Array(data));

    // 执行裁剪
    await this.ffmpeg!.exec([
      "-i",
      "input.mp4",
      "-ss",
      startTime.toString(),
      "-t",
      duration.toString(),
      "-c",
      "copy",
      "output.mp4",
    ]);

    // 读取结果
    const output = await this.ffmpeg!.readFile("output.mp4");
    return new Blob([output], { type: "video/mp4" });
  }

  async merge(clips: Clip[]): Promise<Blob> {
    await this.load();

    // 写入所有片段
    for (let i = 0; i < clips.length; i++) {
      const data = await clips[i].file.arrayBuffer();
      await this.ffmpeg!.writeFile(`input${i}.mp4`, new Uint8Array(data));
    }

    // 创建 concat 文件列表
    const fileList = clips.map((_, i) => `file 'input${i}.mp4'`).join("\n");
    await this.ffmpeg!.writeFile("filelist.txt", fileList);

    // 执行合并
    await this.ffmpeg!.exec([
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      "filelist.txt",
      "-c",
      "copy",
      "output.mp4",
    ]);

    // 读取结果
    const output = await this.ffmpeg!.readFile("output.mp4");
    return new Blob([output], { type: "video/mp4" });
  }

  async applyFilter(file: File, filter: string): Promise<Blob> {
    await this.load();

    const data = await file.arrayBuffer();
    await this.ffmpeg!.writeFile("input.mp4", new Uint8Array(data));

    await this.ffmpeg!.exec(["-i", "input.mp4", "-vf", filter, "output.mp4"]);

    const output = await this.ffmpeg!.readFile("output.mp4");
    return new Blob([output], { type: "video/mp4" });
  }

  // 监听进度
  setProgressCallback(callback: (progress: number) => void) {
    this.ffmpeg?.on("progress", ({ progress }) => {
      callback(progress * 100);
    });
  }
}

export const ffmpegService = new FFmpegService();
```

### 5. 视频预览组件

```typescript
// components/Preview/VideoPreview.tsx
const VideoPreview: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timeline = useTimelineStore();
  const playback = usePlaybackStore();

  useEffect(() => {
    if (!videoRef.current) return;

    // 同步时间线当前时间到视频
    videoRef.current.currentTime = timeline.currentTime;
  }, [timeline.currentTime]);

  useEffect(() => {
    if (!videoRef.current) return;

    if (playback.playing) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  }, [playback.playing]);

  return (
    <div className="preview-container">
      <video
        ref={videoRef}
        className="preview-video"
        onTimeUpdate={(e) => {
          timeline.setCurrentTime(e.currentTarget.currentTime);
        }}
      />

      <Controls
        playing={playback.playing}
        onPlay={() => playback.setPlaying(true)}
        onPause={() => playback.setPlaying(false)}
        onSeek={(time) => timeline.setCurrentTime(time)}
      />
    </div>
  );
};
```

### 6. 状态管理（Zustand）

```typescript
// store/timeline.ts
import { create } from "zustand";

interface TimelineState {
  timeline: Timeline;

  // Actions
  addTrack: (type: "video" | "audio") => void;
  removeTrack: (trackId: string) => void;
  addClip: (trackId: string, file: File) => void;
  removeClip: (clipId: string) => void;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  setCurrentTime: (time: number) => void;
  setZoom: (zoom: number) => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  timeline: {
    id: "main",
    duration: 0,
    tracks: [],
    currentTime: 0,
    zoom: 10, // 10px per second
    frameRate: 30,
  },

  addTrack: (type) =>
    set((state) => ({
      timeline: {
        ...state.timeline,
        tracks: [
          ...state.timeline.tracks,
          {
            id: generateId(),
            type,
            clips: [],
            muted: false,
            locked: false,
            height: 80,
          },
        ],
      },
    })),

  addClip: (trackId, file) =>
    set((state) => {
      const track = state.timeline.tracks.find((t) => t.id === trackId);
      if (!track) return state;

      const clip: Clip = {
        id: generateId(),
        trackId,
        file,
        startTime: 0,
        duration: 0, // Will be set after metadata loads
        trimStart: 0,
        trimEnd: 0,
        effects: [],
        volume: 1,
      };

      return {
        timeline: {
          ...state.timeline,
          tracks: state.timeline.tracks.map((t) =>
            t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
          ),
        },
      };
    }),

  // ... other actions
}));
```

## 核心功能实现

### 1. 文件导入

```typescript
const FileImporter: React.FC = () => {
  const timeline = useTimelineStore();

  const handleFileSelect = async (files: FileList) => {
    for (const file of Array.from(files)) {
      // 检测文件类型
      const type = file.type.startsWith('video/') ? 'video' : 'audio';

      // 获取元数据
      const metadata = await getVideoMetadata(file);

      // 添加到时间线
      const trackId = timeline.addTrack(type);
      timeline.addClip(trackId, file, metadata);
    }
  };

  return (
    <input
      type="file"
      accept="video/*,audio/*"
      multiple
      onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
    />
  );
};
```

### 2. 拖拽编辑

```typescript
// Clip 拖拽逻辑
const useClipDrag = (clip: Clip) => {
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);

  const handleDragStart = (e: React.DragEvent) => {
    setDragging(true);
    setDragStart(e.clientX);
  };

  const handleDrag = (e: React.DragEvent) => {
    if (!dragging) return;

    const deltaX = e.clientX - dragStart;
    const deltaTime = deltaX / timeline.zoom;

    timeline.updateClip(clip.id, {
      startTime: clip.startTime + deltaTime,
    });
  };

  return { handleDragStart, handleDrag };
};
```

### 3. 裁剪（Trim）

```typescript
// Clip 裁剪逻辑
const useClipTrim = (clip: Clip) => {
  const handleTrimStart = (e: React.MouseEvent, side: "left" | "right") => {
    e.stopPropagation();

    const startX = e.clientX;
    const startTime = side === "left" ? clip.trimStart : clip.trimEnd;

    const handleMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaTime = deltaX / timeline.zoom;

      if (side === "left") {
        timeline.updateClip(clip.id, {
          trimStart: Math.max(0, startTime + deltaTime),
          startTime: clip.startTime + deltaTime,
        });
      } else {
        timeline.updateClip(clip.id, {
          trimEnd: Math.min(clip.metadata!.duration, startTime + deltaTime),
        });
      }
    };

    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  return { handleTrimStart };
};
```

### 4. 导出视频

```typescript
const ExportButton: React.FC = () => {
  const timeline = useTimelineStore();
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    setExporting(true);

    ffmpegService.setProgressCallback(setProgress);

    // 合并所有片段
    const clips = timeline.timeline.tracks
      .flatMap(track => track.clips)
      .sort((a, b) => a.startTime - b.startTime);

    const result = await ffmpegService.merge(clips);

    // 下载
    const url = URL.createObjectURL(result);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edited-video.mp4';
    a.click();

    setExporting(false);
  };

  return (
    <button onClick={handleExport} disabled={exporting}>
      {exporting ? `Exporting ${progress.toFixed(0)}%` : 'Export'}
    </button>
  );
};
```

## 性能优化

### 1. 缩略图生成

```typescript
async function generateThumbnails(file: File, count: number = 10): Promise<string[]> {
  const video = document.createElement("video");
  video.src = URL.createObjectURL(file);

  await new Promise((resolve) => {
    video.onloadedmetadata = resolve;
  });

  const duration = video.duration;
  const interval = duration / count;
  const thumbnails: string[] = [];

  for (let i = 0; i < count; i++) {
    video.currentTime = i * interval;
    await new Promise((resolve) => (video.onseeked = resolve));

    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 90;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    thumbnails.push(canvas.toDataURL());
  }

  return thumbnails;
}
```

### 2. 虚拟化长时间线

```typescript
// 使用 react-window 虚拟化轨道列表
import { FixedSizeList } from 'react-window';

const VirtualizedTracks: React.FC = () => {
  const timeline = useTimelineStore();

  return (
    <FixedSizeList
      height={600}
      itemCount={timeline.tracks.length}
      itemSize={80}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <Track track={timeline.tracks[index]} />
        </div>
      )}
    </FixedSizeList>
  );
};
```

### 3. Web Worker 处理

```typescript
// workers/ffmpeg.worker.ts
import { FFmpeg } from "@ffmpeg/ffmpeg";

let ffmpeg: FFmpeg;

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  if (type === "load") {
    ffmpeg = new FFmpeg();
    await ffmpeg.load();
    self.postMessage({ type: "loaded" });
  }

  if (type === "process") {
    // 在 worker 中处理视频
    const result = await processVideo(payload);
    self.postMessage({ type: "result", payload: result });
  }
};
```

## UI/UX 设计

### 布局

```
┌─────────────────────────────────────────────┐
│  Toolbar                                    │
├───────────────┬─────────────────────────────┤
│               │                             │
│   Inspector   │      Video Preview          │
│   (Properties)│                             │
│               │                             │
├───────────────┴─────────────────────────────┤
│                                             │
│           Timeline (Tracks & Clips)         │
│                                             │
└─────────────────────────────────────────────┘
```

### 键盘快捷键

- `Space`: 播放/暂停
- `I`: 设置入点
- `O`: 设置出点
- `Delete`: 删除选中片段
- `Cmd/Ctrl + Z`: 撤销
- `Cmd/Ctrl + Shift + Z`: 重做
- `Cmd/Ctrl + S`: 保存项目
- `Cmd/Ctrl + E`: 导出

## 实现计划

### 阶段 1: 基础架构（1-2周）

- [ ] 项目搭建（Vite + React + TypeScript）
- [ ] FFmpeg.wasm 集成
- [ ] 基础状态管理（Zustand）
- [ ] UI 组件库集成（shadcn/ui）

### 阶段 2: Timeline 核心（2-3周）

- [ ] Timeline 组件实现
- [ ] Track 和 Clip 组件
- [ ] 拖拽功能
- [ ] 裁剪功能
- [ ] 播放头同步

### 阶段 3: 视频处理（2-3周）

- [ ] 文件导入
- [ ] 视频预览
- [ ] 基础剪辑（trim, merge）
- [ ] 滤镜应用（resize, crop, rotate）
- [ ] 导出功能

### 阶段 4: 高级功能（3-4周）

- [ ] 多轨道支持
- [ ] 转场效果
- [ ] 文字/字幕
- [ ] 音频编辑
- [ ] 撤销/重做

### 阶段 5: 优化和完善（2-3周）

- [ ] 性能优化
- [ ] 缩略图生成
- [ ] 项目保存/加载
- [ ] 键盘快捷键
- [ ] 错误处理

## 技术挑战

### 1. FFmpeg.wasm 性能

- **问题**: WASM 比原生 FFmpeg 慢
- **解决**:
  - 使用 Web Worker 避免阻塞 UI
  - 只处理必要的操作
  - 提供进度反馈

### 2. 大文件处理

- **问题**: 浏览器内存限制
- **解决**:
  - 流式处理
  - 分片处理
  - 提示用户文件大小限制

### 3. 浏览器兼容性

- **问题**: SharedArrayBuffer 需要特定 headers
- **解决**:
  - 配置服务器 headers
  - 提供降级方案
  - 检测并提示用户

## 参考

- [FFmpeg.wasm](https://ffmpegwasm.netlify.app/)
- [React](https://react.dev/)
- [Zustand](https://github.com/pmndrs/zustand)
- [Radix UI](https://www.radix-ui.com/)
- [shadcn/ui](https://ui.shadcn.com/)

## 变更日志

### 2025-12-30

- 初始 RFC 创建
- 定义架构和组件设计
- 规划实现阶段
