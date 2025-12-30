# @affectjs/affect

AffectJS CLI - Easy way to run affect DSL and setup FFmpeg environment

## Features

1. **Setup FFmpeg Environment**: Automatically sets up FFmpeg 6.1.\* by calling `fluent-setup`
2. **Run Affect DSL**: Execute `.affect` DSL files directly
3. **Compile DSL**: Compile `.affect` files to JavaScript or Operation[] data

## Installation

```bash
pnpm add -g @affectjs/affect
```

Or use with npx:

```bash
npx @affectjs/affect
```

## Requirements

- **FFmpeg 6.1.\*** - Automatically set up via `fluent-setup`
- Node.js >= 18

## Commands

### `setup` - Setup FFmpeg Environment

Delegates to `fluent-setup` to configure FFmpeg 6.1.\* environment.

```bash
affect setup [options]
```

#### Options

- `-i, --install` - Automatically install/upgrade ffmpeg if needed
- `-s, --silent` - Suppress non-error output
- `--check-only` - Only check environment, do not install
- `--json` - Output results as JSON

#### Examples

```bash
# Check FFmpeg environment
affect setup

# Check and install if needed
affect setup --install

# Check only (no installation)
affect setup --check-only
```

### `run` - Run Affect DSL File

Execute an `.affect` DSL file directly.

```bash
affect run <dsl-file> [options]
```

#### Options

- `-o, --output <path>` - Override output file path
- `-s, --silent` - Suppress output
- `--no-setup` - Skip FFmpeg setup check

#### Examples

```bash
# Run a DSL file
affect run video.affect

# Run with custom output
affect run video.affect -o output.mp4

# Run without setup check
affect run video.affect --no-setup
```

#### Example DSL File

```dsl
affect video "input.mp4" "output.mp4" {
  resize 1280 720
  encode h264 2000
  encode aac 128
}
```

### `compile` - Compile DSL to JavaScript or Operation[]

Compile an `.affect` DSL file to JavaScript code (for edge functions) or Operation[] data (default).

```bash
affect compile <dsl-file> [options]
```

#### Options

- `-o, --output <path>` - Output file path (default: same name with .js or .json extension)
- `--to-edge` - Compile to JavaScript code for edge functions (Vercel, Cloudflare, Deno, etc.)
- `--target <runtime>` - Target edge runtime (vercel, cloudflare, deno, generic)

#### Examples

```bash
# Compile DSL to Operation[] (JSON format, default)
affect compile video.affect

# Compile to JavaScript for edge functions
affect compile video.affect --to-edge

# Compile for specific edge runtime
affect compile video.affect --to-edge --target vercel
```

## Architecture

The `@affectjs/affect` CLI package orchestrates:

1. **@affectjs/fluent-setup** - Sets up FFmpeg environment
2. **@affectjs/dsl** - Compiles DSL files
3. **@affectjs/runtime** - Executes compiled DSL operations

## Dependencies

- `@affectjs/fluent-setup` (workspace:\*) - For FFmpeg setup
- `@affectjs/dsl` (workspace:\*) - For DSL compilation
- `@affectjs/runtime` (workspace:\*) - For DSL execution

## License

MIT
