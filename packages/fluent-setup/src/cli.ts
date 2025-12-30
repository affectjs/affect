#!/usr/bin/env node
/**
 * CLI tool for fluent-ffmpeg environment setup
 *
 * This CLI helps configure the FFmpeg environment by:
 * - Detecting ffmpeg and ffprobe binaries
 * - Checking version compatibility (designed for FFmpeg 6.1.*)
 * - Installing/updating ffmpeg to supported versions if needed
 * - Setting up environment variables
 */

import { Command } from "commander";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { platform } from "os";
import { fileURLToPath } from "url";
import { setup, isVersionSupported } from "./setup";
import {
    detectShell,
    writeShellConfig,
    setWindowsEnvVars,
    getShellConfigPath,
} from "./shell-config";
import type { SetupConfig, CliOptions } from "./types";

// Get version from package.json (use import.meta.url to get current file location)
let version = "1.0.0";
try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packageJsonPath = join(__dirname, "../package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    version = packageJson.version || "1.0.0";
} catch (e) {
    // Fallback to default version
}

const program = new Command();

program
    .name("fluent-setup")
    .description("CLI tool for setting up FFmpeg 6.1.* environment")
    .version(version);

// Setup subcommand
program
    .command("setup")
    .description(
        "Setup and verify FFmpeg environment for fluent-ffmpeg (designed for FFmpeg 6.1.*)"
    )
    .option(
        "-i, --install",
        "Automatically install/upgrade ffmpeg if needed",
        false
    )
    .option("-s, --silent", "Suppress non-error output", false)
    .option("--check-only", "Only check environment, do not install", false)
    .option("--json", "Output results as JSON", false)
    .action((opts: CliOptions) => {
        const options = {
            required: true, // Always enforce requirements
            install: opts.install && !opts.checkOnly,
            silent: opts.silent,
        };

        setup(options)
            .then((config: SetupConfig) => {
                if (opts.json) {
                    console.log(
                        JSON.stringify({
                            success: true,
                            config: {
                                ffmpeg: config.ffmpeg,
                                ffprobe: config.ffprobe,
                                ffmpegVersion: config.ffmpegVersion
                                    ? config.ffmpegVersion.full
                                    : null,
                                available: config.available,
                                versionSupported: config.ffmpegVersion
                                    ? isVersionSupported(config.ffmpegVersion)
                                    : false,
                            },
                        })
                    );
                } else {
                    console.log("\nEnvironment setup complete:");
                    console.log("  FFMPEG_PATH:", config.ffmpeg || "not found");
                    console.log(
                        "  FFPROBE_PATH:",
                        config.ffprobe || "not found"
                    );
                    if (config.ffmpegVersion) {
                        const supported = isVersionSupported(
                            config.ffmpegVersion
                        );
                        console.log(
                            "  FFmpeg version:",
                            config.ffmpegVersion.full,
                            supported ? "✓ (6.1.*)" : "⚠ (not 6.1.*)"
                        );
                    } else {
                        console.log("  FFmpeg version: not found");
                    }
                    console.log(
                        "  Available:",
                        config.available ? "yes" : "no"
                    );
                    
                    // Automatically configure shell environment
                    if (config.ffmpeg && config.available) {
                        const shell = detectShell();
                        console.log(`\nDetected shell: ${shell}`);
                        
                        if (shell === "cmd") {
                            // Windows CMD: use setx
                            const result = setWindowsEnvVars(
                                config.ffmpeg,
                                config.ffprobe || ""
                            );
                            if (result.success) {
                                console.log(`  ✓ ${result.message}`);
                            } else {
                                console.log(`  ⚠ ${result.message}`);
                                console.log(
                                    `  Manual setup: setx FFMPEG_PATH "${config.ffmpeg}"`
                                );
                                if (config.ffprobe) {
                                    console.log(
                                        `  Manual setup: setx FFPROBE_PATH "${config.ffprobe}"`
                                    );
                                }
                            }
                        } else {
                            // Unix shells: write to config file
                            const result = writeShellConfig(
                                shell,
                                config.ffmpeg,
                                config.ffprobe || ""
                            );
                            if (result.success) {
                                console.log(`  ✓ ${result.message}`);
                                const configPath = getShellConfigPath(shell);
                                if (configPath) {
                                    console.log(
                                        `  Please run: source ${configPath}`
                                    );
                                    console.log(
                                        `  Or restart your terminal to apply changes.`
                                    );
                                }
                            } else {
                                console.log(`  ⚠ ${result.message}`);
                                console.log("\nManual setup:");
                                if (shell === "fish") {
                                    console.log(
                                        `  set -gx FFMPEG_PATH "${config.ffmpeg}"`
                                    );
                                    if (config.ffprobe) {
                                        console.log(
                                            `  set -gx FFPROBE_PATH "${config.ffprobe}"`
                                        );
                                    }
                                } else if (shell === "powershell") {
                                    console.log(
                                        `  $env:FFMPEG_PATH = "${config.ffmpeg}"`
                                    );
                                    if (config.ffprobe) {
                                        console.log(
                                            `  $env:FFPROBE_PATH = "${config.ffprobe}"`
                                        );
                                    }
                                } else {
                                    console.log(
                                        `  export FFMPEG_PATH="${config.ffmpeg}"`
                                    );
                                    if (config.ffprobe) {
                                        console.log(
                                            `  export FFPROBE_PATH="${config.ffprobe}"`
                                        );
                                    }
                                }
                            }
                        }
                    }
                }

                // Enforce FFmpeg 6.1.* requirement by default
                if (
                    config.ffmpegVersion &&
                    !isVersionSupported(config.ffmpegVersion)
                ) {
                    if (opts.json) {
                        console.log(
                            JSON.stringify({
                                success: false,
                                error: `FFmpeg version ${config.ffmpegVersion.full} does not meet requirements. This CLI is designed to work for FFmpeg 6.1.*.`,
                                config: {
                                    ffmpeg: config.ffmpeg,
                                    ffprobe: config.ffprobe,
                                    ffmpegVersion: config.ffmpegVersion.full,
                                    available: config.available,
                                    versionSupported: false,
                                },
                            })
                        );
                    } else {
                        console.error(
                            "\n❌ Error: FFmpeg version requirement not met"
                        );
                        console.error(`   Found: ${config.ffmpegVersion.full}`);
                        console.error("   Required: FFmpeg 6.1.*");
                        console.error(
                            "\nThis CLI is designed to work for FFmpeg 6.1.* and will not work with other versions."
                        );
                        console.error(
                            "\nTip: Use --install flag to uninstall and install FFmpeg 6.1.*"
                        );
                    }
                    process.exit(1);
                }

                // Always enforce that binaries are available
                if (!config.available) {
                    if (opts.json) {
                        console.log(
                            JSON.stringify({
                                success: false,
                                error: "Required binaries (ffmpeg/ffprobe) not found",
                                config: {
                                    ffmpeg: config.ffmpeg,
                                    ffprobe: config.ffprobe,
                                    available: false,
                                },
                            })
                        );
                    } else {
                        console.error(
                            "\n❌ Error: Required binaries not found"
                        );
                        console.error(
                            "   FFmpeg and ffprobe must be installed and available in PATH"
                        );
                        console.error(
                            "\nTip: Use --install flag to automatically install ffmpeg"
                        );
                    }
                    process.exit(1);
                }

                process.exit(0);
            })
            .catch((err: Error) => {
                if (opts.json) {
                    console.log(
                        JSON.stringify({
                            success: false,
                            error: err.message,
                            config: {
                                ffmpeg: null,
                                ffprobe: null,
                                ffmpegVersion: null,
                                available: false,
                            },
                        })
                    );
                } else {
                    console.error("Setup failed:", err.message);
                    if (opts.install) {
                        console.error(
                            "\nTip: Use --install flag to automatically install/upgrade ffmpeg"
                        );
                    }
                }
                process.exit(1);
            });
    });

// Run subcommand - execute a fluent-ffmpeg script
program
    .command("run")
    .description("Run a fluent-ffmpeg script with proper environment setup")
    .argument("<script>", "Path to JavaScript/TypeScript file using fluent-ffmpeg")
    .option("-s, --silent", "Suppress setup output", false)
    .action(async (scriptPath: string, opts: { silent: boolean }) => {
        // First ensure environment is set up
        const setupOptions = {
            required: true,
            install: false,
            silent: opts.silent,
        };

        try {
            const config = await setup(setupOptions);
            
            if (!config.available || !config.ffmpeg) {
                console.error("❌ Error: FFmpeg environment not properly configured");
                console.error("   Please run 'fluent-ffmpeg-cli setup' first");
                process.exit(1);
            }

            // Set environment variables in current process
            process.env.FFMPEG_PATH = config.ffmpeg;
            if (config.ffprobe) {
                process.env.FFPROBE_PATH = config.ffprobe;
            }

            if (!opts.silent) {
                console.log(`\n✓ FFmpeg environment configured:`);
                console.log(`  FFMPEG_PATH: ${config.ffmpeg}`);
                if (config.ffprobe) {
                    console.log(`  FFPROBE_PATH: ${config.ffprobe}`);
                }
                console.log(`\nRunning script: ${scriptPath}\n`);
            }

            // Execute the script
            const { spawn } = await import("child_process");
            const { fileURLToPath } = await import("url");
            const { dirname, resolve } = await import("path");
            
            // Use node to execute the script
            const nodeProcess = spawn("node", [scriptPath], {
                stdio: "inherit",
                env: {
                    ...process.env,
                    FFMPEG_PATH: config.ffmpeg,
                    FFPROBE_PATH: config.ffprobe || "",
                },
            });

            nodeProcess.on("error", (err) => {
                console.error(`Failed to execute script: ${err.message}`);
                process.exit(1);
            });

            nodeProcess.on("exit", (code) => {
                process.exit(code || 0);
            });
        } catch (err) {
            console.error("Setup failed:", (err as Error).message);
            process.exit(1);
        }
    });

// Parse arguments
program.parse(process.argv);

// If no command provided, show help
if (!process.argv.slice(2).length) {
    program.outputHelp();
    process.exit(0);
}
