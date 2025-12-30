/**
 * Main entry point for fluent-ffmpeg-cli
 * Re-exports setup functionality
 */

export {
    setup,
    findExecutable,
    getFfmpegVersion,
    isVersionSupported,
} from "./setup";

export {
    detectShell,
    writeShellConfig,
    setWindowsEnvVars,
    getShellConfigPath,
    type ShellType,
} from "./shell-config";

export type { SetupConfig, SetupOptions } from "./types";
