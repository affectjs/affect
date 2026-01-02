/**
 * @affectjs/dsl - Compiler to Operations
 *
 * Compiles AST to Operation[] objects (data-first approach)
 */

import type { Operation } from "@affectjs/runtime";

// AST types (moved from compiler.ts)
export interface ASTNode {
    type: string;
    [key: string]: unknown;
}

export interface Program {
    type: "Program";
    commands: ASTNode[];
}

export interface ConvertBlock {
    type: "ConvertBlock";
    commands: ASTNode[];
}

export interface AffectBlock {
    type: "AffectBlock";
    mediaType: "auto" | "video" | "audio" | "image";
    commands: ASTNode[];
}

export interface CompileToOperationsOptions {
    context?: Record<string, unknown>;
    warnings?: boolean; // Enable/disable warnings (default: true)
}

export interface CompiledOperations {
    input: string;
    output?: string;
    mediaType: "auto" | "video" | "audio" | "image";
    operations: Operation[];
    warnings?: string[];
}

/**
 * Resolve value from AST node (Variable, Literal, or direct value)
 */
function resolveValue(value: unknown, context: Record<string, unknown>): unknown {
    if (!value) return null;
    
    if (typeof value === "string" || typeof value === "number") {
        return value;
    }
    
    if (value && typeof value === "object") {
        if (value.type === "Variable") {
            const varName = value.name;
            if (context[varName] !== undefined) {
                return context[varName];
            }
            // Return variable reference (will be resolved at runtime)
            return { __variable: varName };
        } else if (value.type === "Literal") {
            return value.value;
        } else if (value.type === "Property") {
            // Property access like width, height, duration
            // These need to be resolved at runtime with metadata
            return { __property: value.name };
        }
    }
    
    return value;
}

/**
 * Compile AST to Operation[] objects
 */
export function compileToOperations(
    ast: Program | ConvertBlock | AffectBlock,
    options?: CompileToOperationsOptions
): CompiledOperations {
    const context = options?.context || {};
    const warningsEnabled = options?.warnings !== false;
    const warnings: string[] = [];
    const operations: Operation[] = [];

    // Extract input and output from commands
    const commands =
        ast.type === "ConvertBlock" ||
        ast.type === "Program" ||
        ast.type === "AffectBlock"
            ? ast.commands
            : [];

    // Find input and output
    let inputValue: unknown = null;
    let outputValue: unknown = null;
    let mediaType: "auto" | "video" | "audio" | "image" = "auto";

    if (ast.type === "AffectBlock") {
        mediaType = ast.mediaType || "auto";
        const inputCmd = commands.find((cmd) => cmd.type === "Input");
        const outputCmd = commands.find((cmd) => cmd.type === "Save");

        if (inputCmd && inputCmd.path) {
            inputValue = inputCmd.path;
        }
        if (outputCmd && outputCmd.path) {
            outputValue = outputCmd.path;
        }
    } else if (ast.type === "ConvertBlock") {
        const inputCmd = commands.find((cmd) => cmd.type === "Input");
        const outputCmd = commands.find((cmd) => cmd.type === "Save");
        if (inputCmd && inputCmd.path) {
            inputValue = inputCmd.path;
        }
        if (outputCmd && outputCmd.path) {
            outputValue = outputCmd.path;
        }
    }

    // Resolve input and output paths
    const input = resolveValue(inputValue, context);
    const output = outputValue ? resolveValue(outputValue, context) : undefined;

    // Filter operations based on media type
    const videoCommandTypes = [
        "VideoBlock",
        "VideoCodec",
        "VideoBitrate",
        "VideoSize",
        "VideoFPS",
        "VideoFilter",
        "NoVideo",
    ];
    const audioCommandTypes = [
        "AudioBlock",
        "AudioCodec",
        "AudioBitrate",
        "AudioChannels",
        "AudioFrequency",
        "NoAudio",
    ];

    const shouldIgnoreCommand = (cmd: unknown): boolean => {
        if (cmd.type === "Input" || cmd.type === "Save") {
            return true; // Always skip Input and Save
        }

        // For image media type, ignore video and audio commands
        if (mediaType === "image") {
            const isVideoCmd = videoCommandTypes.includes(cmd.type);
            const isAudioCmd = audioCommandTypes.includes(cmd.type);

            if (warningsEnabled && (isVideoCmd || isAudioCmd)) {
                const cmdName = isVideoCmd ? "video" : "audio";
                warnings.push(
                    `Warning: ${cmdName} commands are ignored for image media type (command: ${cmd.type})`
                );
            }

            return isVideoCmd || isAudioCmd;
        }

        // For audio media type, ignore video commands
        if (mediaType === "audio") {
            const isVideoCmd = videoCommandTypes.includes(cmd.type);

            if (warningsEnabled && isVideoCmd) {
                warnings.push(
                    `Warning: video commands are ignored for audio media type (command: ${cmd.type})`
                );
            }

            return isVideoCmd;
        }

        // For video or auto, keep all commands
        return false;
    };

    // Process commands and convert to operations
    const processCommand = (cmd: unknown): void => {
        if (shouldIgnoreCommand(cmd)) {
            return;
        }

        switch (cmd.type) {
            // Conditional logic - will be handled at runtime
            case "IfBlock":
                operations.push({
                    type: "if",
                    condition: cmd.condition,
                    thenOperations: cmd.thenCommands
                        ?.filter((c: unknown) => !shouldIgnoreCommand(c))
                        .map((c: unknown) => commandToOperation(c))
                        .filter(Boolean) || [],
                    elseOperations: cmd.elseCommands
                        ?.filter((c: unknown) => !shouldIgnoreCommand(c))
                        .map((c: unknown) => commandToOperation(c))
                        .filter(Boolean) || [],
                });
                break;

            // Grouped blocks - expand commands
            case "VideoBlock":
            case "AudioBlock":
            case "FilterBlock":
                if (cmd.commands && Array.isArray(cmd.commands)) {
                    cmd.commands.forEach((subCmd: unknown) => processCommand(subCmd));
                }
                break;

            // Unified commands
            case "Resize":
                operations.push({
                    type: "resize",
                    width: resolveValue(cmd.width, context),
                    height: resolveValue(cmd.height, context),
                });
                break;

            case "Encode":
                operations.push({
                    type: "encode",
                    codec: resolveValue(cmd.codec, context),
                    param: resolveValue(cmd.param, context),
                });
                break;

            case "Filter":
                operations.push({
                    type: "filter",
                    name: resolveValue(cmd.name, context),
                    value: resolveValue(cmd.value, context),
                });
                break;

            case "Crop":
                // Crop always uses x, y, width, height format
                // If region is specified, convert to x="center", y="auto"
                operations.push({
                    type: "crop",
                    x: cmd.region ? "center" : resolveValue(cmd.x, context),
                    y: cmd.region ? "auto" : resolveValue(cmd.y, context),
                    width: resolveValue(cmd.width, context),
                    height: resolveValue(cmd.height, context),
                });
                break;

            case "Rotate":
                operations.push({
                    type: "rotate",
                    angle: resolveValue(cmd.angle, context),
                });
                break;

            // Video-specific commands
            case "VideoCodec":
                operations.push({
                    type: "encode",
                    codec: resolveValue(cmd.codec, context),
                });
                break;

            case "VideoBitrate":
                operations.push({
                    type: "encode",
                    codec: "h264", // Default video codec
                    param: resolveValue(cmd.bitrate, context),
                });
                break;

            case "VideoSize":
                { const sizeParts = resolveValue(cmd.size, context)?.split("x") || [];
                operations.push({
                    type: "resize",
                    width: sizeParts[0] || "auto",
                    height: sizeParts[1] || "auto",
                });
                break; }

            case "VideoFPS":
                operations.push({
                    type: "fps",
                    fps: resolveValue(cmd.fps, context),
                });
                break;

            case "VideoFilter":
                operations.push({
                    type: "filter",
                    name: "video",
                    value: resolveValue(cmd.filter, context),
                });
                break;

            // Audio-specific commands
            case "AudioCodec":
                operations.push({
                    type: "encode",
                    codec: resolveValue(cmd.codec, context),
                });
                break;

            case "AudioBitrate":
                operations.push({
                    type: "encode",
                    codec: "aac", // Default audio codec
                    param: resolveValue(cmd.bitrate, context),
                });
                break;

            case "AudioChannels":
                operations.push({
                    type: "channels",
                    channels: resolveValue(cmd.channels, context),
                });
                break;

            case "AudioFrequency":
                operations.push({
                    type: "frequency",
                    frequency: resolveValue(cmd.frequency, context),
                });
                break;

            // Options
            case "Timeout":
                operations.push({
                    type: "timeout",
                    timeout: resolveValue(cmd.timeout, context),
                });
                break;

            case "Format":
                operations.push({
                    type: "format",
                    format: resolveValue(cmd.format, context),
                });
                break;

            // Save command (handled separately)
            case "Save":
                // Already extracted above
                break;

            default:
                if (warningsEnabled) {
                    warnings.push(`Unknown command type: ${cmd.type}`);
                }
                break;
        }
    };

    // Helper to convert command to operation (for nested commands in conditions)
    const commandToOperation = (cmd: unknown): Operation | null => {
        if (shouldIgnoreCommand(cmd)) {
            return null;
        }

        switch (cmd.type) {
            case "Resize":
                return {
                    type: "resize",
                    width: resolveValue(cmd.width, context),
                    height: resolveValue(cmd.height, context),
                };
            case "Encode":
                return {
                    type: "encode",
                    codec: resolveValue(cmd.codec, context),
                    param: resolveValue(cmd.param, context),
                };
            case "Filter":
                return {
                    type: "filter",
                    name: resolveValue(cmd.name, context),
                    value: resolveValue(cmd.value, context),
                };
            case "Crop":
                return {
                    type: "crop",
                    x: cmd.region ? "center" : resolveValue(cmd.x, context),
                    y: cmd.region ? "auto" : resolveValue(cmd.y, context),
                    width: resolveValue(cmd.width, context),
                    height: resolveValue(cmd.height, context),
                };
            case "Rotate":
                return {
                    type: "rotate",
                    angle: resolveValue(cmd.angle, context),
                };
            default:
                return null;
        }
    };

    // Process all commands
    commands.forEach((cmd) => processCommand(cmd));

    // Add save operation if output is specified
    if (output) {
        operations.push({
            type: "save",
            path: typeof output === "string" ? output : String(output),
        });
    }

    return {
        input: typeof input === "string" ? input : String(input),
        output: output ? (typeof output === "string" ? output : String(output)) : undefined,
        mediaType,
        operations,
        warnings: warnings.length > 0 ? warnings : undefined,
    };
}

