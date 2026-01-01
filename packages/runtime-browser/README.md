# @affectjs/runtime-browser API Documentation

## Usage

```typescript
import { BrowserRuntime } from "@affectjs/runtime-browser";

// 1. Initialize
const runtime = new BrowserRuntime({
  worker: true,
});

await runtime.ready();

// 2. Prepare inputs
const inputs = {
  "input.mp4": await fetch("path/to/video.mp4").then((res) => res.blob()),
};

// 3. Define DSL
const dsl = {
  input: "file:///input.mp4",
  operations: [{ type: "trim", start: 0, duration: 10 }],
  output: "file:///output.mp4",
};

// 4. Execute
const result = await runtime.execute(dsl, inputs);

if (result.success && result.output) {
  const url = URL.createObjectURL(result.output);
  // Use the resulting URL in a <video> or <img> tag
}
```

## Supported Operations

### Image (VIPS)

- `resize`: `{ type: 'resize', width: number }`
- `crop`: `{ type: 'crop', x: number, y: number, width: number, height: number }`
- `composite`: `{ type: 'composite', overlay: string, x?: number, y?: number }`

### Video/Audio (FFmpeg)

- `trim`: `{ type: 'trim', start: number, duration: number }`
- ... (standard FFmpeg operations)
