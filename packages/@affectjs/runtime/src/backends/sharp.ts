/**
 * @affectjs/runtime - Sharp Backend Adapter
 *
 * Adapter for sharp backend
 */

import sharp from "sharp";
import type { Backend, Operation, ExecutionContext, Result } from "../types";

export const sharpBackend: Backend = {
    name: "sharp",
    supportedTypes: ["image"] as const,
    supportedFormats: {
        image: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".bmp", ".tiff", ".tif", ".avif", ".heic", ".heif"],
    },

    canHandle(operation: Operation, mediaType: string): boolean {
        return mediaType === "image";
    },

    supportsFormat(filePath: string, mediaType: MediaType): boolean {
        const lastDot = filePath.lastIndexOf(".");
        if (lastDot === -1) return false;
        const ext = filePath.substring(lastDot).toLowerCase();
        const formats = this.supportedFormats[mediaType] || [];
        return formats.includes(ext);
    },

    createCommand(input: string, mediaType: MediaType): any {
        return sharp(input);
    },

    applyOperation(command: any, operation: Operation, mediaType: MediaType): any {
        switch (operation.type) {
            case "resize":
                const w = operation.width === "auto" ? null : Number(operation.width);
                const h = operation.height === "auto" || !operation.height ? null : Number(operation.height);
                return command.resize(w, h);
            case "encode":
                return command.toFormat(operation.codec, operation.param ? { quality: Number(operation.param) } : {});
            case "filter":
                switch (operation.name) {
                    case "grayscale":
                        return command.greyscale();
                    case "blur":
                        return command.blur(operation.value ? Number(operation.value) : 1);
                    case "brightness":
                        return command.modulate({ brightness: operation.value ? Number(operation.value) : 1 });
                    case "saturate":
                        return command.modulate({ saturation: operation.value ? Number(operation.value) : 1 });
                    case "contrast":
                        return command.linear(
                            operation.value ? Number(operation.value) : 1,
                            -(128 * (operation.value ? Number(operation.value) : 1)) + 128
                        );
                    default:
                        if (operation.value !== undefined && operation.value !== null) {
                            return (command as any)[operation.name]?.(Number(operation.value)) || command;
                        } else {
                            return (command as any)[operation.name]?.() || command;
                        }
                }
            case "crop":
                const left = operation.x === "center" ? 0 : Number(operation.x);
                const top = operation.y === "auto" ? 0 : Number(operation.y);
                return command.extract({ left, top, width: operation.width, height: operation.height });
            case "rotate":
                command = command.rotate(Number(operation.angle));
                if (operation.flip === "horizontal") {
                    command = command.flop();
                } else if (operation.flip === "vertical") {
                    command = command.flip();
                }
                break;
        }
        return command;
    },

    async getMetadata(input: string): Promise<any> {
        const metadata = await sharp(input).metadata();
        return {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            size: metadata.size,
        };
    },

    async execute(
        operation: Operation,
        context: ExecutionContext
    ): Promise<Result> {
        try {
            let pipeline = sharp(context.input);

            // Apply all operations from context
            for (const op of context.operations) {
                switch (op.type) {
                    case "resize":
                        const w = op.width === "auto" ? null : Number(op.width);
                        const h =
                            op.height === "auto" || !op.height
                                ? null
                                : Number(op.height);
                        pipeline = pipeline.resize(w, h);
                        break;
                    case "encode":
                        pipeline = pipeline.toFormat(
                            op.codec,
                            op.param ? { quality: Number(op.param) } : {}
                        );
                        break;
                    case "filter":
                        switch (op.name) {
                            case "grayscale":
                                pipeline = pipeline.greyscale();
                                break;
                            case "blur":
                                pipeline = pipeline.blur(
                                    op.value ? Number(op.value) : 1
                                );
                                break;
                            case "brightness":
                                pipeline = pipeline.modulate({
                                    brightness: op.value ? Number(op.value) : 1,
                                });
                                break;
                            case "saturate":
                                pipeline = pipeline.modulate({
                                    saturation: op.value
                                        ? Number(op.value)
                                        : 1,
                                });
                                break;
                            case "contrast":
                                pipeline = pipeline.linear(
                                    op.value ? Number(op.value) : 1,
                                    -(128 * (op.value ? Number(op.value) : 1)) +
                                        128
                                );
                                break;
                            default:
                                // Try to call as sharp method
                                if (op.value !== undefined && op.value !== null) {
                                    (pipeline as any)[op.name]?.(Number(op.value));
                                } else {
                                    (pipeline as any)[op.name]?.();
                                }
                        }
                        break;
                    case "crop":
                        const left = op.x === "center" ? 0 : Number(op.x);
                        const top = op.y === "auto" ? 0 : Number(op.y);
                        pipeline = pipeline.extract({
                            left,
                            top,
                            width: op.width,
                            height: op.height,
                        });
                        break;
                    case "rotate":
                        pipeline = pipeline.rotate(Number(op.angle));
                        if (op.flip === "horizontal") {
                            pipeline = pipeline.flop();
                        } else if (op.flip === "vertical") {
                            pipeline = pipeline.flip();
                        }
                        break;
                }
            }

            // Save or return buffer
            if (context.output) {
                await pipeline.toFile(context.output);
                return {
                    success: true,
                    output: context.output,
                };
            } else {
                await pipeline.toBuffer();
                return {
                    success: true,
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error as Error,
            };
        }
    },
};

