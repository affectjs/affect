# fluent-ffmpeg Examples

This package contains example scripts demonstrating various features of fluent-ffmpeg.

## Examples

- **express-stream.js** - Express.js server streaming video conversion
- **full.js** - Complete video conversion with all options
- **any-to-mp4-steam.js** - Convert any video format to MP4 using streams
- **image2video.js** - Convert image to video
- **progress.js** - Monitor conversion progress
- **thumbnails.js** - Generate video thumbnails
- **metadata.js** - Extract video metadata
- **livertmp2hls.js** - Convert RTMP live stream to HLS
- **mergeVideos.js** - Merge multiple videos
- **preset.js** - Use presets for video conversion
- **input-stream.js** - Process video from input stream
- **stream.js** - Stream video conversion
- **web-ui-server.js** - Web UI server using Bun - Upload videos and test conversions with a beautiful interface

## Usage

Before running examples, make sure you have:

1. FFmpeg installed and configured
2. Updated the file paths in the examples to point to your test videos
3. Installed dependencies: `pnpm install`

### Interactive Mode (Recommended)

Run the interactive script to select and run an example:

```bash
pnpm run run
```

Or directly:

```bash
node run-example.js
```

Or with a specific example number:

```bash
node run-example.js 1
```

### Direct Execution

Run examples directly using npm scripts:

```bash
pnpm run example:<example-name>
```

Or directly with node:

```bash
node examples/<example-file>.js
```

### Web UI Server (Bun Required)

Run the interactive web interface:

```bash
pnpm run web-ui
```

Or directly:

```bash
bun run examples/web-ui-server.js
```

This will start a web server at `http://localhost:3000` where you can:

- Upload video files
- Configure conversion options (format, codec, bitrate, resolution, etc.)
- Monitor real-time conversion progress
- Download converted videos

**Note**: This example requires [Bun](https://bun.sh) runtime. Install it from https://bun.sh

## Test Assets

Test video files are located in the `assets/` directory. Make sure to update the paths in examples to use these test files.
