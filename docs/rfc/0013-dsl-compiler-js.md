# RFC-013: Affect Edge - 边缘函数 JavaScript 代码生成器

**状态**: 计划中  
**日期**: 2025-12-29  
**作者**: Albert Li  
**相关问题**: 提供将 Affect DSL 编译为可执行 JavaScript 代码的能力，专门针对边缘函数运行时（Vercel Edge Functions、Deno Edge、Cloudflare Workers 等）

## 摘要

本文档描述了 **@affectjs/edge**，一个独立的包，用于将 Affect DSL 编译为可在边缘函数运行时执行的 JavaScript 代码。这个包与 `@affectjs/dsl` 的 Operation[] 编译方式互补，**专门设计用于边缘函数部署**，如 Vercel Edge Functions、Deno Edge、Cloudflare Workers、AWS Lambda@Edge 等。

## 动机

虽然 `@affectjs/dsl` 现在采用数据优先的方式（编译为 Operation[]），但在边缘函数场景下，用户需要：

1. **边缘函数运行时支持**：
   - **Deno Edge**: Deno Deploy 的边缘运行时
   - **Cloudflare Workers**: Cloudflare 的边缘计算平台
   - **Vercel Edge Functions**: Vercel 的边缘函数
   - **AWS Lambda@Edge**: AWS 的边缘计算
   - **其他边缘运行时**: 任何支持 JavaScript 但限制 Node.js API 的环境

2. **边缘运行时的限制**：
   - 不支持 Node.js 的 `require()` 或完整的模块系统
   - 有限的 API 支持（无文件系统、无进程管理等）
   - 严格的资源限制（CPU、内存、执行时间）
   - 需要自包含的代码（不能依赖外部模块）

3. **代码生成需求**：
   - 生成自包含的 JavaScript 代码
   - 适配不同边缘运行时的 API
   - 支持边缘运行时的特定导入方式（如 Cloudflare Workers 的 `import`）
   - 优化代码大小和执行性能

## 核心设计原则

### 1. 边缘函数优先

- **主要目标**：生成可在边缘运行时执行的代码
- **自包含代码**：生成的代码不依赖 Node.js 特定的 API
- **运行时适配**：支持多种边缘运行时的特定要求

### 2. 独立包设计

- `@affectjs/edge` 是一个独立的包，不依赖 `@affectjs/dsl` 的核心编译逻辑
- 可以独立安装和使用
- 与 `@affectjs/dsl` 的 Operation[] 编译方式并行存在

### 3. 基于 AST 的编译

- 复用 `@affectjs/dsl` 的解析器（Peggy 生成的 AST）
- 从 AST 直接生成 JavaScript 代码
- 不依赖 Operation[] 中间格式

### 4. 多运行时支持

- **Deno Edge**: 生成符合 Deno Deploy 要求的代码
- **Cloudflare Workers**: 生成符合 Workers API 的代码
- **Vercel Edge Functions**: 生成符合 Vercel Edge Runtime 的代码
- **通用 ESM**: 生成标准的 ES Module 代码
- **可扩展**: 支持添加新的运行时适配器

## 架构设计

### 包结构

```
@affectjs/edge/
├── src/
│   ├── index.ts              # 主入口
│   ├── compiler.ts            # JavaScript 代码生成器
│   ├── codegen/               # 代码生成工具
│   │   ├── vercel.ts         # Vercel Edge Functions 代码生成
│   │   ├── deno.ts           # Deno Edge 代码生成
│   │   ├── cloudflare.ts     # Cloudflare Workers 代码生成
│   │   ├── aws-lambda.ts     # AWS Lambda@Edge 代码生成
│   │   └── generic.ts        # 通用边缘运行时代码生成
│   ├── bundler.ts            # 依赖打包工具
│   └── types.ts              # 类型定义
├── package.json
└── README.md
```

### 依赖关系

```
@affectjs/edge
├── @affectjs/dsl (仅用于 AST 类型和解析器)
└── 无运行时依赖（纯编译时工具）
```

### 核心 API

```typescript
import { compileToEdge, compileFileToEdge } from '@affectjs/edge';

// 编译 DSL 字符串为边缘函数 JavaScript 代码
const jsCode = compileToEdge(dslContent, {
    target: 'vercel', // 'vercel' | 'deno' | 'cloudflare' | 'aws-lambda' | 'generic'
    minify: false,
    bundle: true,     // 是否打包依赖（边缘运行时必需，默认: true）
});

// 编译 DSL 文件为边缘函数 JavaScript 文件
const jsCode = compileFileToEdge('video.affect', {
    target: 'vercel',  // Vercel Edge Functions
    output: 'api/process.js',
    minify: true,     // 边缘运行时通常需要压缩
});
```

## 功能设计

### 1. 边缘函数代码生成

#### Vercel Edge Functions 格式（主要目标）

```javascript
// 生成的代码示例（Vercel Edge Runtime）
export const config = {
    runtime: 'edge',
};

export default async function handler(request) {
    const input = await request.arrayBuffer();
    
    // 使用内联的 affect 运行时（已打包）
    const result = await processMedia(input, {
        operations: [
            { type: 'resize', width: 1280, height: 720 },
            { type: 'encode', codec: 'h264', param: 2000 },
        ],
    });
    
    return new Response(result, {
        headers: { 'Content-Type': 'video/mp4' },
    });
}

// 内联的媒体处理逻辑（不依赖外部模块）
async function processMedia(input, config) {
    // ... 打包的运行时代码，使用 Web API ...
}
```

#### Cloudflare Workers 格式

```javascript
// 生成的代码示例（Cloudflare Workers）
export default {
    async fetch(request, env, ctx) {
        const input = await request.arrayBuffer();
        
        const result = await processMedia(input, {
            operations: [
                { type: 'resize', width: 1280, height: 720 },
            ],
        });
        
        return new Response(result, {
            headers: { 'Content-Type': 'video/mp4' },
        });
    },
};

// 内联的媒体处理逻辑
async function processMedia(input, config) {
    // ... 打包的运行时代码 ...
}
```

#### Deno Edge 格式

```javascript
// 生成的代码示例（Deno Deploy）
export default async function handler(request) {
    const input = await request.arrayBuffer();
    
    const result = await processMedia(input, {
        operations: [
            { type: 'resize', width: 1280, height: 720 },
        ],
    });
    
    return new Response(result, {
        headers: { 'Content-Type': 'video/mp4' },
    });
}

// 内联的媒体处理逻辑
async function processMedia(input, config) {
    // ... 打包的运行时代码，使用 Deno 兼容的 API ...
}
```

#### 通用边缘运行时格式

```javascript
// 生成的代码示例（通用 ESM，适用于大多数边缘运行时）
export async function processMedia(input, config) {
    // 自包含的媒体处理逻辑
    // 不依赖 Node.js API
    // 使用 Web API（如 fetch, ArrayBuffer 等）
    
    const operations = config.operations;
    let result = input;
    
    for (const op of operations) {
        if (op.type === 'resize') {
            result = await resize(result, op.width, op.height);
        } else if (op.type === 'encode') {
            result = await encode(result, op.codec, op.param);
        }
    }
    
    return result;
}
```

### 2. 条件逻辑支持

```javascript
// DSL
affect video "input.mp4" "output.mp4" {
    if width > 1920 {
        resize 1920 auto
    }
    encode h264 2000
}

// 生成的 JavaScript
const { affect } = require('@affectjs/runtime');

(async function() {
    const metadata = await affect('input.mp4').getMetadata();
    let result = affect('input.mp4');
    
    if (metadata.width > 1920) {
        result = result.resize(1920, 'auto');
    }
    
    result = result.encode('h264', 2000)
        .save('output.mp4');
    
    const finalResult = await result.execute();
    return finalResult;
})();
```

### 3. 上下文变量支持

```javascript
// DSL with variables
affect auto $input $output {
    resize 1280 720
}

// 生成的 JavaScript (with context)
const { affect } = require('@affectjs/runtime');

async function execute(context = {}) {
    const input = context.input || 'input.mp4';
    const output = context.output || 'output.mp4';
    
    const result = await affect(input)
        .resize(1280, 720)
        .save(output)
        .execute();
    
    return result;
}

module.exports = execute;
```

### 4. 代码优化选项

- **Minify**: 压缩生成的代码（移除注释、空白等）
- **Pretty Print**: 格式化代码（缩进、换行）
- **Source Maps**: 生成 source map 文件

## CLI 集成

### CLI 命令扩展

在 `@affectjs/cli` 中添加对边缘函数编译的支持：

```bash
# 编译为边缘函数 JavaScript (默认: Vercel)
affect compile video.affect --to-edge

# 指定目标运行时
affect compile video.affect --to-edge --target vercel
affect compile video.affect --to-edge --target cloudflare
affect compile video.affect --to-edge --target deno

# 指定输出文件
affect compile video.affect --to-edge -o api/process.js

# 压缩输出（边缘运行时推荐）
affect compile video.affect --to-edge --minify
```

### CLI 选项

- `--to-edge`: 编译为边缘函数 JavaScript 代码（而不是 JSON）
- `--target <vercel|cloudflare|deno|aws-lambda|generic>`: 指定目标边缘运行时（默认: vercel）
- `--minify`: 压缩生成的代码（边缘运行时推荐，默认: false）
- `--bundle`: 打包依赖到生成的代码中（边缘运行时必需，默认: true）
- `--source-map`: 生成 source map 文件（用于调试）

## 实现计划

### 阶段 1: 核心编译器（Vercel Edge 支持）

1. 创建 `@affectjs/edge` 包
2. 实现基础的 AST 到 JavaScript 代码生成
3. **优先支持 Vercel Edge Functions**（主要目标）
4. 实现依赖打包（将运行时内联）
5. 支持基本的操作（resize, encode, filter, crop, rotate, save）

**预计时间**: 2-3 周

### 阶段 2: 多运行时支持

1. 添加 Cloudflare Workers 支持
2. 添加 Deno Edge 支持
3. 添加 AWS Lambda@Edge 支持
4. 实现通用边缘运行时适配器
5. 实现条件逻辑（if/else）的代码生成
6. 支持上下文变量

**预计时间**: 2-3 周

### 阶段 3: CLI 集成和优化

1. 在 `@affectjs/affect` 中添加 `--to-edge` 选项
2. 支持目标运行时选择（`--target vercel|cloudflare|deno|...`）
3. 支持代码优化选项（minify, bundle）
4. 更新 CLI 文档和示例

**预计时间**: 1 周

### 阶段 4: 测试和文档

1. 编写单元测试（覆盖率 ≥ 80%）
2. 编写集成测试
3. 更新 README 和示例
4. 编写迁移指南

**预计时间**: 1 周

## 技术栈

- **TypeScript**: 类型安全的实现
- **@affectjs/dsl**: 复用 AST 类型和解析器
- **无运行时依赖**: 纯编译时工具
- **代码打包**: 将运行时依赖内联到生成的代码中（边缘运行时必需）
- **Web API 优先**: 生成的代码优先使用 Web 标准 API，而非 Node.js API

## 使用场景

### 1. Vercel Edge Functions 部署（主要场景）

```bash
# 编译 DSL 为 Vercel Edge Function 代码
affect compile video.affect --to-edge --target vercel -o api/process.js

# 部署到 Vercel
vercel deploy
```

生成的代码可以直接部署到 Vercel Edge Functions，无需额外配置。

### 2. Cloudflare Workers 部署

```bash
# 编译 DSL 为 Cloudflare Workers 代码
affect compile video.affect --to-edge --target cloudflare -o worker.js

# 部署到 Cloudflare Workers
wrangler deploy worker.js
```

### 3. Deno Deploy 部署

```bash
# 编译 DSL 为 Deno Edge 代码
affect compile video.affect --to-edge --target deno -o handler.ts

# 部署到 Deno Deploy
deployctl deploy --project=my-project handler.ts
```

### 4. AWS Lambda@Edge 部署

```bash
# 编译 DSL 为 AWS Lambda@Edge 代码
affect compile video.affect --to-edge --target aws-lambda -o handler.js

# 部署到 AWS Lambda@Edge
aws lambda update-function-code ...
```

### 5. 通用边缘运行时

```bash
# 编译为通用边缘运行时代码（适用于大多数边缘运行时）
affect compile video.affect --to-edge --target generic -o handler.js

# 可以在任何支持 Web API 的边缘运行时中使用
```

### 6. 代码审查和调试

```bash
# 生成可读的 JavaScript 代码用于审查
affect compile video.affect --to-edge --target vercel -o video.js

# 查看生成的代码
cat video.js
```

## 与现有包的关系

### @affectjs/dsl

- `@affectjs/dsl` 继续专注于 Operation[] 编译（数据优先）
- `@affectjs/edge` 专注于边缘函数 JavaScript 代码生成
- 两者共享 AST 类型定义和解析器

### @affectjs/affect

- CLI 支持两种编译模式：
  - 默认：编译为 Operation[]（JSON 格式）
  - `--to-edge`：编译为边缘函数 JavaScript 代码

### @affectjs/affect

- 生成的 JavaScript 代码内联 `@affectjs/runtime` 的核心运行时逻辑
- 打包后的代码不依赖外部模块，适合边缘运行时
- 使用 Web API 而非 Node.js API，确保边缘运行时兼容性

## 测试计划

### 单元测试

- AST 节点到 JavaScript 代码的转换
- 不同操作类型的代码生成
- 条件逻辑的代码生成
- 上下文变量的处理

### 集成测试

- 完整的 DSL 文件编译
- 生成的代码可执行性验证
- CLI 命令集成测试

### 端到端测试

- 编译 → 执行 → 验证结果
- 不同格式（CJS/ESM）的兼容性测试

## 使用示例

### 在 Vercel 项目中使用

1. 安装包：
   ```bash
   pnpm add @affectjs/edge
   ```

2. 编译 DSL 文件：
   ```bash
   affect compile video.affect --to-edge --target vercel -o api/process.js
   ```

3. 部署到 Vercel：
   ```bash
   vercel deploy
   ```

### 在代码中使用

```typescript
import { compileFileToEdge } from '@affectjs/edge';

// 编译 DSL 文件为 Vercel Edge Function
const jsCode = compileFileToEdge('video.affect', {
    target: 'vercel',
    output: 'api/process.js',
    minify: true,
});
```

## 边缘运行时的特殊考虑

### 1. API 兼容性

- **Web API 优先**: 使用 `fetch`, `ArrayBuffer`, `Blob` 等 Web 标准 API
- **避免 Node.js API**: 不使用 `fs`, `path`, `process` 等 Node.js 特定 API
- **运行时检测**: 生成的代码可以检测运行环境并适配

### 2. 依赖打包

- **内联运行时**: 将 `@affectjs/runtime` 的核心逻辑打包到生成的代码中
- **Tree Shaking**: 只包含实际使用的功能
- **代码优化**: 移除未使用的代码，减小文件大小

### 3. 资源限制

- **内存优化**: 生成的代码考虑边缘运行时的内存限制
- **执行时间**: 优化代码以减少执行时间
- **文件大小**: 压缩和优化生成的代码

### 4. 运行时适配器

每个边缘运行时可能需要特定的适配器：

- **Cloudflare Workers**: 使用 Workers API（如 `env` 绑定）
- **Deno Edge**: 使用 Deno 特定的 API（如 `Deno.readFile`）
- **Vercel Edge**: 遵循 Vercel Edge Runtime 的限制
- **通用边缘**: 使用纯 Web API，最大兼容性

## 未来扩展

### 可能的增强

1. **更多边缘运行时支持**: AWS Lambda@Edge, Fastly Compute@Edge 等
2. **TypeScript 输出**: 生成 TypeScript 代码而不是 JavaScript
3. **代码分析**: 静态分析生成的代码，提供优化建议
4. **插件系统**: 允许自定义代码生成逻辑
5. **运行时检测**: 自动检测运行环境并选择最佳适配器
6. **性能优化**: 针对边缘运行时的特定优化（如 WASM 支持）

## 相关 RFC

- [RFC-004: @affectjs/dsl - 统一媒体处理 DSL](./completed/0004-fluent-ffmpeg-dsl.md)
- [RFC-005: @affectjs/runtime - AffectJS 运行时引擎](./0005-affectjs-runtime.md)
- [RFC-007: AffectJS 架构](./0007-affectjs-architecture.md)

## 总结

`@affectjs/edge` 提供了一个专门为边缘函数运行时设计的 DSL 到 JavaScript 编译解决方案。**主要目标是支持 Vercel Edge Functions**，同时也支持其他边缘运行时（Cloudflare Workers、Deno Edge、AWS Lambda@Edge 等）。

通过将运行时依赖打包到生成的代码中，并使用 Web API 而非 Node.js API，生成的代码可以在各种边缘运行时环境中无缝执行。

通过 CLI 的 `--to-edge` 选项，用户可以轻松地将 Affect DSL 编译为适合边缘函数部署的 JavaScript 代码，实现高性能、低延迟的媒体处理边缘函数。

