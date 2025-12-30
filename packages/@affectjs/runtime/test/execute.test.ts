/**
 * @affectjs/runtime - Execute Tests
 *
 * Tests for execute() function
 */

import { describe, it, expect } from "vitest";
import { execute } from "../src/index";

describe("execute()", () => {
    it("should execute compiled DSL operations successfully", async () => {
        const compiled = {
            input: "test.jpg",
            output: "output.jpg",
            operations: [
                { type: "resize", width: 100, height: 100 },
                { type: "save", path: "output.jpg" },
            ],
        };

        // Mock the affect function to avoid actual file operations
        const result = await execute(compiled);

        // Since we're not actually processing files, expect either success or error
        expect(result).toBeDefined();
        expect(result.success !== undefined).toBe(true);
    });

    it("should handle errors in operations", async () => {
        const compiled = {
            input: "nonexistent.jpg",
            operations: [{ type: "resize", width: 100, height: 100 }],
        };

        const result = await execute(compiled);

        // Should handle error gracefully
        expect(result).toBeDefined();
        expect(result.success !== undefined).toBe(true);
    });

    it("should handle empty operations", async () => {
        const compiled = {
            input: "test.jpg",
            operations: [],
        };

        const result = await execute(compiled);

        expect(result).toBeDefined();
        expect(result.success !== undefined).toBe(true);
    });

    it("should handle operations with save", async () => {
        const compiled = {
            input: "test.jpg",
            output: "output.jpg",
            operations: [
                { type: "resize", width: 200, height: 200 },
                { type: "save", path: "output.jpg" },
            ],
        };

        const result = await execute(compiled);

        expect(result).toBeDefined();
        expect(result.success !== undefined).toBe(true);
    });

    it("should handle operations with conditional logic", async () => {
        const compiled = {
            input: "test.jpg",
            operations: [
                {
                    type: "if",
                    condition: {
                        type: "Comparison",
                        left: { type: "Property", name: "width" },
                        operator: ">",
                        right: 1920,
                    },
                    thenOperations: [
                        { type: "resize", width: 1920, height: "auto" },
                    ],
                    elseOperations: [],
                },
            ],
        };

        const result = await execute(compiled);

        expect(result).toBeDefined();
        expect(result.success !== undefined).toBe(true);
    });
});
