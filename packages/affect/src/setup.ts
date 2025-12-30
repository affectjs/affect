import { exec, execSync, type ExecSyncOptions } from "child_process";
import { access, constants } from "fs";
import { platform } from "os";
import { promisify } from "util";
import ora from "ora";
import type { SetupConfig, SetupOptions } from "./types";

const execAsync = promisify(exec);

const REQUIRED_VERSION_MAJOR = 6;
const REQUIRED_VERSION_MINOR = 1;
const REQUIRED_VERSION_PATCH = 1;

const osPlatform = platform();
const isWindows = /win(32|64)/.test(osPlatform);
const isMacOS = osPlatform === "darwin";
const isLinux = osPlatform === "linux";

/**
 * Find executable in PATH using which/where command
 */
async function findExecutableInPath(name: string): Promise<string | null> {
    const command = isWindows ? `where ${name}` : `which ${name}`;
    try {
        const { stdout } = await execAsync(command);
        const path = stdout.trim().split("\n")[0]?.trim();
        return path && path.length > 0 ? path : null;
    } catch {
        // Try with .exe extension on Windows
        if (isWindows) {
            try {
                const { stdout } = await execAsync(`where ${name}.exe`);
                const path = stdout.trim().split("\n")[0]?.trim();
                return path && path.length > 0 ? path : null;
            } catch {
                return null;
            }
        }
        return null;
    }
}

/**
 * Find executable in PATH
 */
export async function findExecutable(name: string): Promise<string | null> {
    // First try environment variable
    const envVar = name.toUpperCase() + "_PATH";
    if (process.env[envVar]) {
        try {
            await promisify(access)(process.env[envVar]!, constants.F_OK);
            return process.env[envVar]!;
        } catch {
            // Continue to search in PATH
        }
    }

    // On macOS, check for Homebrew keg-only installations (e.g., ffmpeg@6)
    if (isMacOS && (name === "ffmpeg" || name === "ffprobe")) {
        const brewPaths = [
            `/opt/homebrew/opt/ffmpeg@6/bin/${name}`,
            `/usr/local/opt/ffmpeg@6/bin/${name}`,
        ];
        for (const path of brewPaths) {
            try {
                await promisify(access)(path, constants.F_OK);
                return path;
            } catch {
                // Continue to next path
            }
        }
    }

    // Then try which/where
    return await findExecutableInPath(name);
}

/**
 * Get ffmpeg version
 */
export function getFfmpegVersion(ffmpegPath: string): Promise<{
    major: number;
    minor: number;
    patch: number;
    full: string;
} | null> {
    return new Promise((resolve) => {
        exec(`"${ffmpegPath}" -version`, { timeout: 5000 }, (err, stdout) => {
            if (err) {
                return resolve(null);
            }

            // Parse version from output like "ffmpeg version 4.4.2" or "ffmpeg version n4.4.2"
            const versionMatch = stdout.match(
                /ffmpeg version (?:n)?(\d+)\.(\d+)(?:\.(\d+))?/
            );
            if (!versionMatch) {
                return resolve(null);
            }

            resolve({
                major: parseInt(versionMatch[1]!, 10),
                minor: parseInt(versionMatch[2]!, 10),
                patch: versionMatch[3] ? parseInt(versionMatch[3], 10) : 0,
                full: versionMatch[0]!.replace(/ffmpeg version (?:n)?/, ""),
            });
        });
    });
}

/**
 * Check if version is 6.1.* (allows any 6.1.x version)
 */
export function isVersionSupported(
    version: {
        major: number;
        minor: number;
        patch: number;
    } | null
): boolean {
    if (!version) {
        return false;
    }

    // Allow any 6.1.* version (6.1.0, 6.1.1, 6.1.2, 6.1.3, 6.1.4, etc.)
    return (
        version.major === REQUIRED_VERSION_MAJOR &&
        version.minor === REQUIRED_VERSION_MINOR
    );
}

/**
 * Check if package manager is available
 */
function checkPackageManager(manager: string): Promise<boolean> {
    return new Promise((resolve) => {
        let command: string;
        switch (manager) {
            case "brew":
                command = "which brew";
                break;
            case "apt":
                command = "which apt-get";
                break;
            case "yum":
                command = "which yum";
                break;
            case "choco":
                command = "where choco";
                break;
            case "winget":
                command = "where winget";
                break;
            default:
                return resolve(false);
        }

        exec(command, (err) => {
            resolve(!err);
        });
    });
}

/**
 * Uninstall ffmpeg using appropriate package manager
 */
async function uninstallFfmpeg(
    manager: string,
    silent: boolean
): Promise<void> {
    let uninstallCommand: string;
    switch (manager) {
        case "brew":
            uninstallCommand = "brew uninstall --ignore-dependencies ffmpeg";
            break;
        case "apt":
            uninstallCommand = "sudo apt-get remove -y ffmpeg";
            break;
        case "yum":
            uninstallCommand = "sudo yum remove -y ffmpeg";
            break;
        case "choco":
            uninstallCommand = "choco uninstall ffmpeg -y";
            break;
        case "winget":
            uninstallCommand = "winget uninstall ffmpeg";
            break;
        default:
            throw new Error(`Unsupported package manager: ${manager}`);
    }

    const spinner = silent ? null : ora("Uninstalling FFmpeg...").start();
    try {
        if (spinner) {
            spinner.text = `Running: ${uninstallCommand}`;
        }
        execSync(uninstallCommand, {
            stdio: silent ? "pipe" : "inherit",
        });
        if (spinner) {
            spinner.succeed("FFmpeg uninstalled successfully");
        }
    } catch (err) {
        if (spinner) {
            spinner.fail(
                `Failed to uninstall ffmpeg: ${(err as Error).message}`
            );
        }
        throw new Error(
            `Failed to uninstall ffmpeg: ${(err as Error).message}`
        );
    }
}

/**
 * Install ffmpeg using appropriate package manager
 */
async function installFfmpeg(silent: boolean): Promise<void> {
    let manager: string;
    let installCommand: string;

    if (isMacOS) {
        const brewAvailable = await checkPackageManager("brew");
        if (!brewAvailable) {
            throw new Error(
                "Homebrew is required on macOS. Install it from https://brew.sh"
            );
        }

        // Check if ffmpeg is installed via brew
        try {
            execSync("brew list ffmpeg 2>/dev/null", { stdio: "pipe" });
            installCommand = "brew install ffmpeg@6";
        } catch {
            installCommand = "brew install ffmpeg@6";
        }
        manager = "brew";
    } else if (isLinux) {
        const aptAvailable = await checkPackageManager("apt");
        if (aptAvailable) {
            installCommand =
                "sudo apt-get update && sudo apt-get install -y ffmpeg=7:6.1.1-*";
            manager = "apt";
        } else {
            const yumAvailable = await checkPackageManager("yum");
            if (yumAvailable) {
                installCommand = "sudo yum install -y ffmpeg-6.1.1";
                manager = "yum";
            } else {
                throw new Error(
                    "No supported package manager found (apt-get or yum required)"
                );
            }
        }
    } else if (isWindows) {
        const wingetAvailable = await checkPackageManager("winget");
        if (wingetAvailable) {
            installCommand = "winget install ffmpeg --version 6.1.1";
            manager = "winget";
        } else {
            const chocoAvailable = await checkPackageManager("choco");
            if (chocoAvailable) {
                installCommand = "choco install ffmpeg --version=6.1.1 -y";
                manager = "choco";
            } else {
                throw new Error(
                    "No supported package manager found (winget or chocolatey required)"
                );
            }
        }
    } else {
        throw new Error(`Unsupported operating system: ${osPlatform}`);
    }

    const spinner = silent
        ? null
        : ora(`Installing FFmpeg 6.1.* using ${manager}...`).start();
    try {
        if (spinner) {
            spinner.text = `Running: ${installCommand}`;
        }
        execSync(installCommand, {
            stdio: silent ? "pipe" : "inherit",
        });
        if (spinner) {
            spinner.succeed("FFmpeg 6.1.* installed successfully!");
        }
    } catch (err) {
        if (spinner) {
            spinner.fail(`Failed to install ffmpeg: ${(err as Error).message}`);
        }
        throw new Error(`Failed to install ffmpeg: ${(err as Error).message}`);
    }
}

/**
 * Get package manager for current platform
 */
async function getPackageManager(): Promise<string | null> {
    if (isMacOS) {
        return (await checkPackageManager("brew")) ? "brew" : null;
    } else if (isLinux) {
        if (await checkPackageManager("apt")) return "apt";
        if (await checkPackageManager("yum")) return "yum";
        return null;
    } else if (isWindows) {
        if (await checkPackageManager("winget")) return "winget";
        if (await checkPackageManager("choco")) return "choco";
        return null;
    }
    return null;
}

/**
 * Setup environment for FFmpeg
 */
export async function setup(options: SetupOptions): Promise<SetupConfig> {
    const config: SetupConfig = {
        ffmpeg: null,
        ffprobe: null,
        ffmpegVersion: null,
        available: false,
    };

    // Find ffmpeg
    const ffmpegPath = await findExecutable("ffmpeg");
    if (!ffmpegPath) {
        if (options.install) {
            await installFfmpeg(options.silent ?? false);
            // Re-check after installation
            const newPath = await findExecutable("ffmpeg");
            if (newPath) {
                config.ffmpeg = newPath;
                process.env.FFMPEG_PATH = newPath;
                const version = await getFfmpegVersion(newPath);
                if (version) {
                    config.ffmpegVersion = version;
                    // Show version after installation if not silent
                    if (!options.silent) {
                        const spinner = ora(
                            `Checking installed FFmpeg version...`
                        ).start();
                        const supported = isVersionSupported(version);
                        spinner.succeed(
                            `FFmpeg version: ${version.full} ${
                                supported ? "✓ (6.1.*)" : "⚠ (not 6.1.*)"
                            }`
                        );
                    }
                }
            }
        } else if (options.required) {
            throw new Error("ffmpeg is required but not found");
        }
    } else {
        config.ffmpeg = ffmpegPath;
        if (!process.env.FFMPEG_PATH) {
            process.env.FFMPEG_PATH = ffmpegPath;
        }

        // Get version
        const version = await getFfmpegVersion(ffmpegPath);
        if (version) {
            config.ffmpegVersion = version;
            const supported = isVersionSupported(version);

            // Show version information if not silent
            if (!options.silent) {
                const spinner = ora(`Checking FFmpeg version...`).start();
                spinner.succeed(
                    `FFmpeg version: ${version.full} ${
                        supported ? "✓ (6.1.*)" : "⚠ (not 6.1.*)"
                    }`
                );
            }

            if (!supported) {
                // Version is not 6.1.*, need to uninstall and reinstall
                if (options.install) {
                    const manager = await getPackageManager();
                    if (manager) {
                        await uninstallFfmpeg(manager, options.silent ?? false);
                        await installFfmpeg(options.silent ?? false);
                        // Re-check after installation
                        const newPath = await findExecutable("ffmpeg");
                        if (newPath) {
                            config.ffmpeg = newPath;
                            process.env.FFMPEG_PATH = newPath;
                            const newVersion = await getFfmpegVersion(newPath);
                            if (newVersion) {
                                config.ffmpegVersion = newVersion;
                                // Show version after reinstallation if not silent
                                if (!options.silent) {
                                    const spinner = ora(
                                        `Verifying installed FFmpeg version...`
                                    ).start();
                                    const supported =
                                        isVersionSupported(newVersion);
                                    spinner.succeed(
                                        `FFmpeg version: ${newVersion.full} ${
                                            supported
                                                ? "✓ (6.1.1)"
                                                : "⚠ (not 6.1.1)"
                                        }`
                                    );
                                }
                            }
                        }
                    } else {
                        throw new Error(
                            "Package manager not found. Cannot uninstall/reinstall FFmpeg."
                        );
                    }
                } else if (options.required) {
                    throw new Error(
                        `FFmpeg version ${version.full} is not supported. Required: 6.1.*`
                    );
                }
            }
        }
    }

    // Find ffprobe
    const ffprobePath = await findExecutable("ffprobe");
    if (ffprobePath) {
        config.ffprobe = ffprobePath;
        if (!process.env.FFPROBE_PATH) {
            process.env.FFPROBE_PATH = ffprobePath;
        }
    } else if (options.required) {
        throw new Error("ffprobe is required but not found");
    }

    config.available = !!(config.ffmpeg && config.ffprobe);
    return config;
}
