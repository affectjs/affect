/**
 * Fluent-FFmpeg DSL Compiler
 * 
 * Compiles DSL (JSON/YAML) configuration to executable fluent-ffmpeg code
 */

import { writeFileSync, readFileSync } from "fs";
import { dirname, join, extname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface DslConfig {
    input: string | string[];
    output: string;
    video?: {
        codec?: string;
        bitrate?: string | number;
        size?: string;
        fps?: number;
        filters?: Array<string | { filter: string; options?: string | string[] | Record<string, unknown> }>;
        noVideo?: boolean;
    };
    audio?: {
        codec?: string;
        bitrate?: string | number;
        channels?: number;
        frequency?: number;
        noAudio?: boolean;
    };
    options?: {
        timeout?: number;
        overwrite?: boolean;
        format?: string;
    };
    events?: {
        onStart?: string;
        onEnd?: string;
        onError?: string;
        onProgress?: string;
    };
}

/**
 * Compile DSL configuration to JavaScript code
 */
export function compileDslToJs(config: DslConfig, outputPath?: string): string {
    const lines: string[] = [];
    
    // Header
    lines.push("// Generated code from fluent-ffmpeg DSL");
    lines.push("const ffmpeg = require('@luban-ws/fluent-ffmpeg');");
    lines.push("");

    // Handle inputs
    const inputs = Array.isArray(config.input) ? config.input : [config.input];
    const commandVar = "command";
    
    if (inputs.length === 1) {
        lines.push(`const ${commandVar} = ffmpeg('${inputs[0]}');`);
    } else {
        lines.push(`const ${commandVar} = ffmpeg('${inputs[0]}');`);
        for (let i = 1; i < inputs.length; i++) {
            lines.push(`${commandVar}.input('${inputs[i]}');`);
        }
    }
    lines.push("");

    // Video options
    if (config.video) {
        if (config.video.noVideo) {
            lines.push(`${commandVar}.noVideo();`);
        } else {
            if (config.video.codec) {
                lines.push(`${commandVar}.videoCodec('${config.video.codec}');`);
            }
            if (config.video.bitrate !== undefined) {
                const bitrate = typeof config.video.bitrate === 'number' 
                    ? config.video.bitrate 
                    : `'${config.video.bitrate}'`;
                lines.push(`${commandVar}.videoBitrate(${bitrate});`);
            }
            if (config.video.size) {
                lines.push(`${commandVar}.size('${config.video.size}');`);
            }
            if (config.video.fps) {
                lines.push(`${commandVar}.fps(${config.video.fps});`);
            }
            if (config.video.filters && config.video.filters.length > 0) {
                const filters = config.video.filters.map(filter => {
                    if (typeof filter === 'string') {
                        return `'${filter}'`;
                    } else {
                        const filterObj: unknown = { filter: filter.filter };
                        if (filter.options) {
                            if (typeof filter.options === 'string') {
                                filterObj.options = filter.options;
                            } else if (Array.isArray(filter.options)) {
                                filterObj.options = filter.options;
                            } else {
                                filterObj.options = filter.options;
                            }
                        }
                        return JSON.stringify(filterObj);
                    }
                });
                if (filters.length === 1) {
                    lines.push(`${commandVar}.videoFilters(${filters[0]});`);
                } else {
                    lines.push(`${commandVar}.videoFilters([${filters.join(', ')}]);`);
                }
            }
        }
    }

    // Audio options
    if (config.audio) {
        if (config.audio.noAudio) {
            lines.push(`${commandVar}.noAudio();`);
        } else {
            if (config.audio.codec) {
                lines.push(`${commandVar}.audioCodec('${config.audio.codec}');`);
            }
            if (config.audio.bitrate !== undefined) {
                const bitrate = typeof config.audio.bitrate === 'number' 
                    ? config.audio.bitrate 
                    : `'${config.audio.bitrate}'`;
                lines.push(`${commandVar}.audioBitrate(${bitrate});`);
            }
            if (config.audio.channels) {
                lines.push(`${commandVar}.audioChannels(${config.audio.channels});`);
            }
            if (config.audio.frequency) {
                lines.push(`${commandVar}.audioFrequency(${config.audio.frequency});`);
            }
        }
    }

    // Options
    if (config.options) {
        if (config.options.timeout) {
            lines.push(`${commandVar}.options({ timeout: ${config.options.timeout} });`);
        }
        if (config.options.format) {
            lines.push(`${commandVar}.format('${config.options.format}');`);
        }
    }

    // Events
    if (config.events) {
        if (config.events.onStart) {
            lines.push(`${commandVar}.on('start', ${config.events.onStart});`);
        }
        if (config.events.onProgress) {
            lines.push(`${commandVar}.on('progress', ${config.events.onProgress});`);
        }
        if (config.events.onEnd) {
            lines.push(`${commandVar}.on('end', ${config.events.onEnd});`);
        }
        if (config.events.onError) {
            lines.push(`${commandVar}.on('error', ${config.events.onError});`);
        }
    }

    // Output
    lines.push("");
    if (config.output) {
        lines.push(`${commandVar}.save('${config.output}');`);
    } else {
        lines.push(`${commandVar}.run();`);
    }

    const code = lines.join("\n");
    
    if (outputPath) {
        writeFileSync(outputPath, code, "utf-8");
    }
    
    return code;
}

/**
 * Parse DSL file (JSON or YAML)
 * Note: This is for the old fluent-ffmpeg DSL format
 * For affect DSL (.affect files), use @affectjs/dsl instead
 */
export function parseDslFile(filePath: string): DslConfig {
    const content = readFileSync(filePath, "utf-8");
    const ext = extname(filePath).toLowerCase();
    
    if (ext === ".json") {
        return JSON.parse(content);
    } else if (ext === ".yaml" || ext === ".yml") {
        // Try to load yaml parser, fallback to JSON if not available
        try {
            // Use require for CommonJS compatibility
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const yaml = require("yaml");
            return yaml.parse(content);
        } catch {
            throw new Error("YAML parsing requires 'yaml' package. Install it with: pnpm add yaml");
        }
    } else {
        // Try JSON first
        try {
            return JSON.parse(content);
        } catch {
            throw new Error(`Unsupported file format: ${ext}. Supported formats: .json, .yaml, .yml`);
        }
    }
}

/**
 * Compile DSL file to JavaScript
 * Note: This is for the old fluent-ffmpeg DSL format (JSON/YAML)
 * For affect DSL (.affect files), use @affectjs/dsl instead
 */
export async function compileDslFile(
    dslPath: string,
    outputPath?: string
): Promise<string> {
    const config = parseDslFile(dslPath);
    const jsCode = compileDslToJs(config, outputPath);
    return jsCode;
}

