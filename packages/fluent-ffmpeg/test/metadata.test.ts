import path from "path";
import fs from "fs";
import { Readable } from "stream";
import { exec } from "child_process";
import Ffmpeg from "../src/index";
import testhelper from "./helpers";
import { describe, it, expect, beforeAll } from "vitest";

describe("Metadata", function () {
  let testfile: string;

  beforeAll(async () => {
    // check for ffmpeg installation
    testfile = path.join(__dirname, "assets", "testvideo-43.avi");

    return new Promise<void>((resolve, reject) => {
      exec(testhelper.getFfmpegCheck(), function (err: unknown) {
        if (!err) {
          // check if file exists
          fs.exists(testfile, function (exists) {
            if (exists) {
              resolve();
            } else {
              reject(new Error("test video file does not exist, check path (" + testfile + ")"));
            }
          });
        } else {
          reject(new Error("cannot run test without ffmpeg installed, aborting test..."));
        }
      });
    });
  });

  it("should provide an ffprobe entry point", function () {
    return new Promise<void>((resolve) => {
      expect(typeof Ffmpeg.ffprobe).toBe("function");
      resolve();
    });
  });

  it("should return ffprobe data as an object", function () {
    return new Promise<void>((resolve, reject) => {
      Ffmpeg.ffprobe(testfile, function (err: unknown, data: unknown) {
        testhelper.logError(err);
        try {
          expect(err).toBeFalsy();
          expect(typeof data).toBe("object");
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  });

  it("should provide ffprobe format information", function () {
    return new Promise<void>((resolve, reject) => {
      Ffmpeg.ffprobe(testfile, function (err: unknown, data: unknown) {
        testhelper.logError(err);
        try {
          expect(err).toBeFalsy();
          expect("format" in data).toBe(true);
          expect(typeof data.format).toBe("object");
          // console.log("Format data:", JSON.stringify(data.format));
          expect(Number(data.format.duration)).toBe(2);
          expect(data.format.format_name).toBe("avi");
          resolve();
        } catch (e) {
          console.log("Format data (failed):", JSON.stringify(data.format));
          reject(e);
        }
      });
    });
  });

  it("should provide ffprobe stream information", function () {
    return new Promise<void>((resolve, reject) => {
      Ffmpeg.ffprobe(testfile, function (err: unknown, data: unknown) {
        testhelper.logError(err);
        try {
          expect(err).toBeFalsy();
          expect("streams" in data).toBe(true);
          expect(Array.isArray(data.streams)).toBe(true);
          expect(data.streams.length).toBe(1);
          expect(data.streams[0].codec_type).toBe("video");
          expect(data.streams[0].codec_name).toBe("mpeg4");
          expect(Number(data.streams[0].width)).toBe(1024);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  });

  it("should provide ffprobe stream information with units", function () {
    return new Promise<void>((resolve, reject) => {
      Ffmpeg.ffprobe(testfile, ["-unit"], function (err: unknown, data: unknown) {
        testhelper.logError(err);
        try {
          expect(err).toBeFalsy();
          expect("streams" in data).toBe(true);
          expect(Array.isArray(data.streams)).toBe(true);
          expect(data.streams.length).toBe(1);
          // Bitrate can vary slightly between FFmpeg versions
          expect(data.streams[0].bit_rate).toMatch(/^3[12][0-9]{4} bit\/s$/);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  });

  it("should return ffprobe errors", function () {
    return new Promise<void>((resolve, reject) => {
      Ffmpeg.ffprobe("/path/to/missing/file", function (err: unknown) {
        try {
          expect(!!err).toBe(true);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  });

  it("should enable calling ffprobe on a command with an input file", function () {
    return new Promise<void>((resolve, reject) => {
      new Ffmpeg({ source: testfile }).ffprobe(function (err: unknown, data: unknown) {
        testhelper.logError(err);
        try {
          expect(err).toBeFalsy();
          expect(typeof data).toBe("object");
          expect("format" in data).toBe(true);
          expect(typeof data.format).toBe("object");
          expect("streams" in data).toBe(true);
          expect(Array.isArray(data.streams)).toBe(true);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  });

  it("should fail calling ffprobe on a command without input", function () {
    return new Promise<void>((resolve, reject) => {
      new Ffmpeg().ffprobe(function (err: unknown) {
        try {
          expect(!!err).toBe(true);
          expect(err.message).toMatch(/No input specified/);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  });

  it("should allow calling ffprobe on stream input", function () {
    return new Promise<void>((resolve, reject) => {
      const stream = fs.createReadStream(testfile);
      new Ffmpeg().addInput(stream).ffprobe(function (err: unknown, data: unknown) {
        try {
          expect(err).toBeFalsy();
          expect(data.streams.length).toBe(1);
          expect(data.format.filename).toBe("pipe:0");
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  });
});
