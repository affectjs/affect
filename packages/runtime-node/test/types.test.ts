/**
 * @affectjs/runtime - Type Tests
 *
 * Tests for type definitions and exports
 */

import { describe, it, expect } from "vitest";
import type {
    MediaType,
    Operation,
    Result,
    Backend,
    ExecutionContext,
    RuntimeOptions,
    ProgressInfo,
} from "../src/types";

describe("Type Definitions", () => {
    it("should export MediaType", () => {
        const video: MediaType = "video";
        const audio: MediaType = "audio";
        const image: MediaType = "image";

        expect(video).toBe("video");
        expect(audio).toBe("audio");
        expect(image).toBe("image");
    });

    it("should export Operation interface", () => {
        const operation: Operation = {
            type: "resize",
            width: 100,
            height: 100,
        };

        expect(operation.type).toBe("resize");
        expect(operation.width).toBe(100);
        expect(operation.height).toBe(100);
    });

    it("should export Result interface", () => {
        const successResult: Result = {
            success: true,
            output: "output.jpg",
        };

        const errorResult: Result = {
            success: false,
            error: new Error("Test error"),
        };

        expect(successResult.success).toBe(true);
        expect(errorResult.success).toBe(false);
    });

    it("should export ExecutionContext interface", () => {
        const context: ExecutionContext = {
            input: "input.jpg",
            output: "output.jpg",
            mediaType: "image",
            operations: [{ type: "resize", width: 100, height: 100 }],
        };

        expect(context.input).toBe("input.jpg");
        expect(context.mediaType).toBe("image");
        expect(context.operations).toHaveLength(1);
    });

    it("should export RuntimeOptions interface", () => {
        const options: RuntimeOptions = {
            backend: "sharp",
            parallel: true,
            progress: (info: ProgressInfo) => {
                console.log(info.percent);
            },
        };

        expect(options.backend).toBe("sharp");
        expect(options.parallel).toBe(true);
        expect(typeof options.progress).toBe("function");
    });

    it("should export ProgressInfo interface", () => {
        const progress: ProgressInfo = {
            percent: 50,
            current: 1,
            total: 2,
            message: "Processing",
        };

        expect(progress.percent).toBe(50);
        expect(progress.current).toBe(1);
        expect(progress.total).toBe(2);
    });
});

