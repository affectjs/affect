import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { homedir, platform } from "os";
import { join } from "path";

const osPlatform = platform();
const isWindows = /win(32|64)/.test(osPlatform);
const isMacOS = osPlatform === "darwin";
const isLinux = osPlatform === "linux";

export type ShellType = "bash" | "zsh" | "fish" | "powershell" | "cmd" | "unknown";

/**
 * Detect the current shell type
 */
export function detectShell(): ShellType {
    if (isWindows) {
        // Check for PowerShell
        const shell = process.env.SHELL || process.env.COMSPEC || "";
        if (shell.includes("powershell") || shell.includes("pwsh")) {
            return "powershell";
        }
        // Check for cmd.exe
        if (shell.includes("cmd.exe") || process.env.COMSPEC?.includes("cmd.exe")) {
            return "cmd";
        }
        // Default to PowerShell on Windows
        return "powershell";
    }

    // Unix-like systems
    const shell = process.env.SHELL || "";
    if (shell.includes("zsh")) {
        return "zsh";
    }
    if (shell.includes("fish")) {
        return "fish";
    }
    if (shell.includes("bash")) {
        return "bash";
    }

    // Try to detect from parent process
    try {
        const psOutput = execSync("ps -p $$ -o comm=", { encoding: "utf-8" }).trim();
        if (psOutput.includes("zsh")) return "zsh";
        if (psOutput.includes("fish")) return "fish";
        if (psOutput.includes("bash")) return "bash";
    } catch {
        // Fallback
    }

    return "bash"; // Default to bash
}

/**
 * Get the shell configuration file path for the detected shell
 */
export function getShellConfigPath(shell: ShellType): string | null {
    const home = homedir();

    switch (shell) {
        case "bash":
            // Prefer .bash_profile on macOS, .bashrc on Linux
            if (isMacOS) {
                const bashProfile = join(home, ".bash_profile");
                if (existsSync(bashProfile)) {
                    return bashProfile;
                }
            }
            return join(home, ".bashrc");

        case "zsh":
            return join(home, ".zshrc");

        case "fish":
            { const fishConfigDir = join(home, ".config", "fish");
            if (!existsSync(fishConfigDir)) {
                mkdirSync(fishConfigDir, { recursive: true });
            }
            return join(fishConfigDir, "config.fish"); }

        case "powershell":
            // Try PowerShell Core profile first
            { const pwshProfile = join(home, ".config", "powershell", "profile.ps1");
            if (existsSync(join(home, ".config", "powershell"))) {
                return pwshProfile;
            }
            // Try Windows PowerShell profile
            try {
                const profilePath = execSync(
                    'powershell -Command "$PROFILE"',
                    { encoding: "utf-8" }
                ).trim();
                if (profilePath) {
                    return profilePath;
                }
            } catch {
                // Fallback
            }
            return pwshProfile; }

        case "cmd":
            // Windows CMD doesn't use a config file, use registry
            return null;

        default:
            return null;
    }
}

/**
 * Generate environment variable export statements for different shells
 */
export function generateEnvExports(
    shell: ShellType,
    ffmpegPath: string,
    ffprobePath: string
): string {
    const exports: string[] = [];

    switch (shell) {
        case "bash":
        case "zsh":
            exports.push(`export FFMPEG_PATH="${ffmpegPath}"`);
            if (ffprobePath) {
                exports.push(`export FFPROBE_PATH="${ffprobePath}"`);
            }
            break;

        case "fish":
            exports.push(`set -gx FFMPEG_PATH "${ffmpegPath}"`);
            if (ffprobePath) {
                exports.push(`set -gx FFPROBE_PATH "${ffprobePath}"`);
            }
            break;

        case "powershell":
            exports.push(`$env:FFMPEG_PATH = "${ffmpegPath}"`);
            if (ffprobePath) {
                exports.push(`$env:FFPROBE_PATH = "${ffprobePath}"`);
            }
            break;

        case "cmd":
            // CMD uses set command
            exports.push(`set FFMPEG_PATH=${ffmpegPath}`);
            if (ffprobePath) {
                exports.push(`set FFPROBE_PATH=${ffprobePath}`);
            }
            break;

        default:
            exports.push(`export FFMPEG_PATH="${ffmpegPath}"`);
            if (ffprobePath) {
                exports.push(`export FFPROBE_PATH="${ffprobePath}"`);
            }
    }

    return exports.join("\n");
}

/**
 * Check if environment variables are already configured in the shell config file
 */
export function isEnvConfigured(
    configPath: string | null,
    ffmpegPath: string,
    ffprobePath: string
): boolean {
    if (!configPath || !existsSync(configPath)) {
        return false;
    }

    try {
        const content = readFileSync(configPath, "utf-8");
        return (
            content.includes(`FFMPEG_PATH="${ffmpegPath}"`) ||
            content.includes(`FFMPEG_PATH=${ffmpegPath}`) ||
            content.includes(`FFMPEG_PATH="${ffmpegPath.replace(/\\/g, "/")}"`)
        );
    } catch {
        return false;
    }
}

/**
 * Write environment variables to shell configuration file
 */
export function writeShellConfig(
    shell: ShellType,
    ffmpegPath: string,
    ffprobePath: string
): { success: boolean; configPath: string | null; message: string } {
    const configPath = getShellConfigPath(shell);

    if (!configPath) {
        if (shell === "cmd") {
            return {
                success: false,
                configPath: null,
                message:
                    "Windows CMD doesn't support config files. Please set environment variables manually via System Properties.",
            };
        }
        return {
            success: false,
            configPath: null,
            message: `Could not determine configuration file path for shell: ${shell}`,
        };
    }

    // Check if already configured
    if (isEnvConfigured(configPath, ffmpegPath, ffprobePath)) {
        return {
            success: true,
            configPath,
            message: `Environment variables already configured in ${configPath}`,
        };
    }

    try {
        // Read existing content
        let content = "";
        if (existsSync(configPath)) {
            content = readFileSync(configPath, "utf-8");
        }

        // Generate export statements
        const exports = generateEnvExports(shell, ffmpegPath, ffprobePath);

        // Add separator and exports
        const separator = "\n# FFmpeg environment variables (configured by fluent-ffmpeg-cli)\n";
        const newContent = content + separator + exports + "\n";

        // Ensure directory exists
        const dir = configPath.substring(0, configPath.lastIndexOf("/") || configPath.lastIndexOf("\\"));
        if (dir && !existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }

        // Write to file
        writeFileSync(configPath, newContent, "utf-8");

        return {
            success: true,
            configPath,
            message: `Environment variables written to ${configPath}`,
        };
    } catch (error) {
        return {
            success: false,
            configPath,
            message: `Failed to write to ${configPath}: ${(error as Error).message}`,
        };
    }
}

/**
 * Set Windows environment variables via registry (for CMD)
 */
export function setWindowsEnvVars(
    ffmpegPath: string,
    ffprobePath: string
): { success: boolean; message: string } {
    if (!isWindows) {
        return {
            success: false,
            message: "Windows environment variable setting is only available on Windows",
        };
    }

    try {
        // Use setx to set user environment variables
        execSync(`setx FFMPEG_PATH "${ffmpegPath}"`, { stdio: "pipe" });
        if (ffprobePath) {
            execSync(`setx FFPROBE_PATH "${ffprobePath}"`, { stdio: "pipe" });
        }
        return {
            success: true,
            message:
                "Environment variables set. Please restart your terminal for changes to take effect.",
        };
    } catch (error) {
        return {
            success: false,
            message: `Failed to set environment variables: ${(error as Error).message}`,
        };
    }
}

