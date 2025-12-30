# RFC-007: AffectJS 架构设计

**状态**: ✅ Completed  
**日期**: 2025-12-29  
**完成日期**: 2025-12-29  
**作者**: Albert Li  
**相关问题**: 澄清 AffectJS 项目的整体架构、包职责划分和依赖关系

## 摘要

本文档描述了 **AffectJS** 项目的整体架构设计，包括：
1. **包职责划分**: 每个包的明确职责和边界
2. **依赖关系**: 包之间的依赖关系图
3. **架构原则**: 设计原则和最佳实践
4. **使用流程**: 典型的使用场景和流程

## 核心设计理念

### 1. 单一职责原则

每个包只负责一个明确的功能领域：
- **fluent-setup**: 仅负责 FFmpeg 环境设置
- **fluent-ffmpeg**: 仅提供 FFmpeg Fluent API
- **dsl**: 仅负责 DSL 解析和编译
- **affect**: 仅负责运行时执行
- **cli**: 仅负责命令行接口

### 2. 依赖最小化

包之间的依赖关系清晰且最小化：
- 避免循环依赖
- 避免不必要的依赖
- 优先使用组合而非继承

### 3. 可组合性

包可以独立使用，也可以组合使用：
- 可以单独使用 `fluent-setup` 设置 FFmpeg
- 可以单独使用 `fluent-ffmpeg` 进行视频处理
- 可以单独使用 `dsl` 编译 DSL 文件
- 可以通过 `cli` 组合所有功能

### 4. 向后兼容

保持 API 的稳定性，避免破坏性变更。

## 包架构详解

### 1. @affectjs/fluent-setup

**职责**: 仅负责设置 FFmpeg 6.1.* 环境

#### 核心功能

- 检测 FFmpeg 安装
- 验证 FFmpeg 版本（必须为 6.1.*）
- 自动安装/升级 FFmpeg（如果需要）
- 配置 shell 环境变量（`FFMPEG_PATH`, `FFPROBE_PATH`）
- 支持多种 shell（bash, zsh, fish, PowerShell, CMD）

#### CLI 命令

```bash
fluent-setup setup [options]
```

#### 依赖

- **无**（独立包，不依赖其他 AffectJS 包）

#### 导出 API

```typescript
// 主要函数
export function setup(options?: SetupOptions): Promise<SetupConfig>;
export function findExecutable(name: string): Promise<string | null>;
export function getFfmpegVersion(ffmpegPath: string): Promise<string | null>;
export function isVersionSupported(version: string): boolean;

// Shell 配置
export function detectShell(): ShellType;
export function writeShellConfig(shell: ShellType, config: SetupConfig): void;
export function setWindowsEnvVars(config: SetupConfig): void;
export function getShellConfigPath(shell: ShellType): string | null;

// 类型
export type { SetupConfig, SetupOptions, ShellType };
```

#### 使用场景

```typescript
// 程序化使用
import { setup } from "@affectjs/fluent-setup";

const config = await setup({
    required: true,
    install: false,
    silent: false,
});
```

### 2. @affectjs/fluent-ffmpeg

**职责**: FFmpeg 的 Fluent API

#### 核心功能

- 提供流畅的 FFmpeg API
- 支持视频和音频处理
- 依赖 `@affectjs/fluent-setup` 来准备 FFmpeg 6.1.*
- 在 `prepare` 脚本中自动运行 `fluent-setup setup`

#### 依赖

- `@affectjs/fluent-setup` (workspace:*) - 用于准备 FFmpeg 环境

#### 脚本

```json
{
  "scripts": {
    "setup": "pnpm exec fluent-setup setup",
    "prepare": "pnpm exec fluent-setup setup"
  }
}
```

#### 使用场景

```typescript
import ffmpeg from "@affectjs/fluent-ffmpeg";

ffmpeg("input.mp4")
    .videoCodec("libx264")
    .audioCodec("libmp3lame")
    .save("output.mp4");
```

### 3. @affectjs/dsl

**职责**: DSL 解析器和编译器

#### 核心功能

- 解析 `.affect` DSL 文件
- 编译 DSL 到 JavaScript 代码
- 支持 AST 生成和代码生成

#### 依赖

- **无**（独立包，不依赖其他 AffectJS 包）

#### 导出 API

```typescript
// 解析和编译
export function parseDsl(dsl: string): AST;
export function compileDslFile(filePath: string): Promise<string>;
export function compileDsl(dsl: string): string;
```

#### 使用场景

```typescript
import { compileDslFile } from "@affectjs/dsl";

const jsCode = await compileDslFile("video.affect");
```

### 4. @affectjs/runtime

**职责**: 运行时引擎

#### 核心功能

- 执行编译后的 DSL 代码
- 自动选择后端（fluent-ffmpeg 用于视频/音频，sharp 用于图像）
- 提供统一的执行接口

#### 依赖

- `@affectjs/fluent-ffmpeg` (workspace:*) - 视频/音频后端
- `sharp` - 图像后端（可选，动态导入）

#### 后端适配器

- **fluent-ffmpeg**: 处理视频和音频
- **sharp**: 处理图像

#### 导出 API

```typescript
// 执行
export async function execute(
    compiledCode: string,
    context: ExecutionContext
): Promise<Result>;

// 后端
export interface Backend {
    name: string;
    supportedTypes: readonly MediaType[];
    canHandle(operation: Operation, mediaType: string): boolean;
    execute(operation: Operation, context: ExecutionContext): Promise<Result>;
}
```

#### 使用场景

```typescript
import { execute } from "@affectjs/runtime";

const result = await execute(compiledCode, {
    input: "input.mp4",
    output: "output.mp4",
    mediaType: "video",
    operations: [...],
});
```

### 5. @affectjs/affect

**职责**: Affect CLI - 运行 affect DSL 的简单方式

#### 核心功能

- `setup` 命令：调用 `@affectjs/fluent-setup` 来设置 FFmpeg 环境
- `run` 命令：运行 `.affect` DSL 文件
- `compile` 命令：编译 `.affect` DSL 文件到 JavaScript

#### CLI 命令

```bash
affect [command] [options]
```

#### 依赖

- `@affectjs/fluent-setup` (workspace:*) - 用于 FFmpeg 设置
- `@affectjs/dsl` (workspace:*) - 用于 DSL 编译
- `@affectjs/runtime` (workspace:*) - 用于 DSL 执行
- `yaml` - 用于旧版 DSL 格式支持（动态导入）

#### 命令详解

##### `affect setup`

设置 FFmpeg 环境：

```bash
affect setup [options]
```

选项：
- `-i, --install`: 自动安装/升级 ffmpeg
- `-s, --silent`: 抑制非错误输出
- `--check-only`: 仅检查环境，不安装
- `--json`: 输出 JSON 格式

##### `affect run`

运行 `.affect` DSL 文件：

```bash
affect run <dsl-file> [options]
```

选项：
- `-o, --output <path>`: 输出文件路径（覆盖 DSL 输出）
- `-s, --silent`: 抑制输出
- `--no-setup`: 跳过 FFmpeg 设置检查

##### `affect compile`

编译 `.affect` DSL 文件到 JavaScript：

```bash
affect compile <dsl-file> [options]
```

选项：
- `-o, --output <path>`: 输出文件路径（默认：输入文件名.js）

## 依赖关系图

```
@affectjs/affect
├── @affectjs/fluent-setup (setup FFmpeg)
├── @affectjs/dsl (compile DSL)
└── @affectjs/runtime (execute DSL)
    └── @affectjs/fluent-ffmpeg (video/audio backend)
        └── @affectjs/fluent-setup (prepare FFmpeg 6.1.*)

@affectjs/fluent-ffmpeg
└── @affectjs/fluent-setup (prepare FFmpeg 6.1.*)

@affectjs/dsl
└── (无依赖)

@affectjs/fluent-setup
└── (无依赖)
```

### 依赖说明

1. **@affectjs/affect** 是顶层包，组合了所有功能
2. **@affectjs/runtime** 是运行时引擎，依赖后端适配器
3. **@affectjs/fluent-ffmpeg** 依赖 **@affectjs/fluent-setup** 来准备 FFmpeg
4. **@affectjs/dsl** 和 **@affectjs/fluent-setup** 是独立包，无依赖

## 使用流程

### 场景 1: 设置 FFmpeg 环境

```bash
# 方式 1: 使用 affect CLI（推荐）
affect setup

# 方式 2: 直接使用 fluent-setup
fluent-setup setup

# 方式 3: 通过 fluent-ffmpeg（自动调用 fluent-setup）
cd packages/@affectjs/fluent-ffmpeg
pnpm prepare
```

### 场景 2: 运行 Affect DSL

```bash
# 使用 affect CLI（推荐）
affect run video.affect

# 或者编译后手动执行
affect compile video.affect
node video.js
```

### 场景 3: 程序化使用

```typescript
// 1. 设置 FFmpeg
import { setup } from "@affectjs/fluent-setup";
await setup({ required: true });

// 2. 编译 DSL
import { compileDslFile } from "@affectjs/dsl";
const jsCode = await compileDslFile("video.affect");

// 3. 执行
import { execute } from "@affectjs/runtime";
const result = await execute(jsCode, {
    input: "input.mp4",
    output: "output.mp4",
    mediaType: "video",
    operations: [...],
});
```

## 架构原则

### 1. 单一职责

每个包只负责一个明确的功能领域，避免职责重叠。

### 2. 依赖最小化

包之间的依赖关系清晰且最小化，避免循环依赖和不必要的依赖。

### 3. 可组合性

包可以独立使用，也可以组合使用，提供灵活的使用方式。

### 4. 向后兼容

保持 API 的稳定性，避免破坏性变更。

### 5. 清晰边界

包之间的边界清晰，通过明确的接口进行通信。

## 实现细节

### 动态导入

某些依赖使用动态导入以避免不必要的加载：

```typescript
// sharp 后端使用动态导入
const sharp = await import("sharp");

// yaml 使用动态导入（旧版 DSL 支持）
const yaml = require("yaml");
```

### 环境变量

FFmpeg 路径通过环境变量配置：

- `FFMPEG_PATH`: FFmpeg 可执行文件路径
- `FFPROBE_PATH`: FFprobe 可执行文件路径

这些变量由 `@affectjs/fluent-setup` 自动配置。

### 版本要求

- **FFmpeg**: 必须为 6.1.* 版本
- **Node.js**: >= 18

## 未来扩展

### 可能的扩展点

1. **新的后端适配器**: 可以添加新的后端适配器（如 OpenCV、ImageMagick）
2. **新的 DSL 语法**: 可以扩展 DSL 语法以支持更多操作
3. **新的 CLI 命令**: 可以添加新的 CLI 命令（如 `affect validate`）
4. **插件系统**: 可以添加插件系统以支持自定义操作

### 扩展原则

- 保持向后兼容
- 遵循单一职责原则
- 最小化依赖关系
- 提供清晰的接口

## 总结

AffectJS 的架构设计遵循以下核心原则：

1. **单一职责**: 每个包只负责一个明确的功能
2. **依赖最小化**: 包之间的依赖关系清晰且最小化
3. **可组合性**: 包可以独立使用，也可以组合使用
4. **向后兼容**: 保持 API 的稳定性

这种架构设计使得 AffectJS 具有良好的可维护性、可扩展性和可测试性。

