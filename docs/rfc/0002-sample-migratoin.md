# RFC-0002: Examples 迁移到 Affect DSL

**状态**: 计划中  
**日期**: 2025-12-29  
**作者**: Albert Li  
**相关议题**: 将 examples 目录下的旧 fluent-ffmpeg 代码迁移到 Affect DSL

## 摘要

本文档描述了将 `packages/@affectjs/examples` 目录下使用 fluent-ffmpeg 直接调用的 JavaScript 示例代码迁移到 Affect DSL 的工作。这些示例将展示 Affect DSL 的强大功能，并作为学习和参考的文档。

## 动机

1. **展示 DSL 能力**: 通过实际示例展示 Affect DSL 的强大功能和易用性
2. **迁移旧代码**: 将旧的 fluent-ffmpeg 直接调用代码迁移到统一的 DSL 语法
3. **文档和参考**: 提供完整的示例集合，作为使用 Affect DSL 的参考文档
4. **示例视频**: 准备示例视频文件，展示 DSL 处理各种场景的能力
5. **教育价值**: 帮助用户理解如何从 fluent-ffmpeg API 迁移到 Affect DSL

## 迁移计划

### 1. 识别需要迁移的示例

当前 `packages/@affectjs/examples/examples/` 目录下有以下使用 fluent-ffmpeg 直接调用的示例：

- `full.js` - 完整的视频转换示例
- `preset.js` - 使用预设的示例
- `thumbnails.js` - 生成缩略图示例
- `metadata.js` - 获取元数据示例
- `progress.js` - 进度监控示例
- `mergeVideos.js` - 合并视频示例
- `image2video.js` - 图像转视频示例
- `stream.js` - 流处理示例
- `input-stream.js` - 输入流示例
- `express-stream.js` - Express 流示例
- `any-to-mp4-steam.js` - 任意格式转 MP4 流示例
- `livertmp2hls.js` - 实时流转 HLS 示例
- `web-ui-server.js` - Web UI 服务器示例

### 2. 迁移策略

#### 2.1 直接迁移到 DSL

对于简单的转换操作，直接转换为 Affect DSL：

**示例：full.js**
```javascript
// 旧代码
var ffmpeg = require('@luban-ws/fluent-ffmpeg');
var proc = ffmpeg(__dirname + '/assets/testvideo-169.avi')
  .videoBitrate(1024)
  .videoCodec('divx')
  .aspect('16:9')
  .size('50%')
  .fps(24)
  .audioBitrate('128k')
  .audioCodec('libmp3lame')
  .audioChannels(2)
  .format('avi')
  .save(__dirname + '/output.avi');
```

**迁移到 DSL**
```dsl
# full.affect
affect video "assets/testvideo-169.avi" "output.avi" {
  resize 50%
  encode divx 1024
  encode libmp3lame 128
  filter aspect 16:9
  filter fps 24
}
```

#### 2.2 复杂操作迁移

对于涉及事件处理、进度监控等复杂操作，需要：
1. DSL 文件描述处理流程
2. JavaScript 代码处理事件和进度

**示例：progress.js**
```javascript
// 旧代码
ffmpeg(input)
  .on('progress', function(progress) {
    console.log('Processing: ' + progress.percent + '% done');
  })
  .on('end', function() {
    console.log('Finished processing');
  })
  .save(output);
```

**迁移后**
```dsl
# progress.affect
affect video "input.mp4" "output.mp4" {
  resize 1280 720
  encode h264 2000
}
```

```javascript
// progress-runner.js
import { execute } from '@affectjs/affect';
import { compileDslFile } from '@affectjs/dsl';

const dsl = compileDslFile('progress.affect');
await execute(dsl, {
  onProgress: (progress) => {
    console.log('Processing: ' + progress.percent + '% done');
  },
  onEnd: () => {
    console.log('Finished processing');
  }
});
```

### 3. 示例视频准备

需要准备以下示例视频来展示 Affect DSL 的强大功能：

#### 3.1 基础示例视频
- **testvideo-169.avi** - 已存在，用于基础转换示例
- **testvideo-43.avi** - 已存在，用于多格式转换示例
- **testvideo-5m.mpg** - 已存在，用于长时间视频处理示例

#### 3.2 需要添加的示例视频
- **高清视频** (1920x1080) - 展示 resize 和编码优化
- **4K 视频** (3840x2160) - 展示高性能处理
- **不同格式视频** - MP4, AVI, MOV, WebM 等
- **不同分辨率视频** - 480p, 720p, 1080p, 4K
- **不同帧率视频** - 24fps, 30fps, 60fps
- **带音频视频** - 展示音频处理能力
- **纯视频** - 展示视频处理能力

### 4. 迁移后的目录结构

```
packages/@affectjs/examples/
├── examples/
│   ├── dsl/                    # 新的 DSL 示例目录
│   │   ├── basic/
│   │   │   ├── resize.affect
│   │   │   ├── encode.affect
│   │   │   └── filter.affect
│   │   ├── advanced/
│   │   │   ├── merge.affect
│   │   │   ├── thumbnail.affect
│   │   │   └── image2video.affect
│   │   └── streaming/
│   │       ├── stream.affect
│   │       └── hls.affect
│   ├── js/                      # 迁移后的 JavaScript 运行器
│   │   ├── run-dsl.js          # 通用 DSL 运行器
│   │   ├── progress-runner.js
│   │   └── stream-runner.js
│   ├── legacy/                  # 保留旧代码作为参考
│   │   ├── full.js
│   │   ├── preset.js
│   │   └── ...
│   └── assets/                  # 示例视频和资源
│       ├── videos/
│       │   ├── testvideo-169.avi
│       │   ├── testvideo-43.avi
│       │   ├── hd-sample.mp4
│       │   ├── 4k-sample.mp4
│       │   └── ...
│       └── images/
│           └── sample.jpg
├── README.md                    # 更新使用说明
└── package.json
```

## 实现细节

### 1. 迁移步骤

#### 步骤 1: 分析现有示例
- 列出所有使用 fluent-ffmpeg 的示例文件
- 分析每个示例的功能和复杂度
- 确定迁移优先级

#### 步骤 2: 创建 DSL 示例
- 为每个示例创建对应的 `.affect` 文件
- 确保 DSL 语法正确且可执行
- 添加注释说明

#### 步骤 3: 创建运行器脚本
- 创建通用的 DSL 运行器
- 处理事件和进度回调
- 提供错误处理

#### 步骤 4: 准备示例视频
- 下载或创建示例视频文件
- 确保视频格式和大小合适
- 添加到 `assets/videos/` 目录

#### 步骤 5: 更新文档
- 更新 README.md
- 添加每个示例的使用说明
- 提供迁移指南

### 2. DSL 示例模板

#### 基础转换模板
```dsl
# basic-convert.affect
affect video "input.mp4" "output.mp4" {
  resize 1280 720
  encode h264 2000
  encode aac 128
}
```

#### 滤镜应用模板
```dsl
# filter.affect
affect video "input.mp4" "output.mp4" {
  filter grayscale
  filter blur 5
  filter brightness 1.2
}
```

#### 合并视频模板
```dsl
# merge.affect
affect video "input1.mp4" "output.mp4" {
  # 第一个视频
  resize 1280 720
}

affect video "input2.mp4" "temp.mp4" {
  # 第二个视频
  resize 1280 720
}

# 合并操作（需要运行时支持）
```

### 3. 运行器实现

#### 通用 DSL 运行器
```javascript
// run-dsl.js
import { execute } from '@affectjs/affect';
import { compileDslFile } from '@affectjs/dsl';
import { readFileSync } from 'fs';

async function runDSL(dslFile, options = {}) {
  try {
    const dsl = readFileSync(dslFile, 'utf-8');
    const compiledCode = compileDslFile(dsl);
    
    await execute(compiledCode, {
      ...options,
      onProgress: (progress) => {
        if (options.onProgress) {
          options.onProgress(progress);
        } else {
          console.log(`Progress: ${progress.percent}%`);
        }
      },
      onEnd: () => {
        if (options.onEnd) {
          options.onEnd();
        } else {
          console.log('Processing completed!');
        }
      },
      onError: (error) => {
        if (options.onError) {
          options.onError(error);
        } else {
          console.error('Error:', error);
        }
      }
    });
  } catch (error) {
    console.error('Failed to run DSL:', error);
    process.exit(1);
  }
}

// 命令行使用
const dslFile = process.argv[2];
if (!dslFile) {
  console.error('Usage: node run-dsl.js <dsl-file>');
  process.exit(1);
}

runDSL(dslFile);
```

## 测试计划

### 功能测试

- [ ] 所有 DSL 示例可以正确编译
- [ ] 所有 DSL 示例可以正确执行
- [ ] 输出结果与原始示例一致
- [ ] 事件处理（progress, end, error）正常工作
- [ ] 不同格式视频处理正常
- [ ] 不同分辨率视频处理正常

### 性能测试

- [ ] 小文件处理（< 10MB）
- [ ] 中等文件处理（10MB - 100MB）
- [ ] 大文件处理（> 100MB）
- [ ] 批量处理性能

### 兼容性测试

- [ ] 不同操作系统（macOS, Linux, Windows）
- [ ] 不同 Node.js 版本
- [ ] 不同 FFmpeg 版本

## 迁移路径

### 阶段 1: 基础示例迁移（2-3周）

1. **简单转换示例**:
   - `full.js` → `dsl/basic/full.affect`
   - `preset.js` → `dsl/basic/preset.affect`

2. **基础运行器**:
   - 创建 `js/run-dsl.js`
   - 支持基本的事件处理

3. **文档更新**:
   - 更新 README.md
   - 添加基础示例说明

### 阶段 2: 高级示例迁移（3-4周）

1. **复杂操作示例**:
   - `thumbnails.js` → `dsl/advanced/thumbnails.affect`
   - `mergeVideos.js` → `dsl/advanced/merge.affect`
   - `image2video.js` → `dsl/advanced/image2video.affect`

2. **高级运行器**:
   - 增强事件处理
   - 支持进度监控
   - 支持错误恢复

3. **示例视频准备**:
   - 下载/创建示例视频
   - 添加到 assets 目录

### 阶段 3: 流处理示例迁移（2-3周）

1. **流处理示例**:
   - `stream.js` → `dsl/streaming/stream.affect`
   - `input-stream.js` → `dsl/streaming/input-stream.affect`
   - `express-stream.js` → `dsl/streaming/express-stream.affect`
   - `livertmp2hls.js` → `dsl/streaming/hls.affect`

2. **流处理运行器**:
   - 支持流输入/输出
   - 支持实时处理

### 阶段 4: 完善和优化（1-2周）

1. **代码优化**:
   - 优化 DSL 示例
   - 优化运行器性能

2. **文档完善**:
   - 完善所有示例文档
   - 添加迁移指南
   - 添加最佳实践

3. **测试和验证**:
   - 全面测试所有示例
   - 验证输出质量
   - 性能基准测试

## 参考

- [RFC-004: @affectjs/dsl - 统一媒体处理 DSL](./completed/0004-fluent-ffmpeg-dsl.md)
- [RFC-005: @affectjs/affect - AffectJS 运行时引擎](./0005-affectjs-runtime.md)
- [RFC-007: AffectJS 架构设计](./0007-affectjs-architecture.md)

## 变更日志

### 2025-12-29
- 重新定位 RFC-002 为示例迁移工作文档
- 定义迁移计划和策略
- 规划示例视频准备
- 设计迁移后的目录结构
- 移除旧的 Web UI 服务器相关内容
