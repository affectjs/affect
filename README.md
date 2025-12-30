# @luban-ws/fluent-ffmpeg Monorepo

This is a monorepo for the `@luban-ws/fluent-ffmpeg` package and related packages, managed with **pnpm** and **Nx**.

## 📦 Packages

- **[fluent-ffmpeg](./packages/fluent-ffmpeg)** - A fluent API to FFMPEG for Node.js
- **[fluent-ffmpeg-cli](./packages/fluent-ffmpeg-cli)** - CLI tool for setting up and verifying FFmpeg environment

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- pnpm >= 8

### Installation

```bash
pnpm install
```

### Setup Environment

```bash
pnpm run setup
```

This will check for FFmpeg installation and help you set it up if needed.

You can also use the CLI directly with additional options:

```bash
# Check environment only
pnpm run setup --check-only

# Install/upgrade FFmpeg automatically
pnpm run setup --install

# Get JSON output
pnpm run setup --json

# Require FFmpeg to be present (exit with error if not found)
pnpm run setup --required
```


## 📋 Available Commands

### Root Level Commands

- `pnpm test` - Run tests for all packages
- `pnpm coverage` - Generate coverage report for fluent-ffmpeg
- `pnpm doc` - Generate documentation for fluent-ffmpeg
- `pnpm run setup` - Run setup CLI to check/install FFmpeg environment

### Package-Specific Commands

You can run commands for a specific package using Nx:

```bash
# Run tests for fluent-ffmpeg
pnpm nx test fluent-ffmpeg

# Run setup for fluent-ffmpeg
pnpm nx setup fluent-ffmpeg

# Generate docs for fluent-ffmpeg
pnpm nx doc fluent-ffmpeg

# Generate coverage report
pnpm nx coverage fluent-ffmpeg
```

### Nx Commands

- `pnpm nx graph` - Visualize project dependencies
- `pnpm nx show projects` - List all projects
- `pnpm nx show project <project-name>` - Show project details

## 🏗️ Project Structure

```
.
├── packages/
│   ├── fluent-ffmpeg/     # Main fluent-ffmpeg package
│   └── fluent-ffmpeg-cli/ # CLI tool for FFmpeg setup
├── pnpm-workspace.yaml    # pnpm workspace configuration
├── nx.json                # Nx workspace configuration
└── package.json           # Root package.json
```

## 📚 Documentation

For detailed documentation about the fluent-ffmpeg package, see [packages/fluent-ffmpeg/README.md](./packages/fluent-ffmpeg/README.md).

## 🔧 Adding New Packages

1. Create a new directory under `packages/`
2. Add a `package.json` and `project.json` for the new package
3. Run `pnpm install` to link the workspace

## 🎯 Nx Features

- **Task Caching**: Nx automatically caches task results for faster builds
- **Task Scheduling**: Nx can run tasks in parallel when possible
- **Dependency Graph**: Visualize project dependencies
- **Affected Commands**: Only run tasks for affected projects

## 📝 License

MIT - See [LICENSE](./packages/fluent-ffmpeg/LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please see the individual package READMEs for contribution guidelines.