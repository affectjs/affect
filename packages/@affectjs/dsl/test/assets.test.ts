/**
 * @affectjs/dsl - Assets Files Tests
 *
 * Tests for parsing and compiling DSL files from test/assets directory
 */

import { describe, it, expect } from "vitest";
import { parseDslFile, compileDslFile } from "../src/index";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Assets Files Testing", () => {
    const assetsDir = join(__dirname, "assets");
    const fs = require("fs");
    const assetFiles = fs
        .readdirSync(assetsDir)
        .filter((f: string) => f.endsWith(".affect"));

    // 测试所有 assets 文件都能正确解析
    describe("Parse All Assets Files", () => {
        assetFiles.forEach((file: string) => {
            it(`should parse ${file} without errors`, () => {
                const filePath = join(assetsDir, file);
                expect(() => {
                    const ast = parseDslFile(filePath);
                    expect(ast).toBeDefined();
                    expect(ast.type).toBeDefined();
                    // 验证 AST 结构
                    if (ast.type === "AffectBlock") {
                        expect(ast.mediaType).toBeDefined();
                        expect([
                            "auto",
                            "video",
                            "audio",
                            "image",
                        ]).toContain(ast.mediaType);
                        expect(Array.isArray(ast.commands)).toBe(true);
                    } else if (
                        ast.type === "Program" ||
                        ast.type === "ConvertBlock"
                    ) {
                        expect(Array.isArray(ast.commands)).toBe(true);
                    }
                }).not.toThrow();
            });
        });
    });

    // 测试所有 assets 文件都能正确编译
    describe("Compile All Assets Files", () => {
        assetFiles.forEach((file: string) => {
            it(`should compile ${file} without errors`, () => {
                const filePath = join(assetsDir, file);
                expect(() => {
                    const code = compileDslFile(filePath, {
                        context: { input: "test.mp4", output: "out.mp4" },
                    });
                    expect(code).toBeDefined();
                    expect(typeof code).toBe("string");
                    expect(code.length).toBeGreaterThan(0);
                    // 验证生成的代码包含必要的结构
                    expect(code).toContain("affect");
                }).not.toThrow();
            });
        });
    });

    // 测试特定 asset 文件的详细验证
    describe("Specific Asset Files Validation", () => {
        it("should parse audio-basic.affect correctly", () => {
            const filePath = join(assetsDir, "audio-basic.affect");
            const ast = parseDslFile(filePath);

            expect(ast.type).toBe("AffectBlock");
            if (ast.type === "AffectBlock") {
                expect(ast.mediaType).toBe("audio");

                // 验证包含 encode 命令
                const encodeCmd = ast.commands.find(
                    (cmd: any) => cmd.type === "Encode"
                );
                expect(encodeCmd).toBeDefined();
                if (encodeCmd) {
                    expect(encodeCmd.codec).toBe("mp3");
                    expect(encodeCmd.param).toBe(192);
                }

                // 验证包含 audio block
                const audioBlock = ast.commands.find(
                    (cmd: any) => cmd.type === "AudioBlock"
                );
                expect(audioBlock).toBeDefined();
            }
        });

        it("should parse video-basic.affect correctly", () => {
            const filePath = join(assetsDir, "video-basic.affect");
            const ast = parseDslFile(filePath);

            expect(ast.type).toBe("AffectBlock");
            if (ast.type === "AffectBlock") {
                expect(ast.mediaType).toBe("video");

                // 验证包含 resize 命令
                const resizeCmd = ast.commands.find(
                    (cmd: any) => cmd.type === "Resize"
                );
                expect(resizeCmd).toBeDefined();
                if (resizeCmd) {
                    expect(resizeCmd.width).toBe(1280);
                    expect(resizeCmd.height).toBe(720);
                }

                // 验证包含 encode 命令
                const encodeCmd = ast.commands.find(
                    (cmd: any) => cmd.type === "Encode"
                );
                expect(encodeCmd).toBeDefined();
                if (encodeCmd) {
                    expect(encodeCmd.codec).toBe("h264");
                    expect(encodeCmd.param).toBe(2000);
                }
            }
        });

        it("should parse image-basic.affect correctly", () => {
            const filePath = join(assetsDir, "image-basic.affect");
            const ast = parseDslFile(filePath);

            expect(ast.type).toBe("AffectBlock");
            if (ast.type === "AffectBlock") {
                expect(ast.mediaType).toBe("image");

                // 验证包含 resize 命令
                const resizeCmd = ast.commands.find(
                    (cmd: any) => cmd.type === "Resize"
                );
                expect(resizeCmd).toBeDefined();
                if (resizeCmd) {
                    expect(resizeCmd.width).toBe(1920);
                    expect(resizeCmd.height).toBe(1080);
                }

                // 验证包含 filter 命令
                const filterCmd = ast.commands.find(
                    (cmd: any) => cmd.type === "Filter"
                );
                expect(filterCmd).toBeDefined();
                if (filterCmd) {
                    expect(filterCmd.name).toBe("grayscale");
                }
            }
        });

        it("should parse minimal.affect correctly", () => {
            const filePath = join(assetsDir, "minimal.affect");
            const ast = parseDslFile(filePath);

            expect(ast.type).toBe("AffectBlock");
            if (ast.type === "AffectBlock") {
                expect(ast.mediaType).toBe("auto");

                // 验证使用变量
                const inputCmd = ast.commands.find(
                    (cmd: any) => cmd.type === "Input"
                );
                expect(inputCmd).toBeDefined();
                if (inputCmd && inputCmd.path) {
                    expect(inputCmd.path.type).toBe("Variable");
                    if (inputCmd.path.type === "Variable") {
                        expect(inputCmd.path.name).toBe("input");
                    }
                }

                const saveCmd = ast.commands.find(
                    (cmd: any) => cmd.type === "Save"
                );
                expect(saveCmd).toBeDefined();
                if (saveCmd && saveCmd.path) {
                    expect(saveCmd.path.type).toBe("Variable");
                    if (saveCmd.path.type === "Variable") {
                        expect(saveCmd.path.name).toBe("output");
                    }
                }
            }
        });

        it("should parse video-with-variables.affect correctly", () => {
            const filePath = join(assetsDir, "video-with-variables.affect");
            const ast = parseDslFile(filePath);

            expect(ast.type).toBe("AffectBlock");
            if (ast.type === "AffectBlock") {
                expect(ast.mediaType).toBe("video");

                // 验证使用变量
                const inputCmd = ast.commands.find(
                    (cmd: any) => cmd.type === "Input"
                );
                if (inputCmd && inputCmd.path) {
                    expect(inputCmd.path.type).toBe("Variable");
                    if (inputCmd.path.type === "Variable") {
                        expect(inputCmd.path.name).toBe("input");
                    }
                }

                // 验证包含 resize 和 encode
                const resizeCmd = ast.commands.find(
                    (cmd: any) => cmd.type === "Resize"
                );
                expect(resizeCmd).toBeDefined();
                if (resizeCmd) {
                    expect(resizeCmd.width).toBe(1920);
                }

                const encodeCmd = ast.commands.find(
                    (cmd: any) => cmd.type === "Encode"
                );
                expect(encodeCmd).toBeDefined();
                if (encodeCmd) {
                    expect(encodeCmd.codec).toBe("h264");
                }
            }
        });

        it("should compile assets with context variables correctly", () => {
            const filePath = join(assetsDir, "minimal.affect");
            const code = compileDslFile(filePath, {
                context: {
                    input: "test-input.mp4",
                    output: "test-output.mp4",
                },
            });

            // 验证上下文变量被正确替换
            expect(code).toContain("test-input.mp4");
            expect(code).toContain("test-output.mp4");
        });

        it("should handle empty-operations.affect correctly", () => {
            const filePath = join(assetsDir, "empty-operations.affect");
            const ast = parseDslFile(filePath);

            expect(ast.type).toBe("AffectBlock");
            if (ast.type === "AffectBlock") {
                // 应该只有 Input 和 Save 命令
                const operations = ast.commands.filter(
                    (cmd: any) =>
                        cmd.type !== "Input" && cmd.type !== "Save"
                );
                expect(operations.length).toBe(0);
            }
        });
    });

    // 测试编译后的代码质量
    describe("Compiled Code Quality", () => {
        it("should generate valid JavaScript code for all assets", () => {
            assetFiles.forEach((file: string) => {
                const filePath = join(assetsDir, file);
                const code = compileDslFile(filePath, {
                    context: { input: "test.mp4", output: "out.mp4" },
                });

                // 验证代码不包含语法错误（基本检查）
                expect(code).not.toContain("undefined undefined");
                expect(code).not.toMatch(/\.\s*\./); // 不应该有连续的句点
            });
        });

        it("should include outputOptions('-n') for files with output", () => {
            // 测试有输出路径的文件
            const filesWithOutput = [
                "video-basic.affect",
                "audio-basic.affect",
                "image-basic.affect",
            ];

            filesWithOutput.forEach((file: string) => {
                const filePath = join(assetsDir, file);
                const code = compileDslFile(filePath);
                expect(code).toContain("outputOptions('-n')");
                expect(code).toContain(".save(");
            });
        });
    });
});

