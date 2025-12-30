# @affectjs/dsl

统一媒体处理 DSL（视频/音频/图像）- 使用 Peggy 解析器

@affectjs/dsl 是一个简洁、AI 友好的领域特定语言，用于描述视频、音频和图像的处理过程。

## Installation

```bash
pnpm add @affectjs/dsl
```

## Usage

### Parse and Compile DSL

```typescript
import { parseDsl, compileDsl, compileDslFile } from '@affectjs/dsl';

// Parse DSL string
const ast = parseDsl('affect video "input.mp4" "output.mp4" { resize 1280 720 }');

// Compile DSL string to JavaScript
const jsCode = compileDsl('affect video "input.mp4" "output.mp4" { resize 1280 720 }');

// Compile DSL file
const jsCode = compileDslFile('video.affect');
```

## DSL Syntax

### Basic Example

```dsl
affect video "input.mp4" "output.mp4" {
  resize 1280 720
  encode h264 2000
  encode aac 128
}
```

### Video Compression with Conditions

```dsl
affect video "input.mp4" "output.mp4" {
  if width > 1920 {
    resize 1920 auto
  }
  encode h264 2000
  encode aac 128
}
```

### Image Processing

```dsl
affect image "photo.jpg" "output.jpg" {
  if width > 1920 {
    resize 1920 1080
  }
  filter grayscale
  encode jpeg 90
}
```

## Supported Commands

See [RFC-004](../docs/rfc/0004-fluent-ffmpeg-dsl.md) for complete syntax reference.

## Development

```bash
# Build
pnpm build

# Generate parser
pnpm generate-parser

# Type check
pnpm type-check
```

## License

MIT

