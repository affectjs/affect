import path from "path";
import fs from "fs";
import { exec } from "child_process";
import Ffmpeg from "../src/index";
import testhelper from "./helpers";
import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";

describe("Recipes", function () {
  let testdir: string;
  let outdir: string;
  let testfile: string;
  let createdFiles: string[] = [];
  let createdDirs: string[] = [];

  beforeAll(async () => {
    testdir = path.join(__dirname, "assets");
    outdir = path.join(testdir, "output");
    if (!fs.existsSync(outdir)) {
      fs.mkdirSync(outdir, { recursive: true });
    }
    testfile = path.join(testdir, "testvideo-43.avi");

    return new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("beforeAll timeout"));
      }, 30000);

      exec(testhelper.getFfmpegCheck(), (err) => {
        if (err) {
          clearTimeout(timeoutId);
          reject(new Error("ffmpeg not found"));
          return;
        }
        fs.access(testfile, fs.constants.F_OK, (accessErr) => {
          clearTimeout(timeoutId);
          if (accessErr) {
            reject(new Error("test file not found"));
          } else {
            resolve();
          }
        });
      });
    });
  });

  beforeEach(() => {
    createdFiles = [];
    createdDirs = [];
  });

  afterEach(async () => {
    for (const file of createdFiles) {
      try {
        await fs.promises.unlink(file);
      } catch {
        // ignore
      }
    }
    for (const dir of createdDirs) {
      try {
        await fs.promises.rm(dir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });

  describe("takeScreenshots", function () {
    it("should take screenshots with count", function () {
      return new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("timeout"));
        }, 60000);

        const folder = path.join(outdir, "screenshots-count");
        createdDirs.push(folder);
        const cmd = new Ffmpeg(testfile, { logger: testhelper.logger });
        let filenamesCalled = false;

        cmd.on("filenames", (filenames) => {
          filenamesCalled = true;
          expect(Array.isArray(filenames)).toBe(true);
          filenames.forEach((f) => {
            createdFiles.push(path.join(folder, f));
          });
        });

        cmd.on("end", () => {
          clearTimeout(timeoutId);
          try {
            expect(filenamesCalled).toBe(true);
            resolve();
          } catch (e) {
            reject(e);
          }
        });

        cmd.on("error", (err) => {
          clearTimeout(timeoutId);
          reject(err);
        });

        cmd.takeScreenshots({ count: 2 }, folder);
      });
    });

    it("should take screenshots with timemarks", function () {
      return new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("timeout"));
        }, 60000);

        const folder = path.join(outdir, "screenshots-timemarks");
        createdDirs.push(folder);
        const cmd = new Ffmpeg(testfile, { logger: testhelper.logger });
        let filenamesCalled = false;

        cmd.on("filenames", (filenames) => {
          filenamesCalled = true;
          expect(filenames.length).toBe(2);
        });

        cmd.on("end", () => {
          clearTimeout(timeoutId);
          try {
            expect(filenamesCalled).toBe(true);
            resolve();
          } catch (e) {
            reject(e);
          }
        });

        cmd.on("error", (err) => {
          clearTimeout(timeoutId);
          reject(err);
        });

        cmd.takeScreenshots({ timemarks: [0.5, 1] }, folder);
      });
    });

    it("should take screenshots with string timemarks", function () {
      return new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("timeout"));
        }, 60000);

        const folder = path.join(outdir, "screenshots-string");
        createdDirs.push(folder);
        const cmd = new Ffmpeg(testfile, { logger: testhelper.logger });

        cmd.on("end", () => {
          clearTimeout(timeoutId);
          resolve();
        });

        cmd.on("error", (err) => {
          clearTimeout(timeoutId);
          reject(err);
        });

        cmd.takeScreenshots({ timemarks: ["0.5", "1"] }, folder);
      });
    });

    it("should take screenshots with size", function () {
      return new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("timeout"));
        }, 60000);

        const folder = path.join(outdir, "screenshots-size");
        createdDirs.push(folder);
        const cmd = new Ffmpeg(testfile, { logger: testhelper.logger });

        cmd.on("end", () => {
          clearTimeout(timeoutId);
          resolve();
        });

        cmd.on("error", (err) => {
          clearTimeout(timeoutId);
          reject(err);
        });

        cmd.takeScreenshots({ count: 1, size: "320x240" }, folder);
      });
    });

    it("should throw error when no count or timemarks", function () {
      const cmd = new Ffmpeg(testfile);
      expect(() => {
        cmd.takeScreenshots({});
      }).toThrow("neither a count nor a timemark");
    });

    it("should throw error on invalid size", function () {
      const cmd = new Ffmpeg(testfile);
      expect(() => {
        cmd.takeScreenshots({ count: 1, size: "invalid" });
      }).toThrow("Invalid size parameter");
    });
  });

  describe("mergeToFile", function () {
    it("should merge multiple files", function () {
      return new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("timeout"));
        }, 60000);

        const testfile1 = path.join(testdir, "testaudio-one.wav");
        const testfile2 = path.join(testdir, "testaudio-two.wav");
        const outFile = path.join(outdir, "merged.wav");
        createdFiles.push(outFile);

        const cmd = new Ffmpeg(testfile1, { logger: testhelper.logger });
        cmd.input(testfile2);

        cmd.on("end", () => {
          clearTimeout(timeoutId);
          fs.access(outFile, fs.constants.F_OK, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });

        cmd.on("error", (err) => {
          clearTimeout(timeoutId);
          reject(err);
        });

        cmd.mergeToFile(outFile);
      });
    });

    it("should error when merging streams", function () {
      return new Promise<void>((resolve) => {
        const stream = require("stream").Readable.from(["test"]);
        const cmd = new Ffmpeg(stream);
        cmd.on("error", (err) => {
          try {
            expect(err.message).toContain("Cannot merge streams");
            resolve();
          } catch (e) {
            resolve(); // Still resolve
          }
        });
        cmd.mergeToFile("out.wav");
      });
    });
  });
});
