/**
 * @affectjs/runtime - AffectBatch Tests
 *
 * Tests for affectBatch() function
 */

import { describe, it, expect } from "vitest";
import { affectBatch } from "../src/index";
import { existsSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const assetsDir = join(__dirname, "assets");
const outputDir = join(assetsDir, "output");

describe("affectBatch()", () => {
    const testImage = join(assetsDir, "sample-image.jpg");

    it("should process empty batch", async () => {
        const results = await affectBatch([]);
        expect(results).toEqual([]);
    });

    it("should process single item", async () => {
        if (!existsSync(testImage)) {
            console.log("Skipping test - test image not found");
            return;
        }

        const results = await affectBatch([
            {
                input: testImage,
                output: join(outputDir, "single-batch.jpg"),
                operations: [{ type: "resize", width: 100, height: 100 }],
            },
        ]);

        expect(results).toHaveLength(1);
        expect(results[0].success).toBe(true);

        // Cleanup
        if (results[0].output && existsSync(results[0].output)) {
            unlinkSync(results[0].output);
        }
    }, 30000);

    it("should process multiple items sequentially", async () => {
        if (!existsSync(testImage)) {
            console.log("Skipping test - test image not found");
            return;
        }

        const results = await affectBatch(
            [
                {
                    input: testImage,
                    output: join(outputDir, "batch-seq-1.jpg"),
                    operations: [{ type: "resize", width: 200, height: 200 }],
                },
                {
                    input: testImage,
                    output: join(outputDir, "batch-seq-2.jpg"),
                    operations: [{ type: "resize", width: 300, height: 300 }],
                },
            ],
            { parallel: false }
        );

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

    it("should handle errors in batch processing", async () => {
        const results = await affectBatch([
            {
                input: "nonexistent.jpg",
                output: join(outputDir, "error-output.jpg"),
                operations: [{ type: "resize", width: 100, height: 100 }],
            },
        ]);

        expect(results).toHaveLength(1);
        expect(results[0].success).toBe(false);
        expect(results[0].error).toBeDefined();
    });

    it("should process items with different media types", async () => {
        if (!existsSync(testImage)) {
            console.log("Skipping test - test image not found");
            return;
        }

        const results = await affectBatch([
            {
                input: testImage,
                output: join(outputDir, "batch-image.jpg"),
                operations: [{ type: "resize", width: 100, height: 100 }],
            },
        ]);

        expect(results).toHaveLength(1);
        expect(results[0].success).toBe(true);

        // Cleanup
        if (results[0].output && existsSync(results[0].output)) {
            unlinkSync(results[0].output);
        }
    }, 30000);

    it("should process items in parallel when parallel option is true", async () => {
        if (!existsSync(testImage)) {
            console.log("Skipping test - test image not found");
            return;
        }

        const results = await affectBatch(
            [
                {
                    input: testImage,
                    output: join(outputDir, "parallel-1.jpg"),
                    operations: [{ type: "resize", width: 150, height: 150 }],
                },
                {
                    input: testImage,
                    output: join(outputDir, "parallel-2.jpg"),
                    operations: [{ type: "resize", width: 250, height: 250 }],
                },
            ],
            { parallel: true }
        );

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

    it("should report progress during batch processing", async () => {
        if (!existsSync(testImage)) {
            console.log("Skipping test - test image not found");
            return;
        }

        const progressUpdates: Array<{
            percent: number;
            current: number;
            total: number;
        }> = [];

        await affectBatch(
            [
                {
                    input: testImage,
                    output: join(outputDir, "progress-1.jpg"),
                    operations: [{ type: "resize", width: 100, height: 100 }],
                },
                {
                    input: testImage,
                    output: join(outputDir, "progress-2.jpg"),
                    operations: [{ type: "resize", width: 200, height: 200 }],
                },
            ],
            {
                parallel: false,
                progress: (info) => {
                    progressUpdates.push({
                        percent: info.percent,
                        current: info.current,
                        total: info.total,
                    });
                },
            }
        );

        // Should have received progress updates
        expect(progressUpdates.length).toBeGreaterThan(0);
        // Last update should be 100%
        const lastUpdate = progressUpdates[progressUpdates.length - 1];
        expect(lastUpdate.percent).toBe(100);
        expect(lastUpdate.current).toBe(2);
        expect(lastUpdate.total).toBe(2);

        // Cleanup
        [
            join(outputDir, "progress-1.jpg"),
            join(outputDir, "progress-2.jpg"),
        ].forEach((path) => {
            if (existsSync(path)) {
                unlinkSync(path);
            }
        });
    }, 60000);
});
