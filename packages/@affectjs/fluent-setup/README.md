# @affectjs/fluent-setup

CLI tool for setting up and verifying FFmpeg 6.1.* environment.

**⚠️ Important:** This tool is **designed to work for FFmpeg 6.1.***. Version checking is **enforced by default** - the tool will exit with an error if FFmpeg version is not 6.1.*.

## Purpose

This package is **only responsible for setting up FFmpeg 6.1.***. It does not provide FFmpeg API - that's handled by `@affectjs/fluent-ffmpeg`.

## Features

1. **Detect FFmpeg Installation**: Automatically detects installed FFmpeg
2. **Version Verification**: Ensures FFmpeg version is 6.1.*
3. **Auto Installation**: Can automatically install/upgrade FFmpeg if needed
4. **Shell Configuration**: Automatically configures shell environment variables (bash, zsh, fish, PowerShell, CMD)
5. **Environment Variables**: Sets `FFMPEG_PATH` and `FFPROBE_PATH`

## Installation

```bash
pnpm add -g @affectjs/fluent-setup
```

Or use with npx:

```bash
npx @affectjs/fluent-setup
```

## Requirements

- **FFmpeg 6.1.*** - This tool is designed to work for FFmpeg 6.1.* (any 6.1.x version)
- Node.js >= 18

## Usage

### CLI Command

```bash
fluent-setup setup [options]
```

#### Options

- `-i, --install` - Automatically install/upgrade ffmpeg if needed
- `-s, --silent` - Suppress non-error output
- `--check-only` - Only check environment, do not install
- `--json` - Output results as JSON

#### Examples

```bash
# Check FFmpeg environment and configure shell
fluent-setup setup

# Check and install if needed
fluent-setup setup --install

# Check only (no installation)
fluent-setup setup --check-only

# Get JSON output
fluent-setup setup --json
```

### Programmatic Usage

```typescript
import { setup } from "@affectjs/fluent-setup";

const config = await setup({
    required: true,
    install: false,
    silent: false,
});

console.log("FFMPEG_PATH:", config.ffmpeg);
console.log("Available:", config.available);
```

## Shell Environment Configuration

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

## Integration

This package is used by:
- `@affectjs/fluent-ffmpeg` - Automatically calls `fluent-setup setup` in `prepare` script
- `@affectjs/affect` - Calls `fluent-setup setup` when running `affect setup`

## Development

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
