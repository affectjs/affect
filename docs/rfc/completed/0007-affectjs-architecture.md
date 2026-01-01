# RFC-007: AffectJS 架构设计

**状态**: ✅ Completed  
**日期**: 2025-12-30  
**完成日期**: 2025-12-30  
**作者**: Albert Li  
**相关问题**: 澄清 AffectJS 项目的整体架构、包职责划分和依赖关系

## 摘要

本文档描述了 **AffectJS** 项目的整体架构设计，包括：

1. **包职责划分**: 每个包的明确职责和边界
2. **依赖关系**: 包之间的依赖关系图
3. **架构原则**: 设计原则和最佳实践

## 包架构详解

### 1. @affectjs/core

**职责**: 定义核心接口和类型

#### 核心导出

- `Runtime` 接口
- `InputSource` 类型
- `ExecutionResult` 类型

### 2. @affectjs/runtime-node (原 @affectjs/runtime)

**职责**: Node.js/Bun 服务端运行时引擎

#### 核心功能

- 实现 `Runtime` 接口
- 集成 `fluent-ffmpeg` 和 `sharp`
- 支持本地文件 IO 和 Buffer

### 3. @affectjs/runtime-browser

**职责**: 浏览器运行时引擎 (WASM)

#### 核心功能

- 实现 `Runtime` 接口
- 集成 `ffmpeg.wasm` 和 `sharp.wasm`
- 支持 `Blob`/`File` 输入

### 4. @affectjs/fluent-setup

**职责**: FFmpeg 环境设置

### 5. @affectjs/fluent-ffmpeg

**职责**: Typed FFmpeg Fluent API

### 6. @affectjs/dsl

**职责**: DSL 解析器和编译器

### 7. @affectjs/affect (CLI)

**职责**: 命令行工具，聚合所有功能

## 依赖关系图

```
@affectjs/affect (CLI)
├── @affectjs/dsl
└── @affectjs/runtime-node
    ├── @affectjs/core
    └── @affectjs/fluent-ffmpeg
        └── @affectjs/fluent-setup

@affectjs/runtime-browser
└── @affectjs/core
```

## 总结

架构已重构为基于 `@affectjs/core` 的多运行时模式，支持 Node 和 Browser 环境。
