# RFC-011: Monaco DSL 代码编辑器

**状态**: 计划中  
**日期**: 2025-12-29  
**作者**: Albert Li  
**相关议题**: 基于 Monaco Editor 构建专业的 DSL 代码编辑器，提供语法高亮、自动补全、错误检测等功能

## 摘要

本文档描述了基于 **Monaco Editor**（VS Code 的编辑器核心）构建专业的 Affect DSL 代码编辑器的设计和实现。编辑器提供完整的 IDE 功能，包括语法高亮、自动补全、错误检测、代码格式化、代码折叠等，提升 DSL 编写体验。

**核心特性**:
- 🎨 **语法高亮**: 完整的 Affect DSL 语法高亮支持
- 💡 **智能补全**: 基于上下文的自动补全和建议
- 🔍 **错误检测**: 实时检测 DSL 语法错误
- 📝 **代码格式化**: 自动格式化 DSL 代码
- 🔄 **代码折叠**: 支持代码块折叠
- 🎯 **集成 Agent**: 与 RFC-010 Affect Agent 集成，提供 AI 辅助

**与相关 RFC 的关系**:
- **基于**: [RFC-004: @affectjs/dsl](./completed/0004-fluent-ffmpeg-dsl.md) - 使用 DSL 解析器进行语法验证
- **集成**: [RFC-010: Affect Agent](./0010-affect-agent.md) - 提供 AI 辅助代码生成
- **服务于**: [RFC-008: Affect 快速视频编辑器](./0008-affect-video-editor.md) - 可作为编辑器的代码编辑模式

## 动机

1. **专业编辑体验**: 提供类似 VS Code 的专业代码编辑体验
2. **降低错误率**: 实时语法检查和错误提示
3. **提高效率**: 智能补全和代码提示减少输入时间
4. **学习辅助**: 通过补全和提示帮助用户学习 DSL 语法
5. **AI 集成**: 与 Affect Agent 集成，提供 AI 辅助功能

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│              Monaco DSL Editor Component                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Monaco     │  │   Language   │  │   Agent      │ │
│  │   Editor     │  │   Service    │  │   Integration│ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                          │                              │
│                          ▼                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │         DSL Language Support                     │  │
│  │  - Syntax Highlighting                           │  │
│  │  - Auto Completion                               │  │
│  │  - Error Detection                               │  │
│  │  - Code Formatting                               │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 技术栈

#### 核心依赖
- **Monaco Editor**: VS Code 的编辑器核心
- **@affectjs/dsl**: DSL 解析器和验证器
- **@affectjs/agent**: Affect Agent（可选，用于 AI 辅助）

#### 构建工具
- **Vite**: 构建和打包
- **TypeScript**: 类型安全
- **React**: UI 框架（如果作为 React 组件）

## 实现细节

### 1. Monaco 语言支持配置

```typescript
// packages/@affectjs/monaco-dsl-editor/src/language/affect-dsl.ts
import * as monaco from 'monaco-editor';

// 注册 Affect DSL 语言
monaco.languages.register({ id: 'affect-dsl' });

// 定义语言配置
monaco.languages.setLanguageConfiguration('affect-dsl', {
  comments: {
    lineComment: '#',
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
});

// 定义语法高亮规则
monaco.languages.setMonarchTokensProvider('affect-dsl', {
  tokenizer: {
    root: [
      // 关键字
      [/affect|video|audio|image|auto|if|else/, 'keyword'],
      // 操作
      [/resize|encode|filter|crop|rotate|save/, 'function'],
      // 字符串
      [/"[^"]*"/, 'string'],
      [/'\S*'/, 'string'],
      // 变量
      [/\$[a-zA-Z_][a-zA-Z0-9_]*/, 'variable'],
      // 数字
      [/\d+/, 'number'],
      // 注释
      [/#.*$/, 'comment'],
      // 操作符
      [/[{}()\[\]]/, 'delimiter'],
      // 空白
      [/\s+/, 'white'],
    ],
  },
});
```

### 2. 自动补全提供者

```typescript
// packages/@affectjs/monaco-dsl-editor/src/language/completion.ts
import * as monaco from 'monaco-editor';
import { parseDsl } from '@affectjs/dsl';

monaco.languages.registerCompletionItemProvider('affect-dsl', {
  provideCompletionItems: (model, position) => {
    const textUntilPosition = model.getValueInRange({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column,
    });

    const suggestions: monaco.languages.CompletionItem[] = [];

    // 根据上下文提供补全建议
    const context = analyzeContext(textUntilPosition);

    // 关键字补全
    if (context.isAtRoot) {
      suggestions.push(
        {
          label: 'affect',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'affect ${1:video} "${2:input}" "${3:output}" {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Start an affect block',
        },
        {
          label: 'if',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'if ${1:condition} {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Conditional block',
        }
      );
    }

    // 操作补全
    if (context.isInAffectBlock) {
      suggestions.push(
        {
          label: 'resize',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'resize ${1:width} ${2:height}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Resize media to specified dimensions',
        },
        {
          label: 'encode',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'encode ${1:h264} ${2:2000}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Encode with specified codec and bitrate',
        },
        {
          label: 'filter',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'filter ${1:grayscale}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Apply filter effect',
        },
        {
          label: 'crop',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'crop ${1:width} ${2:height} ${3:x} ${4:y}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Crop media region',
        },
        {
          label: 'rotate',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'rotate ${1:90}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Rotate media by angle',
        }
      );
    }

    // 滤镜补全
    if (context.isInFilterOperation) {
      const filters = [
        'grayscale', 'blur', 'brightness', 'contrast', 'saturate',
        'hue', 'sharpen', 'noise', 'vintage', 'sepia'
      ];
      filters.forEach(filter => {
        suggestions.push({
          label: filter,
          kind: monaco.languages.CompletionItemKind.Value,
          insertText: filter,
          documentation: `Apply ${filter} filter`,
        });
      });
    }

    // 编码器补全
    if (context.isInEncodeOperation) {
      const codecs = [
        { label: 'h264', doc: 'H.264 video codec' },
        { label: 'h265', doc: 'H.265 video codec' },
        { label: 'vp9', doc: 'VP9 video codec' },
        { label: 'aac', doc: 'AAC audio codec' },
        { label: 'mp3', doc: 'MP3 audio codec' },
        { label: 'opus', doc: 'Opus audio codec' },
      ];
      codecs.forEach(codec => {
        suggestions.push({
          label: codec.label,
          kind: monaco.languages.CompletionItemKind.Value,
          insertText: codec.label,
          documentation: codec.doc,
        });
      });
    }

    return { suggestions };
  },
});

function analyzeContext(text: string): {
  isAtRoot: boolean;
  isInAffectBlock: boolean;
  isInFilterOperation: boolean;
  isInEncodeOperation: boolean;
} {
  // 分析代码上下文
  const lines = text.split('\n');
  const lastLine = lines[lines.length - 1];
  
  return {
    isAtRoot: !text.includes('affect') || text.match(/\{/g)?.length === text.match(/\}/g)?.length,
    isInAffectBlock: text.includes('affect') && (text.match(/\{/g)?.length || 0) > (text.match(/\}/g)?.length || 0),
    isInFilterOperation: lastLine.trim().startsWith('filter'),
    isInEncodeOperation: lastLine.trim().startsWith('encode'),
  };
}
```

### 3. 错误检测和验证

```typescript
// packages/@affectjs/monaco-dsl-editor/src/language/validation.ts
import * as monaco from 'monaco-editor';
import { parseDsl } from '@affectjs/dsl';

monaco.languages.registerDocumentFormattingEditProvider('affect-dsl', {
  provideDocumentFormattingEdits: (model) => {
    const text = model.getValue();
    const formatted = formatDSL(text);
    
    return [
      {
        range: model.getFullModelRange(),
        text: formatted,
      },
    ];
  },
});

// 实时验证
monaco.editor.onDidCreateModel((model) => {
  if (model.getLanguageId() === 'affect-dsl') {
    const validate = () => {
      const text = model.getValue();
      const markers: monaco.editor.IMarkerData[] = [];
      
      try {
        parseDsl(text);
        // 没有语法错误
      } catch (error) {
        // 解析错误，创建标记
        const match = error.message.match(/line (\d+), column (\d+)/);
        if (match) {
          const line = parseInt(match[1]);
          const column = parseInt(match[2]);
          
          markers.push({
            severity: monaco.MarkerSeverity.Error,
            startLineNumber: line,
            startColumn: column,
            endLineNumber: line,
            endColumn: column + 10,
            message: error.message,
          });
        }
      }
      
      monaco.editor.setModelMarkers(model, 'affect-dsl', markers);
    };
    
    // 初始验证
    validate();
    
    // 监听内容变化
    model.onDidChangeContent(() => {
      // 防抖验证
      clearTimeout(validate.timeout);
      validate.timeout = setTimeout(validate, 300);
    });
  }
});
```

### 4. React 组件封装

```typescript
// packages/@affectjs/monaco-dsl-editor/src/components/DSLEditor.tsx
import React, { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { AffectAgent } from '@affectjs/agent';

interface DSLEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  onError?: (errors: string[]) => void;
  agentEnabled?: boolean;
  height?: string;
}

export function DSLEditor({
  value = '',
  onChange,
  onError,
  agentEnabled = false,
  height = '600px',
}: DSLEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const agentRef = useRef<AffectAgent | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 创建编辑器
    const editor = monaco.editor.create(containerRef.current, {
      value,
      language: 'affect-dsl',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: true },
      wordWrap: 'on',
      formatOnPaste: true,
      formatOnType: true,
    });

    editorRef.current = editor;

    // 监听内容变化
    editor.onDidChangeModelContent(() => {
      const newValue = editor.getValue();
      onChange?.(newValue);
    });

    // 初始化 Agent（如果启用）
    if (agentEnabled) {
      agentRef.current = new AffectAgent(/* LLM provider */);
    }

    return () => {
      editor.dispose();
    };
  }, []);

  // 更新值
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.getValue()) {
      editorRef.current.setValue(value);
    }
  }, [value]);

  // AI 辅助功能
  const handleAIAssist = async (userInput: string) => {
    if (!agentRef.current || !editorRef.current) return;

    const currentDSL = editorRef.current.getValue();
    const result = await agentRef.current.generateDSL(userInput);

    if (result.validation.valid) {
      editorRef.current.setValue(result.dsl);
    } else {
      onError?.(result.validation.errors);
    }
  };

  return (
    <div className="dsl-editor">
      <div ref={containerRef} style={{ height }} />
      {agentEnabled && (
        <div className="editor-toolbar">
          <button onClick={() => handleAIAssist('Optimize this DSL')}>
            AI Optimize
          </button>
        </div>
      )}
    </div>
  );
}
```

### 5. 代码格式化

```typescript
// packages/@affectjs/monaco-dsl-editor/src/language/formatter.ts
export function formatDSL(dsl: string): string {
  // 简单的格式化逻辑
  let formatted = dsl;
  
  // 规范化缩进
  formatted = formatted.replace(/\t/g, '  '); // 使用 2 个空格
  
  // 规范化换行
  formatted = formatted.replace(/\r\n/g, '\n');
  formatted = formatted.replace(/\r/g, '\n');
  
  // 规范化大括号
  formatted = formatted.replace(/\{\s*\n/g, '{\n');
  formatted = formatted.replace(/\n\s*\}/g, '\n}');
  
  // 规范化操作之间的空行
  formatted = formatted.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return formatted;
}
```

## 功能特性

### 1. 语法高亮

- 关键字高亮（affect, video, audio, image, if, else）
- 操作高亮（resize, encode, filter, crop, rotate）
- 字符串高亮
- 变量高亮（$variable）
- 注释高亮（#）

### 2. 智能补全

- 关键字补全
- 操作补全（带参数提示）
- 滤镜名称补全
- 编码器名称补全
- 上下文感知补全

### 3. 错误检测

- 实时语法检查
- 错误标记和提示
- 错误修复建议

### 4. 代码格式化

- 自动格式化
- 缩进规范化
- 代码美化

### 5. AI 集成

- 与 Affect Agent 集成
- AI 代码生成
- AI 代码优化
- AI 错误修复

## 使用示例

### 基础使用

```typescript
import { DSLEditor } from '@affectjs/monaco-dsl-editor';

function App() {
  const [dsl, setDsl] = useState('');

  return (
    <DSLEditor
      value={dsl}
      onChange={setDsl}
      height="600px"
    />
  );
}
```

### 与 Agent 集成

```typescript
import { DSLEditor } from '@affectjs/monaco-dsl-editor';

function App() {
  const [dsl, setDsl] = useState('');

  return (
    <DSLEditor
      value={dsl}
      onChange={setDsl}
      agentEnabled={true}
      onError={(errors) => console.error(errors)}
    />
  );
}
```

### 在编辑器中使用

```typescript
// packages/@affectjs/editor/client/src/components/CodeEditor.tsx
import { DSLEditor } from '@affectjs/monaco-dsl-editor';

export function CodeEditor({ project, onDSLChange }: CodeEditorProps) {
  const dsl = generateDSL(project);

  return (
    <div className="code-editor-panel">
      <DSLEditor
        value={dsl}
        onChange={(newDSL) => {
          // 解析新 DSL 并更新项目
          const updatedProject = parseDSLToProject(newDSL);
          onDSLChange(updatedProject);
        }}
        agentEnabled={true}
        height="100%"
      />
    </div>
  );
}
```

## 测试计划

### 功能测试

- [ ] 语法高亮正确性
- [ ] 自动补全准确性
- [ ] 错误检测准确性
- [ ] 代码格式化正确性
- [ ] Agent 集成功能

### 性能测试

- [ ] 大文件编辑性能
- [ ] 实时验证性能
- [ ] 补全响应速度

### 兼容性测试

- [ ] 不同浏览器兼容性
- [ ] 不同屏幕尺寸适配
- [ ] 移动端支持

## 迁移路径

### 阶段 1: 基础实现（2-3周）

1. **Monaco 集成**:
   - 集成 Monaco Editor
   - 配置基础语言支持
   - 实现语法高亮

2. **基础功能**:
   - 实现自动补全
   - 实现错误检测
   - 实现代码格式化

### 阶段 2: 高级功能（2-3周）

1. **智能补全**:
   - 上下文感知补全
   - 参数提示
   - 文档提示

2. **Agent 集成**:
   - 集成 Affect Agent
   - AI 辅助功能
   - 代码生成和优化

### 阶段 3: 完善和优化（1-2周）

1. **用户体验**:
   - UI 优化
   - 快捷键支持
   - 主题支持

2. **文档和示例**:
   - 编写使用文档
   - 创建示例代码
   - 更新 README

## 参考

### 相关 RFC

- [RFC-004: @affectjs/dsl - 统一媒体处理 DSL](./completed/0004-fluent-ffmpeg-dsl.md) - **基础**: DSL 语法和解析器
- [RFC-010: Affect Agent](./0010-affect-agent.md) - **集成**: AI 辅助功能
- [RFC-008: Affect 快速视频编辑器](./0008-affect-video-editor.md) - **应用**: 编辑器集成场景

### 外部文档

- [Monaco Editor 文档](https://microsoft.github.io/monaco-editor/)
- [Monaco Language API](https://microsoft.github.io/monaco-editor/api/interfaces/monaco.languages.html)

## 变更日志

### 2025-12-29
- 初始 RFC 创建
- 定义 Monaco DSL 编辑器架构
- 设计语言支持和补全功能
- 规划 Agent 集成方案

