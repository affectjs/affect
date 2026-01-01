# RFC 文档索引

本文档列出了 AffectJS 项目的所有 RFC（Request for Comments）文档。

## 进行中的 RFC

### [RFC-001: Fluent FFmpeg CLI 工具](./0001-fluent-ffmpeg-cli.md)

**状态**: In Progress  
**日期**: 2024-12-29  
**作者**: Albert Li  
**摘要**: 从 CommonJS `setup.js` 脚本迁移到现代 TypeScript CLI 工具，用于设置和验证 FFmpeg 环境。

### [RFC-002: Examples 迁移到 Affect DSL](./0002-web-ui-server.md)

**状态**: 计划中  
**日期**: 2025-12-29  
**作者**: Albert Li  
**摘要**: 将 examples 目录下的旧 fluent-ffmpeg 代码迁移到 Affect DSL，展示 DSL 的强大功能并提供参考文档。

### [RFC-003: 浏览器运行时（ffmpeg.wasm + sharp.wasm）](./0003-browser-runtime.md)

**状态**: 计划中  
**日期**: 2025-12-29  
**作者**: Albert Li  
**摘要**: 构建浏览器运行时，支持在浏览器中执行 Affect DSL，使用 ffmpeg.wasm 和 sharp.wasm 提供高性能处理。

### [RFC-004: 视频编辑器高级功能](./0004-video-editor-advanced.md)

**状态**: 计划中  
**日期**: 2024-12-29  
**作者**: AI Assistant  
**摘要**: 视频编辑器的高级功能，包括关键帧动画、颜色校正、音频混音等。

### [RFC-008: Affect 快速视频编辑器](./0008-affect-video-editor.md)

**状态**: 计划中  
**日期**: 2025-12-29  
**作者**: Albert Li  
**摘要**: 基于 Affect DSL 的快速视频编辑器，采用 Bun + Elysia 服务器端和 React 客户端，支持浏览器预览（ffmpeg.wasm）和服务器端渲染。

### [RFC-009: 浏览器预览运行时（ffmpeg.wasm + sharp.wasm）](./0009-browser-preview-runtime.md)

**状态**: 计划中  
**日期**: 2025-12-29  
**作者**: Albert Li  
**摘要**: 为 RFC-008 视频编辑器构建浏览器预览运行时，支持在浏览器中使用 ffmpeg.wasm 和 sharp.wasm 进行实时预览。

### [RFC-010: Affect Agent - LLM 驱动的 DSL 生成和优化](./0010-affect-agent.md)

**状态**: 计划中  
**日期**: 2025-12-29  
**作者**: Albert Li  
**摘要**: 使用 LLM 基于用户输入和现有 DSL 创建/更新 DSL，提供智能的 DSL 生成、更新和优化功能。

### [RFC-011: Monaco DSL 代码编辑器](./0011-monaco-dsl-editor.md)

**状态**: 计划中  
**日期**: 2025-12-29  
**作者**: Albert Li  
**摘要**: 基于 Monaco Editor 构建专业的 DSL 代码编辑器，提供语法高亮、自动补全、错误检测等功能。

### [RFC-012: React Flow DSL 可视化编辑器](./0012-react-flow-visual-editor.md)

**状态**: 计划中  
**日期**: 2025-12-29  
**作者**: Albert Li  
**摘要**: 基于 React Flow 构建 DSL 可视化编辑器，通过拖拽节点和连接来创建和编辑 Affect DSL。

### [RFC-013: Affect Edge - 边缘函数 JavaScript 代码生成器](./0013-dsl-compiler-js.md)

**状态**: 计划中  
**日期**: 2025-12-29  
**作者**: Albert Li  
**摘要**: 创建独立的 `@affectjs/affect-edge` 包，将 Affect DSL 编译为可在边缘函数运行时执行的 JavaScript 代码，**主要目标是支持 Vercel Edge Functions**，同时也支持 Cloudflare Workers、Deno Edge、AWS Lambda@Edge 等，CLI 通过 `--to-edge --target <runtime>` 选项支持。

## 已完成的 RFC

### [RFC-004: @affectjs/dsl - 统一媒体处理 DSL](./completed/0004-fluent-ffmpeg-dsl.md) ✅

**状态**: ✅ Completed  
**日期**: 2024-12-29  
**完成日期**: 2025-12-29  
**作者**: Albert Li  
**摘要**: 统一的领域特定语言（DSL），用于描述视频、音频和图像的处理过程。该 DSL 设计为 AI 友好、抽象化、多后端支持。

**完成内容**:

- ✅ 核心语法（Peggy 解析器、AST 结构、编译器框架）
- ✅ 统一操作支持（resize, encode, filter, crop, rotate）
- ✅ 分组命令语法（video {}, audio {}, filter {}）
- ✅ 条件逻辑（if/else）支持
- ✅ 后端适配器（在 @affectjs/runtime 中实现）

### [RFC-005: @affectjs/runtime-node - Node.js 兼容运行时引擎](./completed/0005-node-runtime.md) ✅

**状态**: ✅ Completed  
**日期**: 2024-12-29  
**完成日期**: 2025-12-29  
**作者**: Albert Li  
**摘要**: 统一的媒体处理运行时引擎，用于执行由 `@affectjs/dsl` 编译生成的代码。

**完成内容**:

- ✅ 核心运行时架构（适配器模式）
- ✅ fluent-ffmpeg 和 sharp 适配器（完整实现）
- ✅ 格式支持声明和基于格式的后端选择
- ✅ 进度追踪功能（fluent-ffmpeg 和 sharp）
- ✅ 并行处理优化（affectBatch parallel 模式）
- ✅ 条件逻辑支持（if/else）
- ✅ 批量处理（affectBatch）
- ✅ 执行编译后的 DSL 操作（execute）

### [RFC-007: AffectJS 架构设计](./completed/0007-affectjs-architecture.md) ✅

**状态**: ✅ Completed  
**日期**: 2025-12-29  
**完成日期**: 2025-12-29  
**作者**: Albert Li  
**摘要**: 澄清 AffectJS 项目的整体架构、包职责划分和依赖关系。

**完成内容**:

- ✅ 包职责划分（fluent-setup, fluent-ffmpeg, dsl, affect, cli）
- ✅ 依赖关系图
- ✅ 架构原则（单一职责、依赖最小化、可组合性、向后兼容）
- ✅ 使用流程和场景
- ✅ 实现细节和未来扩展

## RFC 编号说明

- **RFC-001**: Fluent FFmpeg CLI 工具
- **RFC-002**: Examples 迁移到 Affect DSL
- **RFC-003**: 浏览器运行时（通用基础，供 RFC-008/009 使用）
- **RFC-004**: DSL 设计（已完成）和视频编辑器高级功能（计划中）
- **RFC-005**: AffectJS 运行时引擎（已完成）
- **RFC-006**: 视频编辑器高级功能
- **RFC-007**: AffectJS 架构设计（已完成）
- **RFC-008**: Affect 快速视频编辑器（计划中）
- **RFC-009**: 浏览器预览运行时（计划中）
- **RFC-010**: Affect Agent - LLM 驱动的 DSL 生成和优化（计划中）
- **RFC-011**: Monaco DSL 代码编辑器（计划中）
- **RFC-012**: React Flow DSL 可视化编辑器（计划中）
- **RFC-013**: Affect Edge - 边缘函数 JavaScript 代码生成器（计划中）

## 如何创建新的 RFC

1. 在 `docs/rfc/` 目录下创建新的 RFC 文件，命名格式：`XXXX-description.md`
2. 使用递增的编号（下一个可用编号）
3. 在文件开头包含以下元数据：
   - 状态（In Progress / 计划中 / Completed）
   - 日期
   - 作者
   - 相关问题
4. 更新本 README 文件，将新 RFC 添加到相应分类中

## 状态说明

- **计划中**: RFC 已提出，但尚未开始实施
- **In Progress**: RFC 正在实施中
- **Completed**: RFC 已完成实施
- **Deprecated**: RFC 已被废弃，不再使用，请参考替代方案
