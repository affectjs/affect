# @luban-ws/fluent-ffmpeg-cli

CLI tool for setting up and verifying FFmpeg environment for fluent-ffmpeg, and running fluent-ffmpeg scripts.

**⚠️ Important:** This CLI is **designed to work for FFmpeg 6.1.***. Version checking is **enforced by default** - the CLI will exit with an error if FFmpeg version is not 6.1.*.

## Features

1. **Setup FFmpeg Environment**: Automatically detects, installs, and configures FFmpeg 6.1.* with shell environment variables
2. **Run Fluent-FFmpeg Scripts**: Execute fluent-ffmpeg scripts with proper environment setup

## Installation

```bash
pnpm add -g @luban-ws/fluent-ffmpeg-cli
```

Or use with npx:

```bash
npx @luban-ws/fluent-ffmpeg-cli
```

## Requirements

- **FFmpeg 6.1.*** - This CLI is designed to work for FFmpeg 6.1.* (any 6.1.x version)
- Node.js >= 18

## Commands

### `setup` - Setup FFmpeg Environment

Setup and verify FFmpeg environment, including:
- Detecting FFmpeg 6.1.* installation
- Installing/upgrading FFmpeg if needed
- **Automatically configuring shell environment variables** (bash, zsh, fish, PowerShell, CMD)
- Setting `FFMPEG_PATH` and `FFPROBE_PATH` in shell configuration files

```bash
fluent-ffmpeg-cli setup [options]
```

#### Options

- `-i, --install` - Automatically install/upgrade ffmpeg if needed
- `-s, --silent` - Suppress non-error output
- `--check-only` - Only check environment, do not install
- `--json` - Output results as JSON
- `-h, --help` - Show help message
- `-V, --version` - Show version number

#### Examples

```bash
# Check FFmpeg environment and configure shell
fluent-ffmpeg-cli setup

# Check and install if needed
fluent-ffmpeg-cli setup --install

# Check only (no installation)
fluent-ffmpeg-cli setup --check-only

# Get JSON output
fluent-ffmpeg-cli setup --json
```

#### Shell Environment Configuration

The `setup` command automatically:
- Detects your shell (bash, zsh, fish, PowerShell, CMD)
- Writes `FFMPEG_PATH` and `FFPROBE_PATH` to your shell configuration file
- Provides instructions to apply changes (e.g., `source ~/.zshrc`)

Supported shells:
- **bash**: `~/.bashrc` or `~/.bash_profile` (macOS)
- **zsh**: `~/.zshrc`
- **fish**: `~/.config/fish/config.fish`
- **PowerShell**: `$PROFILE` or `~/.config/powershell/profile.ps1`
- **Windows CMD**: User environment variables via registry

### `run` - Run Fluent-FFmpeg Script

Execute a JavaScript/TypeScript script that uses fluent-ffmpeg with proper environment setup.

```bash
fluent-ffmpeg-cli run <script> [options]
```

#### Options

- `-s, --silent` - Suppress setup output
- `-h, --help` - Show help message

#### Examples

```bash
# Run a CommonJS script
fluent-ffmpeg-cli run my-script.cjs

# Run a JavaScript script
fluent-ffmpeg-cli run my-script.js

# Run with silent mode
fluent-ffmpeg-cli run my-script.js --silent
```

#### Example Script

```javascript
// my-script.cjs
const ffmpeg = require('@luban-ws/fluent-ffmpeg');

console.log('FFMPEG_PATH:', process.env.FFMPEG_PATH);

ffmpeg('/path/to/input.mp4')
  .videoCodec('libx264')
  .audioCodec('libmp3lame')
  .save('/path/to/output.mp4')
  .on('end', () => {
    console.log('Processing finished!');
  })
  .on('error', (err) => {
    console.error('Error:', err.message);
  });
```

The `run` command automatically:
1. Verifies FFmpeg environment is set up
2. Sets `FFMPEG_PATH` and `FFPROBE_PATH` environment variables
3. Executes your script with proper environment

## Development

This package is built with TypeScript and Vite.

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Type check
pnpm type-check

# Clean build artifacts
pnpm clean
```

## License

MIT

