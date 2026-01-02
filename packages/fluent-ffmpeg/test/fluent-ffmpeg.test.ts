import path from "path";
import { Readable } from "stream";
import Ffmpeg from "../src/index";
import { describe, it, expect } from "vitest";

describe("FfmpegCommand", function () {
  describe("Constructor", function () {
    it("should create instance with new", function () {
      const cmd = new Ffmpeg("test.mp4");
      expect(cmd).toBeTruthy();
      expect(cmd._inputs.length).toBeGreaterThan(0);
    });

    it("should create instance without new", function () {
      const cmd = Ffmpeg("test.mp4");
      expect(cmd).toBeTruthy();
      expect(cmd._inputs.length).toBeGreaterThan(0);
    });

    it("should accept options object", function () {
      const cmd = new Ffmpeg({
        source: "test.mp4",
        logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
      });
      expect(cmd).toBeTruthy();
      expect(cmd._inputs.length).toBeGreaterThan(0);
    });

    it("should accept stream input", function () {
      const stream = new Readable({ read() {} });
      const cmd = new Ffmpeg(stream);
      expect(cmd).toBeTruthy();
      expect(cmd._inputs.length).toBeGreaterThan(0);
      expect(cmd._inputs[0].isStream).toBe(true);
    });

    it("should initialize with default options", function () {
      const cmd = new Ffmpeg();
      expect(cmd.options.stdoutLines).toBe(100);
      expect(cmd.options.presets).toBeTruthy();
      expect(cmd.options.niceness).toBe(0);
    });

    it("should accept custom options", function () {
      const logger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
      const cmd = new Ffmpeg({ source: "test.mp4", logger, stdoutLines: 50, niceness: 5 });
      expect(cmd.options.stdoutLines).toBe(50);
      expect(cmd.options.niceness).toBe(5);
      expect(cmd.logger).toBe(logger);
    });
  });

  describe("clone", function () {
    it("should clone command", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.audioCodec("aac").videoCodec("libx264");
      const clone = cmd.clone();
      expect(clone).toBeTruthy();
      expect(clone).not.toBe(cmd);
    });

    it("should clone with inputs", function () {
      const cmd = new Ffmpeg("test1.mp4");
      cmd.input("test2.mp4");
      const clone = cmd.clone();
      expect(clone._inputs.length).toBe(2);
    });

    it("should clone with outputs", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.output("out1.mp4").output("out2.mp4");
      const clone = cmd.clone();
      expect(clone._outputs.length).toBeGreaterThan(0);
    });

    it("should clone with options", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.audioCodec("aac");
      const clone = cmd.clone();
      const args = clone._getArguments();
      expect(args).toContain("-acodec");
    });
  });

  describe("Static methods", function () {
    it("should have static setFfmpegPath", function () {
      expect(typeof Ffmpeg.setFfmpegPath).toBe("function");
      Ffmpeg.setFfmpegPath("/test/path");
    });

    it("should have static setFfprobePath", function () {
      expect(typeof Ffmpeg.setFfprobePath).toBe("function");
      Ffmpeg.setFfprobePath("/test/path");
    });

    it("should have static setFlvtoolPath", function () {
      expect(typeof Ffmpeg.setFlvtoolPath).toBe("function");
      Ffmpeg.setFlvtoolPath("/test/path");
    });

    it("should have static availableCodecs", function () {
      return new Promise<void>((resolve) => {
        expect(typeof Ffmpeg.availableCodecs).toBe("function");
        Ffmpeg.availableCodecs(() => {
          // May succeed or fail
          resolve();
        });
      });
    });

    it("should have static availableFormats", function () {
      return new Promise<void>((resolve) => {
        expect(typeof Ffmpeg.availableFormats).toBe("function");
        Ffmpeg.availableFormats(() => {
          resolve();
        });
      });
    });

    it("should have static availableEncoders", function () {
      return new Promise<void>((resolve) => {
        expect(typeof Ffmpeg.availableEncoders).toBe("function");
        Ffmpeg.availableEncoders(() => {
          resolve();
        });
      });
    });

    it("should have static availableFilters", function () {
      return new Promise<void>((resolve) => {
        expect(typeof Ffmpeg.availableFilters).toBe("function");
        Ffmpeg.availableFilters(() => {
          resolve();
        });
      });
    });

    it("should have static ffprobe", function () {
      expect(typeof Ffmpeg.ffprobe).toBe("function");
    });
  });
});
