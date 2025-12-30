# AffectJS 包架构

本文档描述了 AffectJS 项目的包架构和职责划分。

## 包职责

### 1. @affectjs/fluent-setup

**职责**: 仅负责设置 FFmpeg 6.1.* 环境

- 检测 FFmpeg 安装
- 验证 FFmpeg 版本（必须为 6.1.*）
- 自动安装/升级 FFmpeg（如果需要）
- 配置 shell 环境变量（FFMPEG_PATH, FFPROBE_PATH）
- 支持多种 shell（bash, zsh, fish, PowerShell, CMD）

**CLI 命令**: `fluent-setup setup`

**依赖**: 无（独立包）

### 2. @affectjs/fluent-ffmpeg

**职责**: FFmpeg 的 Fluent API

- 提供流畅的 FFmpeg API
- 依赖 `@affectjs/fluent-setup` 来准备 FFmpeg 6.1.*
- 在 `prepare` 脚本中自动运行 `fluent-setup setup`

**依赖**:
- `@affectjs/fluent-setup` (workspace:*)

**脚本**:
- `setup`: 运行 `fluent-setup setup`
- `prepare`: 自动运行 `fluent-setup setup`

### 3. @affectjs/cli

**职责**: Affect CLI - 运行 affect DSL 的简单方式

- `setup` 命令：调用 `@affectjs/fluent-setup` 来设置 FFmpeg 环境
- `run` 命令：运行 `.affect` DSL 文件
- `compile` 命令：编译 `.affect` DSL 文件到 JavaScript

**CLI 命令**: `affect`

**依赖**:
- `@affectjs/fluent-setup` (workspace:*) - 用于 FFmpeg 设置
- `@affectjs/dsl` (workspace:*) - 用于 DSL 编译
- `@affectjs/affect` (workspace:*) - 用于 DSL 执行

### 4. @affectjs/dsl

**职责**: DSL 解析器和编译器

- 解析 `.affect` DSL 文件
- 编译 DSL 到 JavaScript 代码

### 5. @affectjs/affect

**职责**: 运行时引擎

- 执行编译后的 DSL 代码
- 自动选择后端（fluent-ffmpeg 用于视频/音频，sharp 用于图像）

## 依赖关系图

```
@affectjs/cli
├── @affectjs/fluent-setup (setup FFmpeg)
├── @affectjs/dsl (compile DSL)
└── @affectjs/affect (execute DSL)
    └── @affectjs/fluent-ffmpeg (video/audio backend)
        └── @affectjs/fluent-setup (prepare FFmpeg)

@affectjs/fluent-ffmpeg
└── @affectjs/fluent-setup (prepare FFmpeg 6.1.*)
```

## 使用流程

### 设置 FFmpeg 环境

```bash
# 方式 1: 使用 affect CLI
affect setup

# 方式 2: 直接使用 fluent-setup
fluent-setup setup

# 方式 3: 通过 fluent-ffmpeg (自动调用 fluent-setup)
cd packages/@affectjs/fluent-ffmpeg
pnpm prepare
```

### 运行 Affect DSL

```bash
# 使用 affect CLI (推荐)
affect run video.affect

# 或者编译后手动执行
affect compile video.affect
node video.js
```

## 架构原则

1. **单一职责**: 每个包只负责一个明确的功能
2. **依赖最小化**: 包之间的依赖关系清晰且最小化
3. **可组合性**: 包可以独立使用，也可以组合使用
4. **向后兼容**: 保持 API 的稳定性

