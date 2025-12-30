# RFC-004: @affectjs/dsl - 统一媒体处理 DSL（视频/音频/图像）

**状态**: In Progress  
**日期**: 2024-12-29  
**作者**: Albert Li  
**相关问题**: 定义统一的媒体处理 DSL，可被 AI 理解和使用

## 摘要

本文档描述了 **@affectjs/dsl**，一个统一的领域特定语言（DSL），用于描述视频、音频和图像的处理过程。该 DSL 设计为：
1. **AI 友好**: 语义清晰，易于 AI 理解和生成
2. **抽象化**: 不绑定特定库，可编译到不同的后端（fluent-ffmpeg, sharp, 等）
3. **统一语法**: 使用相同的语法描述不同类型的媒体处理
4. **接近自然语言**: 像描述处理步骤一样自然，但保留必要的逻辑结构

## 核心设计理念

### 1. AI 可理解的语义

DSL 使用自然语言风格的命令，让 AI 能够：
- 理解处理意图
- 生成正确的 DSL 代码
- 推理处理流程
- 优化处理步骤

### 2. 抽象化处理操作

不直接暴露底层库 API，而是使用高级抽象：
- `resize` 而非 `video size` 或 `sharp.resize()`
- `encode` 而非 `video codec` 或 `audio codec`
- `filter` 而非 `videoFilters()` 或 `sharp.filter()`

### 3. 多后端支持

同一个 DSL 可以编译到：
- **视频/音频**: fluent-ffmpeg
- **图像**: sharp
- **未来**: 其他媒体处理库

## DSL 语法设计

### 设计原则

1. **简洁但完整**: 最少的关键词，但保留必要的逻辑结构
2. **接近自然语言**: 像描述处理步骤一样自然
3. **逻辑清晰**: 支持条件判断，描述"如何"处理
4. **统一语法**: 视频、音频、图像使用相同语法

### 基本结构

```dsl
# 硬编码路径
affect <type> <input> <output> {
  <operations>
}

# 使用上下文变量（可共享的 DSL）
affect auto $input $output {
  <operations>
}

# 或者使用 save 命令
affect <type> <input> {
  <operations>
  save <output>
}
```

### 媒体类型

- `auto` - **自动检测**：根据文件扩展名自动选择后端
  - 视频文件（`.mp4`, `.avi`, `.mov` 等）→ 使用 fluent-ffmpeg
  - 音频文件（`.mp3`, `.wav`, `.aac` 等）→ 使用 fluent-ffmpeg
  - 图像文件（`.jpg`, `.png`, `.webp` 等）→ 使用 sharp
- `video` - 明确指定为视频，使用 fluent-ffmpeg
- `audio` - 明确指定为音频，使用 fluent-ffmpeg
- `image` - 明确指定为图像，使用 sharp

### 输入/输出路径

支持两种方式指定输入和输出：

1. **字符串字面量**（硬编码）：
   ```dsl
   affect video "input.mp4" "output.mp4" { ... }
   ```

2. **上下文变量**（运行时解析）：
   ```dsl
   affect auto $input $output { ... }
   ```
   - 变量以 `$` 开头
   - 运行时从 `context` 对象中解析
   - 使 DSL 可共享，不绑定具体文件路径

### 核心操作

#### 1. 尺寸调整 (resize)

```dsl
resize 1280 720              # 指定宽度和高度
resize 1280 auto              # 指定宽度，高度自动保持宽高比
resize 1280                   # 只指定宽度，高度为 null
resize 50%                    # 按百分比缩放（宽度和高度都按比例）
resize 50% auto               # 宽度按百分比，高度自动
resize auto 720               # 宽度自动，指定高度
```

#### 2. 编码 (encode)

```dsl
# 视频
encode h264 2000      # 编码器 + 比特率
encode h264 high      # 编码器 + 质量

# 音频
encode aac 128
encode mp3 high

# 图像
encode jpeg 90        # 格式 + 质量
encode png
```

#### 3. 滤镜 (filter)

```dsl
filter blur 5
filter brightness 1.2
filter contrast 1.1
filter grayscale
filter fps 30         # 视频专用
```

#### 4. 裁剪 (crop)

```dsl
crop 0 0 640 480              # x y width height（绝对坐标）
crop center auto 640 480      # x 居中，y 自动，指定宽高
crop center 640 480           # x 居中，y 为 null，指定宽高
crop "center" 640 480        # 使用字符串指定区域，指定宽高
```

**参数说明**：
- `x`: 可以是数字（像素值）或 `"center"`（居中）
- `y`: 可以是数字（像素值）、`"auto"`（自动）或省略（null）
- `width`: 裁剪宽度（必需，数字）
- `height`: 裁剪高度（必需，数字）

#### 5. 旋转 (rotate)

```dsl
rotate 90                     # 旋转角度（度）
rotate 180 "horizontal"      # 旋转角度 + 翻转方向
rotate 90                     # 只旋转，不翻转（flip 为 null）
```

**参数说明**：
- `angle`: 旋转角度（必需，数字，单位：度）
- `flip`: 翻转方向（可选，字符串：`"horizontal"` 或 `"vertical"`）

### 分组命令语法

DSL 支持将相关命令分组，使代码更清晰：

#### 视频命令分组

```dsl
video {
  codec "libx264"
  bitrate "1M"
  fps 30
}
```

等价于：

```dsl
video codec "libx264"
video bitrate "1M"
video fps 30
```

#### 音频命令分组

```dsl
audio {
  codec "aac"
  bitrate 128
  channels 2
  frequency 44100
}
```

等价于：

```dsl
audio codec "aac"
audio bitrate 128
audio channels 2
audio frequency 44100
```

#### 滤镜命令分组

```dsl
filter {
  blur 5
  brightness 1.1
  grayscale
}
```

等价于：

```dsl
filter blur 5
filter brightness 1.1
filter grayscale
```

**注意**：在 filter block 中，每个 filter 命令可以：
- 有值：`blur 5`（blur 滤镜，值为 5）
- 无值：`grayscale`（grayscale 滤镜，值为 null）

### 视频/音频专用命令

除了统一命令外，还支持视频和音频专用的命令：

#### 视频命令

```dsl
# 扁平语法
video codec "libx264"
video bitrate "1M"
video size "1280x720"
video fps 30
video filter "scale=1280:720"
no video                    # 移除视频轨道

# 分组语法（见上方）
video {
  codec "libx264"
  bitrate "1M"
  fps 30
}
```

#### 音频命令

```dsl
# 扁平语法
audio codec "aac"
audio bitrate 128
audio channels 2
audio frequency 44100
no audio                    # 移除音频轨道

# 分组语法（见上方）
audio {
  codec "aac"
  bitrate 128
  channels 2
  frequency 44100
}
```

### 选项命令

```dsl
timeout 300                 # 设置处理超时时间（秒）
format "mp4"                # 指定输出格式
```

### 事件处理命令

```dsl
on start "handler"          # 处理开始时的回调
on end "handler"            # 处理结束时的回调
on error "handler"         # 错误发生时的回调
on progress "handler"      # 进度更新时的回调
```

### 条件逻辑

**状态**：✅ 已实现

DSL 支持条件逻辑，允许根据媒体属性动态选择处理操作：

```dsl
# 如果宽度大于 1920，则调整大小
if width > 1920 {
  resize 1920 auto
}

# 如果质量是高清，使用高比特率
if quality == "high" {
  encode h264 5000
} else {
  encode h264 2000
}

# 组合条件
if width > 1920 and height > 1080 {
  resize 1920 1080
}
```

**实现说明**：
- 条件表达式在运行时评估，需要先获取媒体元数据
- 属性访问（如 `width`, `height`, `duration`）从媒体元数据中读取
- 编译器会自动生成获取元数据的代码
- 条件块内的命令使用变量赋值形式，确保条件逻辑正确执行

### 完整示例

#### 基础视频处理

```dsl
affect video "input.mp4" "output.mp4" {
  resize 1280 720
  encode h264 2000
  encode aac 128
}
```

#### 使用分组命令

```dsl
affect auto $input $output {
  resize 1280 720
  encode h264 2000
  encode aac 128
  
  video {
    codec "libx264"
    bitrate "1M"
    fps 30
  }
  
  audio {
    codec "aac"
    bitrate 128
    channels 2
    frequency 44100
  }
  
  filter {
    blur 5
    brightness 1.1
  }
  
  crop center auto 640 480
  rotate 90
  timeout 300
  format "mp4"
}
```

#### 视频处理示例

```dsl
# 方式 1: 在 affect 中指定输出
affect video "input.mp4" "output.mp4" {
  resize 1920 auto
  encode h264 2000
  encode aac 128
  filter fps 30
}

# 方式 2: 使用 save 命令
affect video "input.mp4" {
  resize 1920 auto
  encode h264 2000
  encode aac 128
  save "output.mp4"
}

# 方式 3: 使用上下文变量（可共享的 DSL）
affect auto $input $output {
  resize 1920 auto
  encode h264 2000
  encode aac 128
}

# 方式 4: 带条件逻辑
affect video "input.mp4" "output.mp4" {
  if width > 1920 {
    resize 1920 auto
  }
  encode h264 2000
  encode aac 128
}
```

#### 图像处理示例

```dsl
affect image "input.jpg" "output.jpg" {
  resize 1920 1080
  filter sharpen 2
  filter brightness 1.1
  filter grayscale
  encode jpeg 90
}

# 带条件逻辑的图像处理
affect image "input.jpg" "output.jpg" {
  if width > 1920 or height > 1080 {
    resize 1920 1080
  }
  filter sharpen 2
  filter brightness 1.1
  encode jpeg 90
}
```

#### 音频处理示例

```dsl
affect audio "input.wav" "output.mp3" {
  encode mp3 192
  audio {
    codec "aac"
    bitrate 128
    channels 2
  }
}

# 带条件逻辑的音频处理
affect audio "input.wav" "output.mp3" {
  if duration > 60 {
    encode mp3 192
  } else {
    encode mp3 128
  }
}
```

## AI 使用场景

### 场景 1: 自然语言 → DSL

**用户**: "压缩视频到 720p，使用 H.264 编码"

**AI 生成**:
```dsl
affect video "input.mp4" "output.mp4" {
  resize 1280 720
  encode h264 2000
}
```

### 场景 2: 智能处理流程

**用户**: "图片变黑白，然后调整到 1920x1080"

**AI 生成**:
```dsl
affect image "input.jpg" "output.jpg" {
  filter grayscale
  resize 1920 1080
}
```

### 场景 3: 使用分组命令

**用户**: "处理视频，设置视频编码为 H.264，音频为 AAC，应用模糊和亮度滤镜"

**AI 生成**:
```dsl
affect video "input.mp4" "output.mp4" {
  video {
    codec "libx264"
    bitrate "1M"
    fps 30
  }
  audio {
    codec "aac"
    bitrate 128
  }
  filter {
    blur 5
    brightness 1.1
  }
}
```

### 场景 4: 条件逻辑处理

**用户**: "如果视频太大就压缩到 720p，使用 H.264 编码"

**AI 生成**:
```dsl
affect video "input.mp4" "output.mp4" {
  if width > 1920 {
    resize 1280 720
  }
  encode h264 2000
}
```

**用户**: "图片如果是彩色的就变黑白，然后调整到 1920x1080"

**AI 生成**:
```dsl
affect image "input.jpg" "output.jpg" {
  if hasColor {
    filter grayscale
  }
  resize 1920 1080
}
```

## 编译器架构

### 后端适配器

```
DSL → AST → 后端适配器 → 目标代码
                ├─→ fluent-ffmpeg (视频/音频)
                ├─→ sharp (图像)
                └─→ 其他库
```

### 实现示例

```typescript
// 编译器根据媒体类型选择后端
function compile(ast: AST, mediaType: 'video' | 'audio' | 'image') {
  switch (mediaType) {
    case 'video':
    case 'audio':
      return compileToFluentFfmpeg(ast);
    case 'image':
      return compileToSharp(ast);
  }
}
```

## 语法详细规范

### 操作参数格式

```dsl
# 位置参数（简洁，推荐）
resize 1280 720
encode h264 2000
filter blur 5
crop 0 0 640 480

# 百分比支持
resize 50%                # 宽度和高度都按 50% 缩放
resize 50% auto           # 宽度 50%，高度自动

# 特殊值支持
resize 1280 auto          # 宽度固定，高度自动保持宽高比
crop center auto 640 480  # x 居中，y 自动，指定宽高
```

**注意**：当前实现仅支持位置参数，命名参数（如 `resize width 1280 height 720`）尚未实现。

### 条件表达式

**状态**：✅ 已实现

支持以下条件表达式语法：

```dsl
# 比较操作
if width > 1920 { ... }
if height < 720 { ... }
if duration == 60 { ... }
if quality != "low" { ... }

# 逻辑操作
if width > 1920 and height > 1080 { ... }
if type == "video" or type == "image" { ... }
if not processed { ... }

# 属性访问
if width > 1920 { ... }        # 媒体宽度
if height > 1080 { ... }       # 媒体高度
if duration > 60 { ... }       # 时长（秒）
if size > 100MB { ... }        # 文件大小
if fps > 30 { ... }            # 帧率（视频）
```

### 处理流程描述

```dsl
# 使用 affect 命令处理图像
affect image "photo.jpg" "output.jpg" {
  resize 1920 auto
  filter grayscale
  filter brightness 1.1
  encode jpeg 90
}

# 或者使用 save 命令（当输出路径需要动态决定时）
affect image "photo.jpg" {
  resize 1920 auto
  filter grayscale
  filter brightness 1.1
  encode jpeg 90
  save "output.jpg"
}

# 带条件逻辑的处理
affect image "photo.jpg" "output.jpg" {
  if width > 1920 {
    resize 1920 auto
  }
  if hasColor {
    filter grayscale
  }
  filter brightness 1.1
  encode jpeg 90
}
```

### 上下文变量（用于可共享的 DSL）

DSL 支持使用 `$` 前缀的变量，这些变量在运行时从上下文对象中解析：

```dsl
# 使用上下文变量（可共享的 DSL）
affect auto $input $output {
  resize 1280 720
  encode h264 2000
}
```

**变量解析**：
- 编译器会生成接受 `context` 参数的函数
- 变量从 `context.input`, `context.output` 等属性中读取
- 使 DSL 可以共享，不绑定具体的文件路径

**使用示例**：

```typescript
// 编译 DSL
const code = compileDsl('affect auto $input $output { resize 1280 720 }');

// 生成的代码
async function execute(context = {}) {
  const result = await affect(context.input)
    .resize(1280, 720)
    .save(context.output)
    .execute();
  return result;
}

// 运行时调用
await execute({ input: 'video.mp4', output: 'output.mp4' });
```

**变量命名规则**：
- 必须以 `$` 开头
- 遵循标识符规则：字母、数字、下划线
- 常用变量：`$input`, `$output`, `$width`, `$height` 等
- 变量名区分大小写

## 实现计划

### 阶段 1: 核心语法（当前）
- ✅ 基础语法定义（使用 `affect` 关键词）
- ✅ Peggy 解析器
- ✅ AST 结构
- ✅ 编译器框架
- ✅ 统一操作支持（resize, encode, filter, crop, rotate）
- ✅ 分组命令语法（video {}, audio {}, filter {}）
- ✅ 视频/音频专用命令
- ✅ 选项命令（timeout, format）
- ✅ 事件处理命令（on start, on end, on error, on progress）
- ✅ 百分比支持（resize 50%）
- ✅ Crop 命令完整支持（包括 center, auto）
- ✅ Filter block 语法
- ✅ **条件逻辑（if/else）**：支持比较操作、逻辑操作、属性访问

### 阶段 2: 后端适配器
- ⏳ fluent-ffmpeg 适配器
- ⏳ sharp 适配器
- ⏳ 统一操作映射

### 阶段 3: AI 增强
- ⏳ 语义验证
- ⏳ 操作优化
- ⏳ 错误修复建议

### 阶段 4: 工具支持
- ⏳ 语法高亮
- ⏳ 自动完成
- ⏳ AI 代码生成插件

## 优势

1. **AI 友好**: 语义清晰，易于理解和生成
2. **统一接口**: 相同的语法处理不同类型的媒体
3. **可扩展**: 易于添加新的操作和后端
4. **可维护**: 声明式语法，易于理解和修改
5. **可移植**: DSL 文件独立于实现库

## 未来考虑

1. **流式处理**: 支持流式媒体处理
2. **并行处理**: 支持多任务并行
3. **缓存优化**: 智能缓存处理结果
4. **性能监控**: 内置性能分析
5. **可视化**: DSL 到处理流程的可视化

## 参考资料

- fluent-ffmpeg API 文档
- sharp API 文档
- PEG 语法规范
- DSL 设计最佳实践

## 变更日志

### 2024-12-29
- 初始设计：统一媒体处理 DSL
- 重新定义设计目标：AI 友好、抽象化、多后端支持
- 定义核心操作和语法规范
- 设计编译器架构
- **重命名为 @affectjs/dsl**：使用 `affect` 关键词替代 `process`，包名改为 `@affectjs/dsl`，目录结构改为 `packages/@affectjs/dsl`
- 统一操作语法：resize, encode, filter, crop, rotate
- 支持条件逻辑：if 语句
- 移除 `output` 命令，统一使用 `save`
- **添加变量支持**：支持 `$input`, `$output` 等上下文变量，使 DSL 可共享，不绑定具体文件路径
- **添加 `auto` 媒体类型**：自动检测媒体类型并根据文件扩展名选择后端（fluent-ffmpeg 用于视频/音频，sharp 用于图像）
- **修复 Identifier 解析**：正确解析完整的变量名（如 `input` 而不是 `i`）
- **更新编译器**：生成接受 `context` 参数的函数，支持运行时变量解析
- **添加分组命令语法**：支持 `video {}`, `audio {}`, `filter {}` 分组语法
- **完善 resize 命令**：支持百分比（`resize 50%`），支持 `auto` 高度，支持只指定宽度
- **完善 crop 命令**：支持 `center` 和 `auto` 参数，支持字符串区域指定
- **完善 filter block**：支持在 filter block 中定义多个 filter 命令，支持有值和无值 filter
- **添加视频/音频专用命令**：支持扁平语法（`video codec`）和分组语法
- **添加选项命令**：`timeout` 和 `format` 命令
- **添加事件处理命令**：`on start`, `on end`, `on error`, `on progress`
- **实现条件逻辑功能**：
  - 支持 if/else 语句
  - 支持比较操作符（>, <, >=, <=, ==, !=）
  - 支持逻辑操作（and, or, not）
  - 支持属性访问（width, height, duration 等）
  - 编译器自动生成元数据获取代码
  - 条件块内命令使用变量赋值确保正确执行
- **修复解析器问题**：
  - 修复百分比解析顺序问题（Percentage 优先于 Number）
  - 修复 crop 命令 y 值为 0 时被解析为 null 的问题
  - 修复 filter block 中多个命令的解析问题
  - 修复比较操作符解析顺序（>=, <= 优先于 >, <）
