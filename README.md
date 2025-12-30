# AffectJS

**AffectJS** 是一个 DSL 驱动的媒体处理工具集，提供统一的领域特定语言（DSL）来描述和处理视频、音频和图像。

## ✨ 核心特性

- 🎬 **DSL 驱动**: 使用简洁、AI 友好的 DSL 描述媒体处理流程
- 🚀 **多后端支持**: 自动选择最适合的后端（fluent-ffmpeg 用于视频/音频，sharp 用于图像）
- 🧠 **智能路由**: 根据媒体类型和操作自动选择最优后端
- ⚡ **统一 API**: 一致的接口，隐藏后端差异
- 🤖 **AI 友好**: DSL 语法接近自然语言，易于 AI 理解和生成

## 📦 Packages

- **[@affectjs/dsl](./packages/@affectjs/dsl)** - 统一媒体处理 DSL（视频/音频/图像）- 使用 Peggy 解析器
- **[@affectjs/runtime](./packages/@affectjs/runtime)** - 统一媒体处理运行时引擎 - 集成 fluent-ffmpeg 和 sharp
- **[@affectjs/affect](./packages/@affectjs/affect)** - CLI 工具
- **[@affectjs/examples](./packages/@affectjs/examples)** - 示例代码
- **[@affectjs/fluent-ffmpeg](./packages/@affectjs/fluent-ffmpeg)** - A fluent API to FFMPEG for Node.js

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- FFmpeg (用于视频/音频处理，可选，可通过 CLI 自动安装)

### Installation

```bash
pnpm install
```

### 使用 DSL 处理媒体

#### 1. 编写 DSL 文件

创建一个 `.affect` 文件，例如 `video.affect`:

```dsl
affect video "input.mp4" "output.mp4" {
  resize 1280 720
  encode h264 2000
  encode aac 128
}
```

#### 2. 使用 CLI 执行

```bash
pnpm nx run @affectjs/affect:build
affect video.affect
```

#### 3. 在代码中使用

```typescript
import { affect } from '@affectjs/runtime';
import { compileDslFile, execute } from '@affectjs/dsl';

// 方式 1: 直接使用运行时 API
await affect('input.mp4')
  .resize(1280, 720)
  .encode('h264', 2000)
  .save('output.mp4');

// 方式 2: 编译并执行 DSL
const compiledCode = compileDslFile('video.affect');
await execute(compiledCode);
```

### Setup Environment

```bash
pnpm run setup
```

这将检查 FFmpeg 安装并在需要时帮助您设置。

您也可以使用 CLI 直接执行，并提供额外选项：

```bash
# 仅检查环境
pnpm run setup --check-only

# 自动安装/升级 FFmpeg
pnpm run setup --install

# 获取 JSON 输出
pnpm run setup --json

# 要求 FFmpeg 必须存在（如果未找到则退出并报错）
pnpm run setup --required
```


## 📋 可用命令

### 根级别命令

- `pnpm build` - 构建所有包
- `pnpm test` - 运行所有包的测试
- `pnpm coverage` - 生成覆盖率报告
- `pnpm doc` - 生成文档
- `pnpm run setup` - 运行设置 CLI 以检查/安装 FFmpeg 环境

### Package-Specific Commands

您可以使用 Nx 为特定包运行命令:

```bash
# 构建 DSL 包
pnpm nx build @affectjs/dsl

# 构建运行时包
pnpm nx build @affectjs/runtime

# 运行 DSL 测试
pnpm nx test @affectjs/dsl

# 运行运行时测试
pnpm nx test @affectjs/runtime

# 生成 fluent-ffmpeg 文档
pnpm nx doc @affectjs/fluent-ffmpeg
```

### Nx 命令

- `pnpm nx graph` - 可视化项目依赖关系
- `pnpm nx show projects` - 列出所有项目
- `pnpm nx show project <project-name>` - 显示项目详情

## 🏗️ Project Structure

```
.
├── packages/
│   └── @affectjs/
│       ├── dsl/              # DSL 解析器和编译器
│       ├── affect/           # 运行时引擎
│       ├── cli/              # CLI 工具
│       ├── examples/         # 示例代码
│       └── fluent-ffmpeg/   # Fluent FFmpeg API
├── docs/                     # 文档和 RFC
├── pnpm-workspace.yaml       # pnpm workspace 配置
├── nx.json                   # Nx workspace 配置
└── package.json              # 根 package.json
```

## 📚 Documentation

### 包文档

- [@affectjs/dsl README](./packages/@affectjs/dsl/README.md) - DSL 语法和使用指南
- [@affectjs/runtime README](./packages/@affectjs/runtime/README.md) - 运行时 API 文档
- [@affectjs/affect README](./packages/@affectjs/affect/README.md) - CLI 工具文档
- [@affectjs/fluent-ffmpeg README](./packages/@affectjs/fluent-ffmpeg/README.md) - Fluent FFmpeg API 文档

### RFC 文档

- [RFC-004: DSL 设计](./docs/rfc/0004-fluent-ffmpeg-dsl.md) - DSL 语法和设计理念
- [RFC-005: 运行时引擎](./docs/rfc/0005-affectjs-runtime.md) - 运行时架构和实现

## 🔧 Adding New Packages

1. 在 `packages/@affectjs/` 下创建新目录
2. 为新包添加 `package.json` 和 `project.json`
3. 运行 `pnpm install` 以链接工作区

## 🎯 Nx Features

- **任务缓存**: Nx 自动缓存任务结果以加快构建速度
- **任务调度**: Nx 可以在可能的情况下并行运行任务
- **依赖图**: 可视化项目依赖关系
- **受影响命令**: 仅运行受影响项目的任务

## 📝 License

MIT - 详见 [LICENSE](./LICENSE) 文件

## 🤝 Contributing

欢迎贡献！请查看各个包的 README 以了解贡献指南。

## 🌟 示例

### DSL 示例

```dsl
# 视频处理
affect video "input.mp4" "output.mp4" {
  if width > 1920 {
    resize 1920 auto
  }
  encode h264 2000
  encode aac 128
}

# 图像处理
affect image "photo.jpg" "output.jpg" {
  if width > 1920 {
    resize 1920 1080
  }
  filter grayscale
  encode jpeg 90
}
```

更多示例请查看 [packages/@affectjs/examples](./packages/@affectjs/examples) 目录。