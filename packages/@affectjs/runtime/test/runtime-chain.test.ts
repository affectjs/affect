/**
 * @affectjs/runtime - Runtime Chain Tests
 *
 * Tests for affect() chain API
 */

import { describe, it, expect, vi } from "vitest";
import { affect } from "../src/index";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const assetsDir = join(__dirname, "assets");

describe("affect() Chain API", () => {
    const testImage = join(assetsDir, "sample-image.jpg");

    describe("Chain methods", () => {
        it("should chain resize operation", () => {
            const chain = affect("test.jpg").resize(100, 100);
            expect(chain).toBeDefined();
            expect(typeof chain.execute).toBe("function");
        });

        it("should chain encode operation", () => {
            const chain = affect("test.jpg").encode("jpeg", 90);
            expect(chain).toBeDefined();
        });

        it("should chain filter operation", () => {
            const chain = affect("test.jpg").filter("grayscale");
            expect(chain).toBeDefined();
        });

        it("should chain crop operation", () => {
            const chain = affect("test.jpg").crop(0, 0, 100, 100);
            expect(chain).toBeDefined();
        });

        it("should chain rotate operation", () => {
            const chain = affect("test.jpg").rotate(90);
            expect(chain).toBeDefined();
        });

        it("should chain multiple operations", () => {
            const chain = affect("test.jpg")
                .resize(100, 100)
                .filter("grayscale")
                .encode("jpeg", 90);
            expect(chain).toBeDefined();
        });

        it("should chain save operation", () => {
            const chain = affect("test.jpg").save("output.jpg");
            expect(chain).toBeDefined();
        });

        it("should chain format operation", () => {
            const chain = affect("test.mp4").format("mp4");
            expect(chain).toBeDefined();
        });

        it("should chain options operation", () => {
            const chain = affect("test.mp4").options({ timeout: 1000 });
            expect(chain).toBeDefined();
        });

        it("should chain outputOptions operation", () => {
            const chain = affect("test.mp4").outputOptions("-preset fast");
            expect(chain).toBeDefined();
        });
    });

    describe("Video-specific chain methods", () => {
        it("should chain videoCodec", () => {
            const chain = affect("test.mp4").videoCodec("h264");
            expect(chain).toBeDefined();
        });

        it("should chain videoBitrate", () => {
            const chain = affect("test.mp4").videoBitrate(2000);
            expect(chain).toBeDefined();
        });

        it("should chain size", () => {
            const chain = affect("test.mp4").size("1280x720");
            expect(chain).toBeDefined();
        });

        it("should chain fps", () => {
            const chain = affect("test.mp4").fps(30);
            expect(chain).toBeDefined();
        });

        it("should chain noVideo", () => {
            const chain = affect("test.mp4").noVideo();
            expect(chain).toBeDefined();
        });
    });

    describe("Audio-specific chain methods", () => {
        it("should chain audioCodec", () => {
            const chain = affect("test.mp3").audioCodec("aac");
            expect(chain).toBeDefined();
        });

        it("should chain audioBitrate", () => {
            const chain = affect("test.mp3").audioBitrate(128);
            expect(chain).toBeDefined();
        });

        it("should chain audioChannels", () => {
            const chain = affect("test.mp3").audioChannels(2);
            expect(chain).toBeDefined();
        });

        it("should chain audioFrequency", () => {
            const chain = affect("test.mp3").audioFrequency(44100);
            expect(chain).toBeDefined();
        });

        it("should chain noAudio", () => {
            const chain = affect("test.mp4").noAudio();
            expect(chain).toBeDefined();
        });
    });

    describe("getMetadata()", () => {
        it("should return metadata for image", async () => {
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

        it("should handle metadata error gracefully", async () => {
            const chain = affect("nonexistent.jpg");
            
            try {
                await chain.getMetadata();
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });

    describe("execute()", () => {
        it("should return result with success flag", async () => {
            if (!existsSync(testImage)) {
                console.log("Skipping test - test image not found");
                return;
            }

            const result = await affect(testImage)
                .resize(100, 100)
                .save("/tmp/test-output.jpg")
                .execute();

            expect(result).toBeDefined();
            expect(result.success !== undefined).toBe(true);
        }, 30000);
    });
});

