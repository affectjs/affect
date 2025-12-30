#!/usr/bin/env node
/**
 * AffectJS CLI
 *
 * Easy way to run affect DSL and setup FFmpeg environment
 */

import { Command } from "commander";
import { readFileSync, existsSync } from "fs";
import { dirname, join, extname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

// Get version from package.json
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
    .name("affect")
    .description("AffectJS CLI - Easy way to run affect DSL")
    .version(version);

// Setup subcommand - delegates to fluent-setup
program
    .command("setup")
    .description("Setup FFmpeg 6.1.* environment (calls fluent-setup)")
    .option(
        "-i, --install",
        "Automatically install/upgrade ffmpeg if needed",
        false
    )
    .option("-s, --silent", "Suppress non-error output", false)
    .option("--check-only", "Only check environment, do not install", false)
    .option("--json", "Output results as JSON", false)
    .action(async (opts: {
        install?: boolean;
        silent?: boolean;
        checkOnly?: boolean;
        json?: boolean;
    }) => {
        // Import and call fluent-setup programmatically
        try {
            const fluentSetup = await import("@affectjs/fluent-setup");
            const {
                setup,
                isVersionSupported,
                detectShell,
                writeShellConfig,
                setWindowsEnvVars,
                getShellConfigPath,
            } = fluentSetup;

            const options = {
                required: true,
                install: opts.install && !opts.checkOnly,
                silent: opts.silent,
            };

            const config = await setup(options);

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
                console.log("  FFPROBE_PATH:", config.ffprobe || "not found");
                if (config.ffmpegVersion) {
                    const supported = isVersionSupported(config.ffmpegVersion);
                    console.log(
                        "  FFmpeg version:",
                        config.ffmpegVersion.full,
                        supported ? "✓ (6.1.*)" : "⚠ (not 6.1.*)"
                    );
                }
                console.log("  Available:", config.available ? "yes" : "no");

                // Configure shell environment
                if (config.ffmpeg && config.available) {
                    const shell = detectShell();
                    console.log(`\nDetected shell: ${shell}`);

                    if (shell === "cmd") {
                        const result = setWindowsEnvVars(
                            config.ffmpeg,
                            config.ffprobe || ""
                        );
                        if (result.success) {
                            console.log(`  ✓ ${result.message}`);
                        } else {
                            console.log(`  ⚠ ${result.message}`);
                        }
                    } else {
                        const result = writeShellConfig(
                            shell,
                            config.ffmpeg,
                            config.ffprobe || ""
                        );
                        if (result.success) {
                            console.log(`  ✓ ${result.message}`);
                            const configPath = getShellConfigPath(shell);
                            if (configPath) {
                                console.log(`  Please run: source ${configPath}`);
                            }
                        }
                    }
                }
            }

            // Enforce version requirement
            if (
                config.ffmpegVersion &&
                !isVersionSupported(config.ffmpegVersion)
            ) {
                console.error(
                    "\n❌ Error: FFmpeg version requirement not met"
                );
                console.error(`   Found: ${config.ffmpegVersion.full}`);
                console.error("   Required: FFmpeg 6.1.*");
                process.exit(1);
            }

            if (!config.available) {
                console.error("\n❌ Error: Required binaries not found");
                process.exit(1);
            }

            process.exit(0);
        } catch (err) {
            console.error("Setup failed:", (err as Error).message);
            process.exit(1);
        }
    });

// Run subcommand - execute affect DSL files
program
    .command("run")
    .description("Run an affect DSL file (.affect)")
    .argument("<dsl-file>", "Path to .affect DSL file")
    .option("-o, --output <path>", "Output file path (overrides DSL output)")
    .option("-s, --silent", "Suppress output", false)
    .option("--no-setup", "Skip FFmpeg setup check", false)
    .action(async (
        dslFile: string,
        opts: {
            output?: string;
            silent?: boolean;
            setup?: boolean;
        }
    ) => {
        try {
            // Check if DSL file exists
            if (!existsSync(dslFile)) {
                console.error(`Error: DSL file not found: ${dslFile}`);
                process.exit(1);
            }

            // Check file extension
            const ext = extname(dslFile).toLowerCase();
            if (ext !== ".affect") {
                console.error(
                    `Error: Invalid file type. Expected .affect file, got: ${ext}`
                );
                process.exit(1);
            }

            // Setup FFmpeg environment if needed
            if (opts.setup !== false) {
                if (!opts.silent) {
                    console.log("Checking FFmpeg environment...");
                }

                try {
                    const { setup } = await import("@affectjs/fluent-setup");
                    const config = await setup({
                        required: false,
                        install: false,
                        silent: opts.silent,
                    });

                    if (!config.available || !config.ffmpeg) {
                        if (!opts.silent) {
                            console.log("\nFFmpeg environment not set up. Running setup...");
                        }
                        // Run setup with install
                        await setup({
                            required: true,
                            install: true,
                            silent: opts.silent,
                        });
                    }
                } catch (err) {
                    console.error("FFmpeg setup failed:", (err as Error).message);
                    process.exit(1);
                }
            }

            // Import DSL compiler and runtime
            const { compileDslFile } = await import("@affectjs/dsl");
            const { execute } = await import("@affectjs/runtime");

            if (!opts.silent) {
                console.log(`\nCompiling DSL: ${dslFile}`);
            }

            // Compile DSL to operations
            const compiled = compileDslFile(dslFile);

            if (!opts.silent) {
                console.log("Executing DSL...\n");
            }

            // Execute compiled operations
            const result = await execute(compiled, {
                // Pass output override if provided
                ...(opts.output ? { output: opts.output } : {}),
            });

            if (result.success) {
                if (!opts.silent) {
                    console.log("\n✓ DSL execution completed successfully");
                    if (result.output) {
                        console.log(`  Output: ${result.output}`);
                    }
                }
                process.exit(0);
            } else {
                console.error("\n❌ DSL execution failed");
                if (result.error) {
                    console.error(`  Error: ${result.error.message}`);
                }
                process.exit(1);
            }
        } catch (err) {
            console.error("Error:", (err as Error).message);
            process.exit(1);
        }
    });

// Compile subcommand - compile DSL to JavaScript
program
    .command("compile")
    .description("Compile an affect DSL file to JavaScript")
    .argument("<dsl-file>", "Path to .affect DSL file")
    .option("-o, --output <path>", "Output JavaScript file path")
    .action(async (dslFile: string, opts: { output?: string }) => {
        try {
            if (!existsSync(dslFile)) {
                console.error(`Error: DSL file not found: ${dslFile}`);
                process.exit(1);
            }

            const ext = extname(dslFile).toLowerCase();
            if (ext !== ".affect") {
                console.error(
                    `Error: Invalid file type. Expected .affect file, got: ${ext}`
                );
                process.exit(1);
            }

            const { compileDslFile } = await import("@affectjs/dsl");
            const outputPath = opts.output || dslFile.replace(/\.affect$/, ".json");
            const compiled = compileDslFile(dslFile);
            
            // Write to output file as JSON
            const { writeFileSync } = await import("fs");
            writeFileSync(outputPath, JSON.stringify(compiled, null, 2), "utf-8");

            console.log(`✓ DSL compiled successfully`);
            console.log(`  Output: ${outputPath}`);
        } catch (err) {
            console.error("Error:", (err as Error).message);
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
