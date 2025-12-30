# RFC-001: Fluent FFmpeg CLI 工具

**状态**: In Progress 
**日期**: 2024-12-29  
**作者**: Albert Li  
**相关问题**: 从 setup.js 迁移到 TypeScript CLI

## 摘要

本文档记录了从 CommonJS `setup.js` 脚本迁移到现代 TypeScript CLI 工具（`@luban-ws/fluent-ffmpeg-cli`）的过程，用于为 `fluent-ffmpeg` 包设置和验证 FFmpeg 环境。

## CLI 范围和职责

**CLI 完全负责确保 FFmpeg 工作环境可用。** `setup` 命令执行以下操作：

1. **FFmpeg 安装和版本管理**：
   - 确保安装 FFmpeg 6.1.*
   - 如果检测到错误版本，自动卸载
   - 如果缺失或版本错误，自动安装正确版本

2. **Shell 环境配置**：
   - **检测 Shell 类型**：自动检测用户的 shell（bash, zsh, fish, PowerShell, cmd.exe）
   - **检测 OS 类型**：识别操作系统（macOS, Linux, Windows）
   - **持久化配置**：将环境变量写入相应的 shell 配置文件：
     - **macOS/Linux bash**: `~/.bashrc` 或 `~/.bash_profile`
     - **macOS/Linux zsh**: `~/.zshrc`
     - **fish**: `~/.config/fish/config.fish`
     - **PowerShell (Windows)**: `$PROFILE` 或 `~/.config/powershell/profile.ps1`
     - **PowerShell Core**: `~/.config/powershell/profile.ps1`
     - **Windows CMD**: 通过注册表设置用户环境变量
   - **立即可用**：使 FFmpeg 在当前和未来的 shell 会话中可用

3. **环境变量**：
   - 设置 `FFMPEG_PATH` 为检测到的/已安装的 FFmpeg 二进制文件路径
   - 设置 `FFPROBE_PATH` 为检测到的/已安装的 ffprobe 二进制文件路径
   - 确保这些变量在所有 shell 会话中可用

4. **验证**：
   - 验证 FFmpeg 版本为 6.1.*
   - 验证 `ffmpeg` 和 `ffprobe` 二进制文件都可访问
   - 如果设置失败，提供清晰的错误消息和安装说明

**目标**：运行 `fluent-ffmpeg-cli setup` 后，FFmpeg 环境应该**立即可用**，无需任何手动配置。

## 动机

1. **代码质量**：用干净的 TypeScript 实现替换混乱的 CommonJS setup 代码
2. **可维护性**：使用现代 ES 模块和 TypeScript 以获得更好的类型安全
3. **Monorepo 集成**：将 CLI 作为工作区包正确集成
4. **版本强制**：严格强制 FFmpeg 6.1.* 版本要求
5. **开发者体验**：为环境设置提供清晰的 CLI 接口

## 设计决策

### 1. CLI 包结构

- **包名**: `@luban-ws/fluent-ffmpeg-cli`
- **构建工具**: Vite（不是 tsc）用于构建 TypeScript
- **模块系统**: 纯 ES 模块（无 CommonJS `require`）
- **命令名**: `fluent-ffmpeg-cli`，带 `setup` 子命令

### 2. 版本要求

- **FFmpeg 版本**: 严格支持 FFmpeg 6.1.*（6.1.0, 6.1.1, 6.1.2, 6.1.3, 6.1.4 等）
- **版本检查**: 默认强制执行，无可选标志
- **自动修复**: 可以使用 `--install` 标志自动卸载并重新安装正确版本

### 3. Shell 支持（核心功能）

**CLI 完全负责 Shell 环境配置，确保 FFmpeg 在所有 shell 会话中可用。**

#### 3.1 支持的 Shell 类型

CLI 自动检测并支持以下 shell：

| Shell | 平台 | 配置文件路径 | 环境变量语法 |
|-------|------|-------------|-------------|
| **bash** | macOS/Linux | `~/.bashrc` 或 `~/.bash_profile` | `export FFMPEG_PATH="..."` |
| **zsh** | macOS/Linux | `~/.zshrc` | `export FFMPEG_PATH="..."` |
| **fish** | macOS/Linux | `~/.config/fish/config.fish` | `set -gx FFMPEG_PATH "..."` |
| **PowerShell** | Windows | `$PROFILE` 或 `~/.config/powershell/profile.ps1` | `$env:FFMPEG_PATH = "..."` |
| **PowerShell Core** | 跨平台 | `~/.config/powershell/profile.ps1` | `$env:FFMPEG_PATH = "..."` |
| **Windows CMD** | Windows | 注册表（用户环境变量） | `setx FFMPEG_PATH "..."` |

#### 3.2 Shell 检测机制

CLI 使用多层检测策略确保准确识别当前 shell：

1. **环境变量检测**:
   - Windows: 检查 `SHELL` 或 `COMSPEC` 环境变量
   - Unix-like: 检查 `SHELL` 环境变量

2. **进程检测**（回退）:
   - 使用 `ps -p $$ -o comm=` 检查父进程
   - 解析进程名称以识别 shell 类型

3. **默认回退**:
   - Windows: 默认使用 PowerShell
   - Unix-like: 默认使用 bash

#### 3.3 配置文件管理

**自动写入机制**:
- CLI 自动检测 shell 类型和 OS
- 确定正确的配置文件路径
- 检查是否已配置（避免重复添加）
- 如果未配置，自动追加环境变量到配置文件
- 为 fish shell 自动创建配置目录（如果不存在）

**配置文件格式**:
- 所有配置块都有明确的标记注释：
  ```bash
  # FFmpeg environment variables (configured by fluent-ffmpeg-cli)
  export FFMPEG_PATH="/path/to/ffmpeg"
  export FFPROBE_PATH="/path/to/ffprobe"
  ```
- 支持后续更新和清理（通过标记识别）

**特殊处理**:

1. **macOS bash**:
   - 优先使用 `~/.bash_profile`（如果存在）
   - 否则使用 `~/.bashrc`

2. **fish shell**:
   - 使用 `set -gx` 语法（全局导出变量）
   - 自动创建 `~/.config/fish/` 目录（如果不存在）

3. **PowerShell**:
   - 首先尝试获取 `$PROFILE` 路径
   - 回退到 PowerShell Core 标准路径
   - 支持 Windows PowerShell 和 PowerShell Core

4. **Windows CMD**:
   - 不使用配置文件（CMD 不支持持久化配置文件）
   - 使用 `setx` 命令通过注册表设置用户环境变量
   - 需要用户重启终端才能生效

#### 3.4 重复预防

CLI 在写入配置前会检查：
- 配置文件是否存在
- 是否已包含相同的环境变量配置
- 如果已配置，跳过写入并提示用户

#### 3.5 用户指导

配置完成后，CLI 会提供清晰的指导：

- **Unix-like shells** (bash, zsh, fish):
  ```
  ✓ Environment variables written to ~/.zshrc
  Please run: source ~/.zshrc
  Or restart your terminal to apply changes.
  ```

- **PowerShell**:
  ```
  ✓ Environment variables written to ~/.config/powershell/profile.ps1
  Please restart your terminal or run: . $PROFILE
  ```

- **Windows CMD**:
  ```
  ✓ Environment variables set via registry
  Please restart your terminal for changes to take effect.
  ```

### 4. 环境变量管理

**CLI 范围**: CLI **完全负责**确保 FFmpeg 工作环境可用。

- **FFmpeg 安装**: 确保 FFmpeg 6.1.* 已安装（如果需要，卸载错误版本）
- **Shell 环境设置**: 自动配置 shell 环境变量（见上述 Shell 支持章节）
- **Node.js 进程**: 在当前进程中设置 `process.env.FFMPEG_PATH` 和 `process.env.FFPROBE_PATH`
- **测试集成**: 在运行测试前自动设置环境变量

### 5. 平台支持

- **macOS**: 使用 Homebrew，支持 keg-only 安装（例如 `ffmpeg@6`）
- **Linux**: 支持 apt-get 和 yum 包管理器
- **Windows**: 支持 winget 和 Chocolatey

### 6. Monorepo 集成

- **根命令**: `pnpm run setup` → `pnpm --filter @luban-ws/fluent-ffmpeg run setup`
- **包命令**: 在 `fluent-ffmpeg` 包中运行 `pnpm run setup`
- **无循环依赖**: CLI 包不依赖 `fluent-ffmpeg` 包

## 实现细节

### 文件结构

```
packages/
├── fluent-ffmpeg-cli/
│   ├── src/
│   │   ├── cli.ts          # CLI 主入口
│   │   ├── setup.ts        # 核心设置逻辑（TypeScript）
│   │   ├── shell-config.ts # Shell 检测和配置文件写入
│   │   ├── types.ts        # TypeScript 类型定义
│   │   └── index.ts        # 包导出
│   ├── scripts/
│   │   └── setup-env.sh    # Shell 环境设置脚本
│   ├── package.json
│   └── vite.config.ts
└── fluent-ffmpeg/
    ├── scripts/
    │   └── setup-env.sh    # 测试环境 Shell 脚本
    ├── test/
    │   └── helpers.js      # 已更新以检查 FFMPEG_PATH
    └── package.json
```

### 关键功能

1. **可执行文件发现**:
   - 首先检查 `FFMPEG_PATH` / `FFPROBE_PATH` 环境变量
   - 在 macOS 上，检查 Homebrew keg-only 路径（`/opt/homebrew/opt/ffmpeg@6/bin/`）
   - 回退到 `which`/`where` 命令

2. **版本检查**:
   - 从 `ffmpeg -version` 输出解析 FFmpeg 版本
   - 验证 major=6, minor=1（任何 patch 版本）
   - 提供清晰的错误消息和安装提示

3. **安装/卸载**:
   - 检测包管理器（brew, apt, yum, winget, choco）
   - 在安装 6.1.* 之前卸载错误版本
   - 使用 ora spinners 显示进度

4. **Shell 环境配置**（✅ 已实现）:

   **核心模块**: `shell-config.ts` 提供完整的 shell 检测和配置功能。

   **主要功能**:
   - **`detectShell()`**: 自动检测当前 shell 类型
     - 检查环境变量（`SHELL`, `COMSPEC`）
     - 使用进程检测作为回退
     - 返回 `ShellType`: `"bash" | "zsh" | "fish" | "powershell" | "cmd" | "unknown"`
   
   - **`getShellConfigPath(shell)`**: 获取 shell 配置文件路径
     - 根据 shell 类型和 OS 返回正确的配置文件路径
     - 处理特殊情况（如 macOS bash 优先使用 `.bash_profile`）
     - 为 fish shell 自动创建配置目录
   
   - **`generateEnvExports(shell, ffmpegPath, ffprobePath)`**: 生成 shell 特定的环境变量导出语句
     - **bash/zsh**: `export FFMPEG_PATH="..."`
     - **fish**: `set -gx FFMPEG_PATH "..."`
     - **PowerShell**: `$env:FFMPEG_PATH = "..."`
     - **CMD**: `set FFMPEG_PATH=...`（用于临时设置）
   
   - **`isEnvConfigured(configPath, ffmpegPath, ffprobePath)`**: 检查环境变量是否已配置
     - 读取配置文件内容
     - 检查是否包含相同的环境变量配置
     - 支持路径格式差异（Windows 路径分隔符）
   
   - **`writeShellConfig(shell, ffmpegPath, ffprobePath)`**: 写入 shell 配置文件
     - 检查是否已配置（避免重复）
     - 读取现有配置内容
     - 追加新的环境变量配置块
     - 确保目录存在
     - 返回操作结果和消息
   
   - **`setWindowsEnvVars(ffmpegPath, ffprobePath)`**: Windows CMD 专用
     - 使用 `setx` 命令通过注册表设置用户环境变量
     - 仅适用于 Windows 平台
     - 需要用户重启终端才能生效

   **配置流程**:
   1. 检测当前 shell 类型
   2. 获取配置文件路径
   3. 检查是否已配置（避免重复）
   4. 生成 shell 特定的环境变量导出语句
   5. 追加到配置文件（带标记注释）
   6. 提供用户指导（source 或重启终端）

   **支持的 Shell 和配置**:
   - **bash** (macOS/Linux): `~/.bashrc` 或 `~/.bash_profile`
   - **zsh** (macOS/Linux): `~/.zshrc`
   - **fish** (macOS/Linux): `~/.config/fish/config.fish`（自动创建目录）
   - **PowerShell** (Windows): `$PROFILE` 或 `~/.config/powershell/profile.ps1`
   - **PowerShell Core** (跨平台): `~/.config/powershell/profile.ps1`
   - **Windows CMD**: 通过注册表设置用户环境变量（使用 `setx`）

   **错误处理**:
   - 如果无法检测 shell，提供手动配置说明
   - 如果配置文件写入失败，提供错误消息和回退方案
   - 对于 Windows CMD，提供系统属性设置说明

5. **测试集成**:
   - `setup-env.sh` 脚本从 CLI JSON 输出设置环境变量
   - 测试脚本在运行测试前 source 此脚本
   - 更新了 `getFfmpegCheck()` 以检查 `FFMPEG_PATH` 环境变量

## API

### CLI 命令

```bash
fluent-ffmpeg-cli setup [options]
```

**选项**:
- `-i, --install`: 如果需要，自动安装/升级 ffmpeg
- `-s, --silent`: 抑制非错误输出
- `--check-only`: 仅检查环境，不安装
- `--json`: 以 JSON 格式输出结果

### 编程 API

```typescript
import { setup, findExecutable, getFfmpegVersion, isVersionSupported } from '@luban-ws/fluent-ffmpeg-cli';

// 设置环境
const config = await setup({
  required: true,
  install: false,
  silent: false
});

// 查找可执行文件
const ffmpegPath = await findExecutable('ffmpeg');

// 获取版本
const version = await getFfmpegVersion(ffmpegPath);

// 检查版本
const supported = isVersionSupported(version);
```

## 迁移路径

### 已移除
- ❌ `packages/fluent-ffmpeg/scripts/setup.js` (CommonJS)
- ❌ `packages/fluent-ffmpeg/scripts/setup.cjs`（如果存在）

### 已添加
- ✅ `packages/fluent-ffmpeg-cli/` (TypeScript CLI 包)
- ✅ `packages/fluent-ffmpeg/scripts/setup-env.sh` (shell 脚本)
- ✅ 更新了 `package.json` 脚本以使用 CLI
- ✅ 更新了测试辅助函数以检查 `FFMPEG_PATH`

## 测试

### 测试结果
- **之前**: 26% 覆盖率，许多测试因缺少 ffmpeg 而失败
- **之后**: 79.42% 覆盖率，228 个测试通过，34 个失败（与环境无关）

### 测试集成
- 测试通过 `setup-env.sh` 自动设置环境变量
- `getFfmpegCheck()` 已更新以检查 `FFMPEG_PATH` 环境变量
- 无需手动环境设置

## 破坏性变更

无。这是一个新包添加，现有功能保持不变。

## Shell 支持实现示例

### 使用场景

**场景 1: macOS 用户使用 zsh**
```bash
$ fluent-ffmpeg-cli setup
检测到 shell: zsh
✓ Environment variables written to ~/.zshrc
请运行: source ~/.zshrc
或重启终端以应用更改
```

**场景 2: Linux 用户使用 bash**
```bash
$ fluent-ffmpeg-cli setup
检测到 shell: bash
✓ Environment variables written to ~/.bashrc
请运行: source ~/.bashrc
或重启终端以应用更改
```

**场景 3: Windows 用户使用 PowerShell**
```powershell
PS> fluent-ffmpeg-cli setup
检测到 shell: powershell
✓ Environment variables written to C:\Users\user\.config\powershell\profile.ps1
请重启终端或运行: . $PROFILE
```

**场景 4: Windows 用户使用 CMD**
```cmd
C:\> fluent-ffmpeg-cli setup
检测到 shell: cmd
✓ Environment variables set via registry
请重启终端以使更改生效
```

### 配置文件示例

**bash/zsh 配置** (`~/.zshrc`):
```bash
# ... 其他配置 ...

# FFmpeg environment variables (configured by fluent-ffmpeg-cli)
export FFMPEG_PATH="/opt/homebrew/opt/ffmpeg@6/bin/ffmpeg"
export FFPROBE_PATH="/opt/homebrew/opt/ffmpeg@6/bin/ffprobe"
```

**fish 配置** (`~/.config/fish/config.fish`):
```fish
# ... 其他配置 ...

# FFmpeg environment variables (configured by fluent-ffmpeg-cli)
set -gx FFMPEG_PATH "/opt/homebrew/opt/ffmpeg@6/bin/ffmpeg"
set -gx FFPROBE_PATH "/opt/homebrew/opt/ffmpeg@6/bin/ffprobe"
```

**PowerShell 配置** (`~/.config/powershell/profile.ps1`):
```powershell
# ... 其他配置 ...

# FFmpeg environment variables (configured by fluent-ffmpeg-cli)
$env:FFMPEG_PATH = "C:\Program Files\ffmpeg\bin\ffmpeg.exe"
$env:FFPROBE_PATH = "C:\Program Files\ffmpeg\bin\ffprobe.exe"
```

## 未来考虑

1. ✅ **Shell 配置自动写入**: ~~根据检测到的 shell 和 OS 自动写入 shell 配置文件~~ **已实现**
2. **版本固定**: 考虑允许配置所需的 FFmpeg 版本
3. **二进制分发**: 考虑捆绑 FFmpeg 二进制文件以便于安装
4. **CI/CD 集成**: 添加 GitHub Actions 工作流以进行自动化测试
5. **文档**: 扩展 README，添加更多示例和故障排除
6. **Shell 检测增强**: 
   - 处理嵌套 shell 场景（例如，在 tmux/screen 中）
   - 支持自定义 shell 路径
   - 检测通过 `sudo` 运行的场景
7. **配置文件备份**: 在修改 shell 配置文件之前创建备份
8. **交互模式**: 在写入 shell 配置文件之前询问用户确认
9. **配置清理**: 提供命令以从配置文件中移除 FFmpeg 环境变量
10. **多 Shell 支持**: 支持同时配置多个 shell（例如，同时配置 bash 和 zsh）
11. **配置验证**: 验证写入的配置是否正确（通过启动新 shell 进程测试）

## 参考资料

- 原始 setup.js 实现
- Homebrew keg-only 包文档
- Node.js child_process 文档
- Commander.js 文档

## 变更日志

### 2024-12-29
- 初始实现
- 从 setup.js 迁移到 TypeScript CLI
- 添加 FFmpeg 6.1.* 版本支持
- 集成测试套件
- 添加 shell 环境变量设置脚本
- **实现完整的 Shell 支持**:
  - 添加 `shell-config.ts` 模块，提供完整的 shell 检测和配置功能
  - 支持 6 种 shell: bash, zsh, fish, PowerShell, PowerShell Core, Windows CMD
  - 自动检测 shell 类型（环境变量 + 进程检测）
  - 自动确定配置文件路径（根据 shell 和 OS）
  - 生成 shell 特定的环境变量导出语句
  - 重复预防机制（检查是否已配置）
  - 自动创建必要的目录（如 fish 配置目录）
  - Windows CMD 特殊处理（使用注册表）
  - 清晰的用户指导（source 或重启终端）
- **Shell 配置功能**:
  - `detectShell()`: 多层检测策略
  - `getShellConfigPath()`: 智能路径确定
  - `generateEnvExports()`: Shell 特定语法生成
  - `isEnvConfigured()`: 重复检查
  - `writeShellConfig()`: 安全写入配置
  - `setWindowsEnvVars()`: Windows 注册表设置
- 所有支持的 shell 的自动检测和配置
- 为用户提供清晰的说明以应用更改
