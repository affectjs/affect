# RFC-012: React Flow DSL 可视化编辑器

**状态**: 计划中  
**日期**: 2025-12-29  
**作者**: Albert Li  
**相关议题**: 基于 React Flow 构建 DSL 可视化编辑器，通过拖拽节点和连接来创建和编辑 Affect DSL

## 摘要

本文档描述了基于 **React Flow** 构建 Affect DSL 可视化编辑器的设计和实现。编辑器允许用户通过拖拽节点、连接节点来可视化地创建和编辑 DSL，无需编写代码。每个节点代表一个操作（resize, filter, encode 等），节点之间的连接表示操作流程。

**核心特性**:
- 🎨 **可视化编辑**: 通过拖拽节点创建 DSL，无需编写代码
- 🔗 **节点连接**: 通过连接节点定义操作流程
- 📦 **节点库**: 丰富的预定义操作节点
- 🎯 **实时预览**: 实时生成 DSL 并预览效果
- 🔄 **双向同步**: 可视化编辑和代码编辑双向同步
- 🤖 **AI 辅助**: 集成 Affect Agent，提供智能节点建议

**与相关 RFC 的关系**:
- **基于**: [RFC-004: @affectjs/dsl](./completed/0004-fluent-ffmpeg-dsl.md) - 生成符合 DSL 语法的代码
- **集成**: [RFC-010: Affect Agent](./0010-affect-agent.md) - 提供智能节点建议和优化
- **集成**: [RFC-011: Monaco DSL 编辑器](./0011-monaco-dsl-editor.md) - 代码编辑模式，双向同步
- **服务于**: [RFC-008: Affect 快速视频编辑器](./0008-affect-video-editor.md) - 作为编辑器的可视化编辑模式

## 动机

1. **降低使用门槛**: 让非技术用户也能通过可视化界面创建 DSL
2. **直观理解**: 通过可视化方式理解操作流程
3. **快速原型**: 快速创建和测试 DSL 配置
4. **学习工具**: 帮助用户理解 DSL 结构和操作关系
5. **灵活编辑**: 支持可视化编辑和代码编辑两种方式

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│         React Flow Visual Editor                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Node       │  │   Connection │  │   Canvas     │ │
│  │   Library    │  │   Manager    │  │   Renderer   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                          │                              │
│                          ▼                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │         DSL Generator                            │  │
│  │  (Flow → DSL Conversion)                        │  │
│  └──────────────────────────────────────────────────┘  │
│                          │                              │
│                          ▼                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Generated DSL                           │  │
│  │  affect video "input.mp4" "output.mp4" {        │  │
│  │    resize 1280 720                               │  │
│  │    filter grayscale                              │  │
│  │  }                                               │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 技术栈

#### 核心依赖
- **React Flow**: 节点图编辑器框架
- **@affectjs/dsl**: DSL 生成器
- **@affectjs/agent**: Affect Agent（可选，用于 AI 辅助）
- **React**: UI 框架

#### 构建工具
- **Vite**: 构建和打包
- **TypeScript**: 类型安全

## 节点设计

### 1. 节点类型

#### 1.1 输入节点

```typescript
interface InputNode {
  type: 'input';
  id: string;
  data: {
    label: 'Input';
    mediaType: 'video' | 'audio' | 'image' | 'auto';
    inputPath: string;
  };
  position: { x: number; y: number };
}
```

#### 1.2 操作节点

```typescript
interface OperationNode {
  type: 'operation';
  id: string;
  data: {
    label: string;
    operation: 'resize' | 'encode' | 'filter' | 'crop' | 'rotate';
    parameters: Record<string, any>;
  };
  position: { x: number; y: number };
}

// 示例：Resize 节点
const resizeNode: OperationNode = {
  type: 'operation',
  id: 'resize-1',
  data: {
    label: 'Resize',
    operation: 'resize',
    parameters: {
      width: 1280,
      height: 720,
    },
  },
  position: { x: 200, y: 100 },
};
```

#### 1.3 输出节点

```typescript
interface OutputNode {
  type: 'output';
  id: string;
  data: {
    label: 'Output';
    outputPath: string;
  };
  position: { x: number; y: number };
}
```

#### 1.4 条件节点

```typescript
interface ConditionNode {
  type: 'condition';
  id: string;
  data: {
    label: 'If';
    condition: string;
    trueBranch: string[]; // 节点 ID 列表
    falseBranch: string[]; // 节点 ID 列表
  };
  position: { x: number; y: number };
}
```

### 2. 节点库

```typescript
// packages/@affectjs/react-flow-editor/src/nodes/nodeLibrary.ts
export const nodeLibrary = {
  // 输入/输出
  input: {
    type: 'input',
    label: 'Input',
    icon: '📥',
    category: 'io',
  },
  output: {
    type: 'output',
    label: 'Output',
    icon: '📤',
    category: 'io',
  },

  // 变换操作
  resize: {
    type: 'operation',
    label: 'Resize',
    icon: '📐',
    category: 'transform',
    parameters: [
      { name: 'width', type: 'number', default: 1280 },
      { name: 'height', type: 'number', default: 720 },
    ],
  },
  crop: {
    type: 'operation',
    label: 'Crop',
    icon: '✂️',
    category: 'transform',
    parameters: [
      { name: 'width', type: 'number', default: 1920 },
      { name: 'height', type: 'number', default: 1080 },
      { name: 'x', type: 'number', default: 0 },
      { name: 'y', type: 'number', default: 0 },
    ],
  },
  rotate: {
    type: 'operation',
    label: 'Rotate',
    icon: '🔄',
    category: 'transform',
    parameters: [
      { name: 'angle', type: 'number', default: 90 },
      { name: 'flip', type: 'select', options: ['none', 'horizontal', 'vertical'], default: 'none' },
    ],
  },

  // 编码操作
  encode: {
    type: 'operation',
    label: 'Encode',
    icon: '🎬',
    category: 'encode',
    parameters: [
      { name: 'codec', type: 'select', options: ['h264', 'h265', 'vp9', 'aac', 'mp3'], default: 'h264' },
      { name: 'bitrate', type: 'number', default: 2000 },
    ],
  },

  // 滤镜操作
  filter: {
    type: 'operation',
    label: 'Filter',
    icon: '🎨',
    category: 'filter',
    parameters: [
      { name: 'name', type: 'select', options: ['grayscale', 'blur', 'brightness', 'contrast'], default: 'grayscale' },
      { name: 'value', type: 'number', default: 1 },
    ],
  },

  // 条件
  condition: {
    type: 'condition',
    label: 'If',
    icon: '❓',
    category: 'control',
    parameters: [
      { name: 'condition', type: 'string', default: 'width > 1920' },
    ],
  },
};
```

## 实现细节

### 1. React Flow 编辑器组件

```typescript
// packages/@affectjs/react-flow-editor/src/components/VisualEditor.tsx
import React, { useCallback, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { InputNode } from './nodes/InputNode';
import { OperationNode } from './nodes/OperationNode';
import { OutputNode } from './nodes/OutputNode';
import { ConditionNode } from './nodes/ConditionNode';
import { NodeLibrary } from './NodeLibrary';
import { flowToDSL } from './dsl-generator';

const nodeTypes = {
  input: InputNode,
  operation: OperationNode,
  output: OutputNode,
  condition: ConditionNode,
};

interface VisualEditorProps {
  onDSLChange?: (dsl: string) => void;
  initialDSL?: string;
}

export function VisualEditor({ onDSLChange, initialDSL }: VisualEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // 从初始 DSL 加载节点
  React.useEffect(() => {
    if (initialDSL) {
      const { nodes: initialNodes, edges: initialEdges } = dslToFlow(initialDSL);
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [initialDSL]);

  // 连接节点
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  // 添加节点
  const onAddNode = useCallback((nodeType: string) => {
    const newNode: Node = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType,
      position: { x: Math.random() * 500, y: Math.random() * 500 },
      data: { label: nodeType, ...nodeLibrary[nodeType]?.defaultData },
    };
    setNodes((nds) => [...nds, newNode]);
  }, []);

  // 生成 DSL
  const generateDSL = useCallback(() => {
    const dsl = flowToDSL(nodes, edges);
    onDSLChange?.(dsl);
    return dsl;
  }, [nodes, edges, onDSLChange]);

  // 当节点或边变化时自动生成 DSL
  React.useEffect(() => {
    if (nodes.length > 0 && edges.length > 0) {
      generateDSL();
    }
  }, [nodes, edges, generateDSL]);

  return (
    <div className="visual-editor" style={{ width: '100%', height: '100vh' }}>
      <div className="editor-toolbar">
        <NodeLibrary onAddNode={onAddNode} />
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
```

### 2. Flow 到 DSL 转换

```typescript
// packages/@affectjs/react-flow-editor/src/dsl-generator.ts
import { Node, Edge } from 'reactflow';

export function flowToDSL(nodes: Node[], edges: Edge[]): string {
  // 找到输入节点
  const inputNode = nodes.find(n => n.type === 'input');
  const outputNode = nodes.find(n => n.type === 'output');

  if (!inputNode || !outputNode) {
    throw new Error('Input and output nodes are required');
  }

  const mediaType = inputNode.data.mediaType || 'auto';
  const inputPath = inputNode.data.inputPath || '$input';
  const outputPath = outputNode.data.outputPath || '$output';

  // 构建操作序列（通过边的连接顺序）
  const operations = buildOperationSequence(nodes, edges, inputNode.id, outputNode.id);

  // 生成 DSL
  let dsl = `affect ${mediaType} "${inputPath}" "${outputPath}" {\n`;
  
  operations.forEach(op => {
    dsl += `  ${op}\n`;
  });
  
  dsl += '}\n';

  return dsl;
}

function buildOperationSequence(
  nodes: Node[],
  edges: Edge[],
  startNodeId: string,
  endNodeId: string
): string[] {
  const operations: string[] = [];
  const visited = new Set<string>();
  
  // 从输入节点开始，沿着边遍历
  function traverse(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // 如果是操作节点，生成操作代码
    if (node.type === 'operation') {
      const opCode = generateOperationCode(node);
      operations.push(opCode);
    }

    // 如果是条件节点，处理条件逻辑
    if (node.type === 'condition') {
      const conditionCode = generateConditionCode(node, nodes, edges);
      operations.push(conditionCode);
    }

    // 继续遍历连接的节点
    const outgoingEdges = edges.filter(e => e.source === nodeId);
    outgoingEdges.forEach(edge => {
      traverse(edge.target);
    });
  }

  traverse(startNodeId);
  return operations;
}

function generateOperationCode(node: Node): string {
  const { operation, parameters } = node.data;

  switch (operation) {
    case 'resize':
      return `resize ${parameters.width} ${parameters.height}`;
    case 'encode':
      return `encode ${parameters.codec} ${parameters.bitrate}`;
    case 'filter':
      const value = parameters.value !== undefined ? ` ${parameters.value}` : '';
      return `filter ${parameters.name}${value}`;
    case 'crop':
      return `crop ${parameters.width} ${parameters.height} ${parameters.x} ${parameters.y}`;
    case 'rotate':
      const flip = parameters.flip !== 'none' ? ` ${parameters.flip}` : '';
      return `rotate ${parameters.angle}${flip}`;
    default:
      return '';
  }
}

function generateConditionCode(
  conditionNode: Node,
  nodes: Node[],
  edges: Edge[]
): string {
  const { condition, trueBranch, falseBranch } = conditionNode.data;
  
  // 构建条件块
  let code = `if ${condition} {\n`;
  
  // 处理 true 分支
  trueBranch.forEach(nodeId => {
    const node = nodes.find(n => n.id === nodeId);
    if (node && node.type === 'operation') {
      code += `  ${generateOperationCode(node)}\n`;
    }
  });
  
  if (falseBranch.length > 0) {
    code += '} else {\n';
    // 处理 false 分支
    falseBranch.forEach(nodeId => {
      const node = nodes.find(n => n.id === nodeId);
      if (node && node.type === 'operation') {
        code += `  ${generateOperationCode(node)}\n`;
      }
    });
  }
  
  code += '}\n';
  return code;
}
```

### 3. DSL 到 Flow 转换

```typescript
// packages/@affectjs/react-flow-editor/src/dsl-parser.ts
import { parseDsl } from '@affectjs/dsl';
import { Node, Edge } from 'reactflow';

export function dslToFlow(dsl: string): { nodes: Node[]; edges: Edge[] } {
  const ast = parseDsl(dsl);
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // 解析 AST 并创建节点
  if (ast.type === 'AffectBlock') {
    // 创建输入节点
    const inputNode: Node = {
      id: 'input-1',
      type: 'input',
      position: { x: 0, y: 200 },
      data: {
        label: 'Input',
        mediaType: ast.mediaType,
        inputPath: ast.commands.find(c => c.type === 'Input')?.path || '$input',
      },
    };
    nodes.push(inputNode);

    // 创建操作节点
    let prevNodeId = 'input-1';
    let yOffset = 100;

    ast.commands.forEach((cmd, index) => {
      if (cmd.type === 'Resize' || cmd.type === 'Encode' || cmd.type === 'Filter' || 
          cmd.type === 'Crop' || cmd.type === 'Rotate') {
        const operationNode: Node = {
          id: `operation-${index}`,
          type: 'operation',
          position: { x: 200 + index * 200, y: yOffset },
          data: {
            label: cmd.type,
            operation: cmd.type.toLowerCase(),
            parameters: extractParameters(cmd),
          },
        };
        nodes.push(operationNode);

        // 创建边
        edges.push({
          id: `edge-${prevNodeId}-${operationNode.id}`,
          source: prevNodeId,
          target: operationNode.id,
        });

        prevNodeId = operationNode.id;
        yOffset += 50;
      }
    });

    // 创建输出节点
    const outputNode: Node = {
      id: 'output-1',
      type: 'output',
      position: { x: 200 + ast.commands.length * 200, y: 200 },
      data: {
        label: 'Output',
        outputPath: ast.commands.find(c => c.type === 'Save')?.path || '$output',
      },
    };
    nodes.push(outputNode);

    // 连接到输出节点
    edges.push({
      id: `edge-${prevNodeId}-output-1`,
      source: prevNodeId,
      target: 'output-1',
    });
  }

  return { nodes, edges };
}

function extractParameters(cmd: any): Record<string, any> {
  // 从命令中提取参数
  const params: Record<string, any> = {};
  
  if (cmd.type === 'Resize') {
    params.width = cmd.width;
    params.height = cmd.height;
  } else if (cmd.type === 'Encode') {
    params.codec = cmd.codec;
    params.bitrate = cmd.bitrate;
  } else if (cmd.type === 'Filter') {
    params.name = cmd.name;
    params.value = cmd.value;
  } else if (cmd.type === 'Crop') {
    params.width = cmd.width;
    params.height = cmd.height;
    params.x = cmd.x;
    params.y = cmd.y;
  } else if (cmd.type === 'Rotate') {
    params.angle = cmd.angle;
    params.flip = cmd.flip;
  }
  
  return params;
}
```

### 4. 节点组件实现

```typescript
// packages/@affectjs/react-flow-editor/src/nodes/OperationNode.tsx
import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

export function OperationNode({ data, selected }: NodeProps) {
  return (
    <div className={`operation-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="node-content">
        <div className="node-header">
          <span className="node-icon">{data.icon || '⚙️'}</span>
          <span className="node-label">{data.label}</span>
        </div>
        <div className="node-parameters">
          {Object.entries(data.parameters || {}).map(([key, value]) => (
            <div key={key} className="parameter">
              <span className="param-name">{key}:</span>
              <span className="param-value">{String(value)}</span>
            </div>
          ))}
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
```

### 5. 节点库面板

```typescript
// packages/@affectjs/react-flow-editor/src/components/NodeLibrary.tsx
import React from 'react';
import { nodeLibrary } from '../nodes/nodeLibrary';

interface NodeLibraryProps {
  onAddNode: (nodeType: string) => void;
}

export function NodeLibrary({ onAddNode }: NodeLibraryProps) {
  const categories = ['io', 'transform', 'encode', 'filter', 'control'];

  return (
    <div className="node-library">
      <h3>Node Library</h3>
      {categories.map(category => (
        <div key={category} className="category">
          <h4>{category}</h4>
          {Object.entries(nodeLibrary)
            .filter(([_, node]) => node.category === category)
            .map(([type, node]) => (
              <div
                key={type}
                className="node-item"
                onClick={() => onAddNode(type)}
                draggable
              >
                <span className="node-icon">{node.icon}</span>
                <span className="node-name">{node.label}</span>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
```

### 6. 与代码编辑器双向同步

```typescript
// packages/@affectjs/react-flow-editor/src/hooks/useBidirectionalSync.ts
import { useState, useEffect } from 'react';
import { Node, Edge } from 'reactflow';
import { flowToDSL, dslToFlow } from '../dsl-generator';

export function useBidirectionalSync(initialDSL?: string) {
  const [dsl, setDSL] = useState(initialDSL || '');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [syncMode, setSyncMode] = useState<'flow' | 'dsl'>('flow');

  // Flow → DSL
  useEffect(() => {
    if (syncMode === 'flow' && nodes.length > 0) {
      try {
        const newDSL = flowToDSL(nodes, edges);
        setDSL(newDSL);
        setSyncMode('dsl'); // 防止循环更新
      } catch (error) {
        console.error('Failed to convert flow to DSL:', error);
      }
    }
  }, [nodes, edges, syncMode]);

  // DSL → Flow
  useEffect(() => {
    if (syncMode === 'dsl' && dsl) {
      try {
        const { nodes: newNodes, edges: newEdges } = dslToFlow(dsl);
        setNodes(newNodes);
        setEdges(newEdges);
        setSyncMode('flow'); // 防止循环更新
      } catch (error) {
        console.error('Failed to convert DSL to flow:', error);
      }
    }
  }, [dsl, syncMode]);

  const updateDSL = (newDSL: string) => {
    setDSL(newDSL);
    setSyncMode('dsl');
  };

  const updateFlow = (newNodes: Node[], newEdges: Edge[]) => {
    setNodes(newNodes);
    setEdges(newEdges);
    setSyncMode('flow');
  };

  return {
    dsl,
    nodes,
    edges,
    updateDSL,
    updateFlow,
  };
}
```

## 使用场景

### 场景 1: 可视化创建 DSL

```
1. 用户从节点库拖拽"Input"节点到画布
2. 设置输入路径和媒体类型
3. 拖拽"Resize"节点，连接到 Input 节点
4. 设置 Resize 参数（1280x720）
5. 拖拽"Filter"节点，连接到 Resize 节点
6. 设置 Filter 参数（grayscale）
7. 拖拽"Output"节点，连接到 Filter 节点
8. 设置输出路径
9. 自动生成 DSL
```

### 场景 2: 编辑现有 DSL

```
1. 加载现有 DSL
2. 自动转换为节点图
3. 用户可视化编辑节点
4. 实时更新 DSL
```

### 场景 3: 与代码编辑器同步

```
1. 用户在可视化编辑器中编辑
2. 切换到代码编辑器查看生成的 DSL
3. 在代码编辑器中修改 DSL
4. 切换回可视化编辑器，自动更新节点图
```

## 测试计划

### 功能测试

- [ ] 节点创建和删除
- [ ] 节点连接和断开
- [ ] Flow 到 DSL 转换
- [ ] DSL 到 Flow 转换
- [ ] 双向同步
- [ ] 参数编辑
- [ ] 条件节点处理

### 准确性测试

- [ ] 生成的 DSL 语法正确性
- [ ] 生成的 DSL 逻辑正确性
- [ ] 转换的完整性

### 性能测试

- [ ] 大节点图性能
- [ ] 实时转换性能
- [ ] 渲染性能

## 迁移路径

### 阶段 1: 基础实现（3-4周）

1. **React Flow 集成**:
   - 集成 React Flow
   - 实现基础节点类型
   - 实现节点连接

2. **基础转换**:
   - 实现 Flow → DSL 转换
   - 实现 DSL → Flow 转换
   - 测试转换准确性

### 阶段 2: 高级功能（3-4周）

1. **节点库**:
   - 实现完整节点库
   - 实现参数编辑
   - 实现条件节点

2. **双向同步**:
   - 实现与代码编辑器同步
   - 实现实时更新
   - 测试同步准确性

### 阶段 3: 完善和优化（2-3周）

1. **用户体验**:
   - UI 优化
   - 拖拽体验优化
   - 节点样式优化

2. **文档和示例**:
   - 编写使用文档
   - 创建示例项目
   - 更新 README

## 参考

### 相关 RFC

- [RFC-004: @affectjs/dsl - 统一媒体处理 DSL](./completed/0004-fluent-ffmpeg-dsl.md) - **基础**: DSL 语法和解析器
- [RFC-010: Affect Agent](./0010-affect-agent.md) - **集成**: AI 辅助功能
- [RFC-011: Monaco DSL 编辑器](./0011-monaco-dsl-editor.md) - **集成**: 代码编辑模式，双向同步
- [RFC-008: Affect 快速视频编辑器](./0008-affect-video-editor.md) - **应用**: 编辑器集成场景

### 外部文档

- [React Flow 文档](https://reactflow.dev/)
- [React Flow API](https://reactflow.dev/api-reference/components/react-flow)

## 变更日志

### 2025-12-29
- 初始 RFC 创建
- 定义 React Flow 可视化编辑器架构
- 设计节点类型和转换逻辑
- 规划双向同步方案

