# RFC-010: Affect Agent - LLM 驱动的 DSL 生成和优化

**状态**: 计划中  
**日期**: 2025-12-29  
**作者**: Albert Li  
**相关议题**: 使用 LLM 基于用户输入和现有 DSL 创建/更新 DSL，提供更好的使用体验

## 摘要

本文档描述了 **Affect Agent** 的设计和实现，这是一个 LLM 驱动的智能代理，可以根据用户的自然语言输入和现有的 Affect DSL 代码，自动生成、更新和优化 DSL。Agent 利用大语言模型（LLM）理解用户意图，生成符合 Affect DSL 语法的代码，并提供优化建议。

**与相关 RFC 的关系**:
- **基于**: [RFC-004: @affectjs/dsl](./completed/0004-fluent-ffmpeg-dsl.md) - 使用 DSL 解析器和验证器
- **服务于**: [RFC-008: Affect 快速视频编辑器](./0008-affect-video-editor.md) - 为编辑器提供智能 DSL 生成功能
- **定位**: 作为智能层，连接用户意图和 DSL 代码

**核心特性**:
- 🤖 **LLM 驱动**: 使用大语言模型理解用户意图并生成 DSL
- 📝 **DSL 生成**: 从自然语言自动生成 Affect DSL 代码
- 🔄 **DSL 更新**: 基于现有 DSL 和用户需求更新代码
- ✨ **DSL 优化**: 分析现有 DSL 并提供优化建议
- 🎯 **上下文感知**: 理解现有 DSL 上下文，生成一致的代码
- 🔍 **错误检测**: 检测 DSL 错误并提供修复建议

## 动机

1. **降低使用门槛**: 让非技术用户也能通过自然语言使用 Affect DSL
2. **提高效率**: 自动生成 DSL 代码，减少手动编写时间
3. **智能优化**: 利用 LLM 的知识优化 DSL 代码
4. **学习辅助**: 帮助用户学习 Affect DSL 语法
5. **AI 友好**: 充分利用 AI 能力，实现 DSL 的智能生成和管理

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    User Input                           │
│  "Resize video to 720p and add grayscale filter"       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Affect Agent (@affectjs/agent)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   LLM Client  │  │  DSL Parser  │  │  DSL         │ │
│  │  (OpenAI/    │  │  (@affectjs/ │  │  Generator   │ │
│  │   Anthropic) │  │  dsl)        │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                          │                              │
│                          ▼                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │         DSL Generation & Optimization           │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Generated/Updated DSL                       │
│  affect video "input.mp4" "output.mp4" {                 │
│    resize 1280 720                                       │
│    filter grayscale                                      │
│  }                                                       │
└─────────────────────────────────────────────────────────┘
```

### 技术栈

#### 核心组件
- **LLM Provider**: OpenAI GPT-4, Anthropic Claude, 或其他 LLM API
- **@affectjs/dsl**: DSL 解析器和验证器
- **Prompt Engineering**: 精心设计的提示词模板
- **Context Management**: DSL 上下文管理和理解

#### 可选依赖
- **@affectjs/affect**: 用于验证生成的 DSL 是否可执行
- **@affectjs/affect-browser**: 用于浏览器环境下的验证

## 功能设计

### 1. DSL 生成（从自然语言）

#### 1.1 基础生成

**用户输入**:
```
"Resize video to 720p and add grayscale filter"
```

**生成的 DSL**:
```dsl
affect video "input.mp4" "output.mp4" {
  resize 1280 720
  filter grayscale
}
```

#### 1.2 复杂生成

**用户输入**:
```
"Take the first 10 seconds of the video, resize to 1080p, 
add blur filter with value 5, and encode with h264 at 2000kbps"
```

**生成的 DSL**:
```dsl
affect video "input.mp4" "output.mp4" {
  crop 1920 1080 0 0
  resize 1920 1080
  filter blur 5
  encode h264 2000
}
```

### 2. DSL 更新（基于现有 DSL）

#### 2.1 添加操作

**现有 DSL**:
```dsl
affect video "input.mp4" "output.mp4" {
  resize 1280 720
}
```

**用户输入**:
```
"Add a grayscale filter"
```

**更新的 DSL**:
```dsl
affect video "input.mp4" "output.mp4" {
  resize 1280 720
  filter grayscale
}
```

#### 2.2 修改操作

**现有 DSL**:
```dsl
affect video "input.mp4" "output.mp4" {
  resize 1280 720
  filter grayscale
}
```

**用户输入**:
```
"Change resize to 1920x1080"
```

**更新的 DSL**:
```dsl
affect video "input.mp4" "output.mp4" {
  resize 1920 1080
  filter grayscale
}
```

#### 2.3 删除操作

**现有 DSL**:
```dsl
affect video "input.mp4" "output.mp4" {
  resize 1280 720
  filter grayscale
  filter blur 5
}
```

**用户输入**:
```
"Remove the blur filter"
```

**更新的 DSL**:
```dsl
affect video "input.mp4" "output.mp4" {
  resize 1280 720
  filter grayscale
}
```

### 3. DSL 优化

#### 3.1 性能优化

**现有 DSL**:
```dsl
affect video "input.mp4" "output.mp4" {
  resize 1280 720
  encode h264 5000
  filter grayscale
  filter blur 5
}
```

**优化建议**:
```dsl
# 优化：调整操作顺序以提高性能
affect video "input.mp4" "output.mp4" {
  resize 1280 720
  filter grayscale
  filter blur 5
  encode h264 5000
}
```

#### 3.2 语法优化

**现有 DSL**:
```dsl
affect video "input.mp4" "output.mp4" {
  resize 1280 720
  encode h264 2000
  encode aac 128
}
```

**优化建议**:
```dsl
# 优化：合并编码操作
affect video "input.mp4" "output.mp4" {
  resize 1280 720
  encode h264 2000
  encode aac 128
}
```

### 4. 错误检测和修复

#### 4.1 语法错误检测

**有错误的 DSL**:
```dsl
affect video "input.mp4" "output.mp4" {
  resize 1280
  filter grayscal
}
```

**检测结果**:
```
错误 1: resize 操作缺少 height 参数
错误 2: filter 名称拼写错误，应该是 "grayscale"
```

**修复后的 DSL**:
```dsl
affect video "input.mp4" "output.mp4" {
  resize 1280 720
  filter grayscale
}
```

#### 4.2 逻辑错误检测

**有逻辑错误的 DSL**:
```dsl
affect video "input.mp4" "output.mp4" {
  crop 1920 1080 0 0
  resize 640 480
}
```

**检测结果**:
```
警告: crop 操作在 resize 之前，可能导致不必要的处理
建议: 先 resize 再 crop，或移除 crop 操作
```

## 实现细节

### 1. Agent 核心实现

```typescript
// packages/@affectjs/agent/src/agent.ts
import { parseDsl, compileDsl } from '@affectjs/dsl';
import type { LLMProvider, AgentOptions, AgentResult } from './types';

export class AffectAgent {
  private llmProvider: LLMProvider;
  private dslContext: string = '';

  constructor(provider: LLMProvider) {
    this.llmProvider = provider;
  }

  /**
   * 从自然语言生成 DSL
   */
  async generateDSL(
    userInput: string,
    options?: AgentOptions
  ): Promise<AgentResult> {
    const prompt = this.buildGenerationPrompt(userInput, options);
    const response = await this.llmProvider.generate(prompt);
    
    // 提取 DSL 代码
    const dsl = this.extractDSL(response);
    
    // 验证 DSL
    const validation = this.validateDSL(dsl);
    
    return {
      dsl,
      validation,
      explanation: this.extractExplanation(response),
    };
  }

  /**
   * 更新现有 DSL
   */
  async updateDSL(
    existingDSL: string,
    userInput: string,
    options?: AgentOptions
  ): Promise<AgentResult> {
    this.dslContext = existingDSL;
    
    const prompt = this.buildUpdatePrompt(existingDSL, userInput, options);
    const response = await this.llmProvider.generate(prompt);
    
    const updatedDSL = this.extractDSL(response);
    const validation = this.validateDSL(updatedDSL);
    
    return {
      dsl: updatedDSL,
      validation,
      explanation: this.extractExplanation(response),
      changes: this.detectChanges(existingDSL, updatedDSL),
    };
  }

  /**
   * 优化 DSL
   */
  async optimizeDSL(
    dsl: string,
    options?: AgentOptions
  ): Promise<AgentResult> {
    const prompt = this.buildOptimizationPrompt(dsl, options);
    const response = await this.llmProvider.generate(prompt);
    
    const optimizedDSL = this.extractDSL(response);
    const validation = this.validateDSL(optimizedDSL);
    
    return {
      dsl: optimizedDSL,
      validation,
      explanation: this.extractExplanation(response),
      optimizations: this.detectOptimizations(dsl, optimizedDSL),
    };
  }

  /**
   * 检测和修复错误
   */
  async fixDSL(
    dsl: string,
    options?: AgentOptions
  ): Promise<AgentResult> {
    // 先尝试解析 DSL
    try {
      parseDsl(dsl);
      // 没有语法错误
      return {
        dsl,
        validation: { valid: true, errors: [] },
        explanation: 'DSL 语法正确',
      };
    } catch (error) {
      // 有语法错误，使用 LLM 修复
      const prompt = this.buildFixPrompt(dsl, error);
      const response = await this.llmProvider.generate(prompt);
      
      const fixedDSL = this.extractDSL(response);
      const validation = this.validateDSL(fixedDSL);
      
      return {
        dsl: fixedDSL,
        validation,
        explanation: this.extractExplanation(response),
        fixes: this.detectFixes(dsl, fixedDSL),
      };
    }
  }

  private buildGenerationPrompt(
    userInput: string,
    options?: AgentOptions
  ): string {
    return `You are an expert in Affect DSL, a domain-specific language for media processing.

User request: ${userInput}

Generate Affect DSL code that fulfills the user's request. Follow these rules:
1. Use the correct Affect DSL syntax
2. Include all necessary operations
3. Use appropriate default values when not specified
4. Output only the DSL code, wrapped in \`\`\`dsl code blocks

Affect DSL Syntax:
- affect <type> <input> <output> { <operations> }
- Operations: resize, encode, filter, crop, rotate, save
- Media types: video, audio, image, auto

Example:
User: "Resize video to 720p"
DSL:
\`\`\`dsl
affect video "input.mp4" "output.mp4" {
  resize 1280 720
}
\`\`\`

Now generate DSL for: ${userInput}`;
  }

  private buildUpdatePrompt(
    existingDSL: string,
    userInput: string,
    options?: AgentOptions
  ): string {
    return `You are an expert in Affect DSL. Update the existing DSL based on the user's request.

Existing DSL:
\`\`\`dsl
${existingDSL}
\`\`\`

User request: ${userInput}

Update the DSL to incorporate the user's request while preserving other operations. Output the updated DSL in \`\`\`dsl code blocks.`;
  }

  private buildOptimizationPrompt(
    dsl: string,
    options?: AgentOptions
  ): string {
    return `You are an expert in Affect DSL. Analyze and optimize the following DSL for better performance and clarity.

Current DSL:
\`\`\`dsl
${dsl}
\`\`\`

Optimize the DSL by:
1. Reordering operations for better performance
2. Removing redundant operations
3. Using more efficient operation combinations
4. Improving code clarity

Output the optimized DSL in \`\`\`dsl code blocks, and explain the optimizations.`;
  }

  private buildFixPrompt(dsl: string, error: Error): string {
    return `You are an expert in Affect DSL. Fix the syntax errors in the following DSL.

DSL with errors:
\`\`\`dsl
${dsl}
\`\`\`

Error: ${error.message}

Fix all syntax errors and output the corrected DSL in \`\`\`dsl code blocks.`;
  }

  private extractDSL(response: string): string {
    // 从 LLM 响应中提取 DSL 代码块
    const dslMatch = response.match(/```dsl\n([\s\S]*?)\n```/);
    if (dslMatch) {
      return dslMatch[1].trim();
    }
    
    // 如果没有代码块，尝试提取整个响应
    return response.trim();
  }

  private extractExplanation(response: string): string {
    // 提取解释部分（代码块之外的内容）
    const explanation = response.replace(/```dsl\n[\s\S]*?\n```/g, '').trim();
    return explanation || 'No explanation provided';
  }

  private validateDSL(dsl: string): { valid: boolean; errors: string[] } {
    try {
      parseDsl(dsl);
      return { valid: true, errors: [] };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  private detectChanges(
    oldDSL: string,
    newDSL: string
  ): Array<{ type: 'add' | 'remove' | 'modify'; description: string }> {
    // 简单的差异检测
    const changes: Array<{ type: 'add' | 'remove' | 'modify'; description: string }> = [];
    
    // 这里可以使用更复杂的 diff 算法
    if (oldDSL !== newDSL) {
      changes.push({
        type: 'modify',
        description: 'DSL has been updated',
      });
    }
    
    return changes;
  }

  private detectOptimizations(
    oldDSL: string,
    newDSL: string
  ): string[] {
    // 检测优化点
    const optimizations: string[] = [];
    
    // 简单的优化检测逻辑
    // 实际实现可以使用更复杂的分析
    
    return optimizations;
  }

  private detectFixes(
    oldDSL: string,
    newDSL: string
  ): Array<{ issue: string; fix: string }> {
    // 检测修复的问题
    const fixes: Array<{ issue: string; fix: string }> = [];
    
    // 简单的修复检测逻辑
    
    return fixes;
  }
}
```

### 2. LLM Provider 接口

```typescript
// packages/@affectjs/agent/src/providers/types.ts
export interface LLMProvider {
  generate(prompt: string, options?: LLMOptions): Promise<string>;
  stream?(prompt: string, options?: LLMOptions): AsyncGenerator<string>;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

// OpenAI Provider
export class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private client: OpenAI;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = new OpenAI({ apiKey });
  }

  async generate(prompt: string, options?: LLMOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: options?.model || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in Affect DSL for media processing.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 2000,
    });

    return response.choices[0]?.message?.content || '';
  }
}

// Anthropic Provider
export class AnthropicProvider implements LLMProvider {
  private apiKey: string;
  private client: Anthropic;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = new Anthropic({ apiKey });
  }

  async generate(prompt: string, options?: LLMOptions): Promise<string> {
    const response = await this.client.messages.create({
      model: options?.model || 'claude-3-opus-20240229',
      max_tokens: options?.maxTokens || 2000,
      temperature: options?.temperature || 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return response.content[0].type === 'text'
      ? response.content[0].text
      : '';
  }
}
```

### 3. CLI 集成

```typescript
// packages/@affectjs/agent/src/cli.ts
import { AffectAgent } from './agent';
import { OpenAIProvider } from './providers/openai';
import { Command } from 'commander';

const program = new Command();

program
  .name('affect-agent')
  .description('LLM-powered DSL generation and optimization')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate DSL from natural language')
  .argument('<input>', 'Natural language description')
  .option('-p, --provider <provider>', 'LLM provider (openai, anthropic)', 'openai')
  .option('-m, --model <model>', 'LLM model name')
  .option('-o, --output <file>', 'Output DSL file')
  .action(async (input, options) => {
    const provider = createProvider(options.provider);
    const agent = new AffectAgent(provider);
    
    const result = await agent.generateDSL(input, {
      model: options.model,
    });
    
    if (result.validation.valid) {
      if (options.output) {
        await writeFile(options.output, result.dsl);
        console.log(`DSL written to ${options.output}`);
      } else {
        console.log(result.dsl);
      }
    } else {
      console.error('Generated DSL has errors:');
      result.validation.errors.forEach(err => console.error(`  - ${err}`));
    }
  });

program
  .command('update')
  .description('Update existing DSL based on user input')
  .argument('<dsl-file>', 'Path to existing DSL file')
  .argument('<input>', 'Natural language description of changes')
  .option('-p, --provider <provider>', 'LLM provider', 'openai')
  .option('-o, --output <file>', 'Output DSL file')
  .action(async (dslFile, input, options) => {
    const existingDSL = await readFile(dslFile, 'utf-8');
    const provider = createProvider(options.provider);
    const agent = new AffectAgent(provider);
    
    const result = await agent.updateDSL(existingDSL, input);
    
    if (result.validation.valid) {
      const outputFile = options.output || dslFile;
      await writeFile(outputFile, result.dsl);
      console.log(`Updated DSL written to ${outputFile}`);
      if (result.changes.length > 0) {
        console.log('\nChanges:');
        result.changes.forEach(change => {
          console.log(`  - ${change.type}: ${change.description}`);
        });
      }
    } else {
      console.error('Updated DSL has errors:');
      result.validation.errors.forEach(err => console.error(`  - ${err}`));
    }
  });

program
  .command('optimize')
  .description('Optimize existing DSL')
  .argument('<dsl-file>', 'Path to DSL file')
  .option('-p, --provider <provider>', 'LLM provider', 'openai')
  .option('-o, --output <file>', 'Output DSL file')
  .action(async (dslFile, options) => {
    const dsl = await readFile(dslFile, 'utf-8');
    const provider = createProvider(options.provider);
    const agent = new AffectAgent(provider);
    
    const result = await agent.optimizeDSL(dsl);
    
    if (result.validation.valid) {
      const outputFile = options.output || dslFile;
      await writeFile(outputFile, result.dsl);
      console.log(`Optimized DSL written to ${outputFile}`);
      if (result.optimizations.length > 0) {
        console.log('\nOptimizations:');
        result.optimizations.forEach(opt => console.log(`  - ${opt}`));
      }
    }
  });

program
  .command('fix')
  .description('Fix errors in DSL')
  .argument('<dsl-file>', 'Path to DSL file with errors')
  .option('-p, --provider <provider>', 'LLM provider', 'openai')
  .option('-o, --output <file>', 'Output DSL file')
  .action(async (dslFile, options) => {
    const dsl = await readFile(dslFile, 'utf-8');
    const provider = createProvider(options.provider);
    const agent = new AffectAgent(provider);
    
    const result = await agent.fixDSL(dsl);
    
    if (result.validation.valid) {
      const outputFile = options.output || dslFile;
      await writeFile(outputFile, result.dsl);
      console.log(`Fixed DSL written to ${outputFile}`);
      if (result.fixes && result.fixes.length > 0) {
        console.log('\nFixes applied:');
        result.fixes.forEach(fix => {
          console.log(`  - ${fix.issue}: ${fix.fix}`);
        });
      }
    }
  });

program.parse();
```

### 4. 与编辑器集成

```typescript
// packages/@affectjs/editor/client/src/hooks/useAgent.ts
import { useState, useCallback } from 'react';
import { AffectAgent } from '@affectjs/agent';

export function useAgent() {
  const [isGenerating, setIsGenerating] = useState(false);
  const agent = new AffectAgent(/* LLM provider */);

  const generateDSL = useCallback(async (userInput: string) => {
    setIsGenerating(true);
    try {
      const result = await agent.generateDSL(userInput);
      return result;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const updateDSL = useCallback(async (existingDSL: string, userInput: string) => {
    setIsGenerating(true);
    try {
      const result = await agent.updateDSL(existingDSL, userInput);
      return result;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const optimizeDSL = useCallback(async (dsl: string) => {
    setIsGenerating(true);
    try {
      const result = await agent.optimizeDSL(dsl);
      return result;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    generateDSL,
    updateDSL,
    optimizeDSL,
    isGenerating,
  };
}
```

## 使用场景

### 场景 1: 自然语言生成 DSL

```bash
# CLI 使用
affect-agent generate "Resize video to 720p and add grayscale filter" -o output.affect

# 在编辑器中使用
用户输入: "Make the video brighter and add a blur effect"
→ Agent 生成 DSL
→ 自动应用到编辑器
```

### 场景 2: 更新现有 DSL

```bash
# CLI 使用
affect-agent update video.affect "Change resize to 1080p" -o updated.affect

# 在编辑器中使用
用户输入: "Add a crop operation"
→ Agent 分析现有 DSL
→ 生成更新后的 DSL
→ 显示变更说明
```

### 场景 3: 优化 DSL

```bash
# CLI 使用
affect-agent optimize video.affect -o optimized.affect

# 在编辑器中使用
用户点击"优化"按钮
→ Agent 分析 DSL
→ 提供优化建议
→ 应用优化
```

### 场景 4: 修复错误

```bash
# CLI 使用
affect-agent fix broken.affect -o fixed.affect

# 在编辑器中使用
检测到 DSL 错误
→ Agent 分析错误
→ 自动修复
→ 显示修复说明
```

## 提示词工程

### 1. DSL 语法参考

Agent 需要了解 Affect DSL 的完整语法，包括：
- 基本语法结构
- 所有支持的操作
- 操作参数和格式
- 条件逻辑
- 最佳实践

### 2. 上下文管理

Agent 需要维护：
- 当前 DSL 的完整上下文
- 用户的操作历史
- 项目的媒体类型和设置
- 常用的操作模式

### 3. 错误处理

Agent 需要能够：
- 识别语法错误
- 识别逻辑错误
- 提供修复建议
- 验证修复后的代码

## 测试计划

### 功能测试

- [ ] 从自然语言生成 DSL
- [ ] 更新现有 DSL
- [ ] 优化 DSL
- [ ] 检测和修复错误
- [ ] 多轮对话支持
- [ ] 上下文理解

### 准确性测试

- [ ] 生成 DSL 的语法正确性
- [ ] 生成 DSL 的逻辑正确性
- [ ] 更新操作的准确性
- [ ] 优化建议的有效性

### 性能测试

- [ ] LLM API 调用延迟
- [ ] 大 DSL 文件处理
- [ ] 并发请求处理

## 迁移路径

### 阶段 1: 基础实现（3-4周）

1. **Agent 核心**:
   - 实现 AffectAgent 类
   - 集成 LLM Provider
   - 实现基础提示词模板

2. **DSL 生成**:
   - 实现 generateDSL 方法
   - 测试基础生成功能
   - 优化提示词

### 阶段 2: 高级功能（3-4周）

1. **DSL 更新**:
   - 实现 updateDSL 方法
   - 上下文管理
   - 变更检测

2. **优化和修复**:
   - 实现 optimizeDSL 方法
   - 实现 fixDSL 方法
   - 错误检测逻辑

### 阶段 3: 集成和优化（2-3周）

1. **CLI 工具**:
   - 实现命令行接口
   - 测试各种场景
   - 文档完善

2. **编辑器集成**:
   - 集成到 RFC-008 编辑器
   - UI 组件开发
   - 用户体验优化

## 参考

### 相关 RFC

- [RFC-004: @affectjs/dsl - 统一媒体处理 DSL](./completed/0004-fluent-ffmpeg-dsl.md) - **基础**: DSL 语法和设计，Agent 需要理解 DSL 语法
- [RFC-005: @affectjs/affect - AffectJS 运行时引擎](./0005-affectjs-runtime.md) - 运行时引擎，用于验证生成的 DSL
- [RFC-008: Affect 快速视频编辑器](./0008-affect-video-editor.md) - **目标应用**: 编辑器可以集成 Agent 提供智能 DSL 生成
- [RFC-007: AffectJS 架构设计](./0007-affectjs-architecture.md) - 整体架构设计

### 外部文档

- [OpenAI API 文档](https://platform.openai.com/docs)
- [Anthropic API 文档](https://docs.anthropic.com/)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)

## 变更日志

### 2025-12-29
- 初始 RFC 创建
- 定义 Affect Agent 的架构和功能
- 设计 LLM 集成方案
- 规划实现路径

