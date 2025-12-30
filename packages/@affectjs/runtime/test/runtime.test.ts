/**
 * @affectjs/runtime - Runtime Tests
 *
 * Tests for the runtime engine
 */

import { describe, it, expect, beforeAll } from "vitest";
import { affect, execute, affectBatch } from "../src/index";
import { existsSync, unlinkSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
    compareImages,
    getImageDimensions,
    verifyResize,
} from "./image-utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const assetsDir = join(__dirname, "assets");
const outputDir = join(assetsDir, "output");

// Ensure output directory exists
try {
    mkdirSync(outputDir, { recursive: true });
} catch (e) {
    // Directory might already exist
}

describe("Runtime Engine", () => {
    const testImage = join(assetsDir, "sample-image.jpg");
    const testVideo = join(assetsDir, "sample-video.mp4");

    beforeAll(() => {
        // Check if test assets exist
        if (!existsSync(testImage)) {
            console.warn(`Test image not found: ${testImage}`);
        }
        if (!existsSync(testVideo)) {
            console.warn(`Test video not found: ${testVideo}`);
        }
    });

    describe("affect() - Image Processing", () => {
        it("should resize an image", async () => {
            if (!existsSync(testImage)) {
                console.log("Skipping test - test image not found");
                return;
            }

            const output = join(outputDir, "resized-image.jpg");
            const result = await affect(testImage)
                .resize(640, 480)
                .save(output)
                .execute();

            expect(result.success).toBe(true);
            expect(result.output).toBe(output);
            expect(existsSync(output)).toBe(true);

            // Verify dimensions using pixelmatch utilities
            const isValid = await verifyResize(output, 640, 480);
            expect(isValid).toBe(true);

            // Get actual dimensions
            const dimensions = await getImageDimensions(output);
            expect(dimensions).not.toBeNull();
            if (dimensions) {
                expect(dimensions.width).toBeCloseTo(640, 0);
                expect(dimensions.height).toBeCloseTo(480, 0);
            }

            // Cleanup
            if (existsSync(output)) {
                unlinkSync(output);
            }
        }, 30000);

        it("should apply grayscale filter", async () => {
            if (!existsSync(testImage)) {
                console.log("Skipping test - test image not found");
                return;
            }

            const output = join(outputDir, "grayscale-image.jpg");
            const result = await affect(testImage)
                .filter("grayscale")
                .save(output)
                .execute();

            expect(result.success).toBe(true);
            expect(result.output).toBe(output);
            expect(existsSync(output)).toBe(true);

            // Verify image was processed (should be different from original)
            // Grayscale should produce a different image
            const comparison = await compareImages(testImage, output, 0.1);
            expect(comparison).not.toBeNull();
            if (comparison) {
                // Images should be different (grayscale changes colors)
                expect(comparison.diffPixels).toBeGreaterThan(0);
            }

            // Cleanup
            if (existsSync(output)) {
                unlinkSync(output);
            }
        }, 30000);

        it("should apply multiple filters", async () => {
            if (!existsSync(testImage)) {
                console.log("Skipping test - test image not found");
                return;
            }

            const output = join(outputDir, "filtered-image.jpg");
            const result = await affect(testImage)
                .resize(800, 600)
                .filter("grayscale")
                .filter("blur", 2)
                .encode("jpeg", 85)
                .save(output)
                .execute();

            expect(result.success).toBe(true);
            expect(result.output).toBe(output);
            expect(existsSync(output)).toBe(true);

            // Cleanup
            if (existsSync(output)) {
                unlinkSync(output);
            }
        }, 30000);

        it("should crop an image", async () => {
            if (!existsSync(testImage)) {
                console.log("Skipping test - test image not found");
                return;
            }

            const output = join(outputDir, "cropped-image.jpg");
            const result = await affect(testImage)
                .crop(0, 0, 400, 300)
                .save(output)
                .execute();

            expect(result.success).toBe(true);
            expect(result.output).toBe(output);
            expect(existsSync(output)).toBe(true);

            // Verify crop dimensions
            const dimensions = await getImageDimensions(output);
            expect(dimensions).not.toBeNull();
            if (dimensions) {
                expect(dimensions.width).toBe(400);
                expect(dimensions.height).toBe(300);
            }

            // Cleanup
            if (existsSync(output)) {
                unlinkSync(output);
            }
        }, 30000);

        it("should rotate an image", async () => {
            if (!existsSync(testImage)) {
                console.log("Skipping test - test image not found");
                return;
            }

            const output = join(outputDir, "rotated-image.jpg");
            const result = await affect(testImage)
                .rotate(90)
                .save(output)
                .execute();

            expect(result.success).toBe(true);
            expect(result.output).toBe(output);
            expect(existsSync(output)).toBe(true);

            // Cleanup
            if (existsSync(output)) {
                unlinkSync(output);
            }
        }, 30000);
    });

    describe("affect() - Video Processing", () => {
        it("should resize a video", async () => {
            if (!existsSync(testVideo)) {
                console.log("Skipping test - test video not found");
                return;
            }

            const output = join(outputDir, "resized-video.mp4");
            const result = await affect(testVideo)
                .resize(640, 480)
                .save(output)
                .execute();

            expect(result.success).toBe(true);
            expect(result.output).toBe(output);
            expect(existsSync(output)).toBe(true);

            // Cleanup
            if (existsSync(output)) {
                unlinkSync(output);
            }
        }, 60000);

        it("should encode video with codec", async () => {
            if (!existsSync(testVideo)) {
                console.log("Skipping test - test video not found");
                return;
            }

            const output = join(outputDir, "encoded-video.mp4");
            const result = await affect(testVideo)
                .resize(640, 480)
                .encode("h264", 1000)
                .encode("aac", 128)
                .save(output)
                .execute();

            expect(result.success).toBe(true);
            expect(result.output).toBe(output);
            expect(existsSync(output)).toBe(true);

            // Cleanup
            if (existsSync(output)) {
                unlinkSync(output);
            }
        }, 60000);
    });

    describe("getMetadata()", () => {
        it("should get image metadata", async () => {
            if (!existsSync(testImage)) {
                console.log("Skipping test - test image not found");
                return;
            }

            const chain = affect(testImage);
            const metadata = await chain.getMetadata();

            expect(metadata).toBeDefined();
            expect(metadata.width).toBeDefined();
            expect(metadata.height).toBeDefined();
        }, 30000);

        it("should get video metadata", async () => {
            if (!existsSync(testVideo)) {
                console.log("Skipping test - test video not found");
                return;
            }

            const chain = affect(testVideo);
            const metadata = await chain.getMetadata();

            expect(metadata).toBeDefined();
            // Video metadata might have width, height, duration, etc.
        }, 30000);
    });

    describe("affectBatch()", () => {
        it("should process multiple images", async () => {
            if (!existsSync(testImage)) {
                console.log("Skipping test - test image not found");
                return;
            }

            const results = await affectBatch([
                {
                    input: testImage,
                    output: join(outputDir, "batch-1.jpg"),
                    operations: [
                        { type: "resize", width: 400, height: 300 },
                    ],
                },
                {
                    input: testImage,
                    output: join(outputDir, "batch-2.jpg"),
                    operations: [
                        { type: "resize", width: 200, height: 200 },
                        { type: "filter", name: "grayscale" },
                    ],
                },
            ]);

            expect(results).toHaveLength(2);
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(true);

            // Cleanup
            results.forEach((result) => {
                if (result.output && existsSync(result.output)) {
                    unlinkSync(result.output);
                }
            });
        }, 60000);
    });
});

