import { Readable } from "stream";
import Ffmpeg from "../src/index";
import { describe, it, expect } from "vitest";

describe("Options", function () {
  describe("Input options", function () {
    it("should add input", function () {
      const cmd = new Ffmpeg("test1.mp4");
      cmd.input("test2.mp4");
      expect(cmd._inputs.length).toBe(2);
    });

    it("should add stream input", function () {
      const stream = new Readable({ read() {} });
      const cmd = new Ffmpeg();
      cmd.input(stream);
      expect(cmd._inputs[0].isStream).toBe(true);
    });

    it("should throw on invalid input", function () {
      const cmd = new Ffmpeg();
      expect(() => {
        cmd.input({} as any);
      }).toThrow("Invalid input");
    });

    it("should throw on multiple stream inputs", function () {
      const stream1 = new Readable({ read() {} });
      const stream2 = new Readable({ read() {} });
      const cmd = new Ffmpeg(stream1);
      expect(() => {
        cmd.input(stream2);
      }).toThrow("Only one input stream");
    });

    it("should set input format", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.fromFormat("avi");
      const args = cmd._getArguments();
      expect(args).toContain("-f");
      expect(args).toContain("avi");
    });

    it("should throw when setting input format without input", function () {
      const cmd = new Ffmpeg();
      expect(() => {
        cmd.fromFormat("avi");
      }).toThrow("No input specified");
    });

    it("should set input FPS", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.fpsInput(30);
      const args = cmd._getArguments();
      expect(args).toContain("-r");
      const rIndex = args.indexOf("-r");
      expect(rIndex).toBeGreaterThan(-1);
      expect(args[rIndex + 1]).toBe(30);
    });

    it("should set native framerate", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.native();
      const args = cmd._getArguments();
      expect(args).toContain("-re");
    });

    it("should set seek input", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.seekInput(10);
      const args = cmd._getArguments();
      expect(args).toContain("-ss");
      const ssIndex = args.indexOf("-ss");
      expect(ssIndex).toBeGreaterThan(-1);
      expect(args[ssIndex + 1]).toBe(10);
    });

    it("should set loop", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.loop();
      const args = cmd._getArguments();
      expect(args).toContain("-loop");
    });

    it("should set loop with duration", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.loop(5);
      const args = cmd._getArguments();
      expect(args).toContain("-loop");
    });
  });

  describe("Audio options", function () {
    it("should disable audio", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.noAudio();
      const args = cmd._getArguments();
      expect(args).toContain("-an");
    });

    it("should set audio codec", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.audioCodec("aac");
      const args = cmd._getArguments();
      expect(args).toContain("-acodec");
      expect(args).toContain("aac");
    });

    it("should set audio bitrate", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.audioBitrate(128);
      const args = cmd._getArguments();
      expect(args).toContain("-b:a");
    });

    it("should set audio channels", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.audioChannels(2);
      const args = cmd._getArguments();
      expect(args).toContain("-ac");
      const acIndex = args.indexOf("-ac");
      expect(acIndex).toBeGreaterThan(-1);
      expect(args[acIndex + 1]).toBe(2);
    });

    it("should set audio frequency", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.audioFrequency(44100);
      const args = cmd._getArguments();
      expect(args).toContain("-ar");
      const arIndex = args.indexOf("-ar");
      expect(arIndex).toBeGreaterThan(-1);
      expect(args[arIndex + 1]).toBe(44100);
    });

    it("should set audio quality", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.audioQuality(5);
      const args = cmd._getArguments();
      expect(args).toContain("-aq");
      const aqIndex = args.indexOf("-aq");
      expect(aqIndex).toBeGreaterThan(-1);
      expect(args[aqIndex + 1]).toBe(5);
    });

    it("should add audio filters", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.audioFilters("volume=0.5");
      const args = cmd._getArguments();
      expect(args).toContain("-filter:a");
    });

    it("should add audio filters with object", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.audioFilters({ filter: "volume", options: "0.5" });
      const args = cmd._getArguments();
      expect(args).toContain("-filter:a");
    });
  });

  describe("Video options", function () {
    it("should disable video", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.noVideo();
      const args = cmd._getArguments();
      expect(args).toContain("-vn");
    });

    it("should set video codec", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.videoCodec("libx264");
      const args = cmd._getArguments();
      expect(args).toContain("-vcodec");
      expect(args).toContain("libx264");
    });

    it("should set video bitrate", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.videoBitrate(1000);
      const args = cmd._getArguments();
      expect(args).toContain("-b:v");
    });

    it("should set video FPS", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.fps(30);
      const args = cmd._getArguments();
      expect(args).toContain("-r");
      const rIndex = args.indexOf("-r");
      expect(rIndex).toBeGreaterThan(-1);
      expect(args[rIndex + 1]).toBe(30);
    });

    it("should set video frames", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.frames(100);
      const args = cmd._getArguments();
      expect(args).toContain("-vframes");
      const vframesIndex = args.indexOf("-vframes");
      expect(vframesIndex).toBeGreaterThan(-1);
      expect(args[vframesIndex + 1]).toBe(100);
    });

    it("should add video filters", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.videoFilters("scale=640:480");
      const args = cmd._getArguments();
      expect(args).toContain("-filter:v");
    });

    it("should add video filters with object", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.videoFilters({ filter: "scale", options: { w: 640, h: 480 } });
      const args = cmd._getArguments();
      expect(args).toContain("-filter:v");
    });
  });

  describe("Output options", function () {
    it("should add output", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.output("out.mp4");
      expect(cmd._outputs.length).toBeGreaterThan(1);
    });

    it("should set output format", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.toFormat("mp4");
      const args = cmd._getArguments();
      expect(args).toContain("-f");
      expect(args).toContain("mp4");
    });

    it("should set duration", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.duration(10);
      const args = cmd._getArguments();
      expect(args).toContain("-t");
      const tIndex = args.indexOf("-t");
      expect(tIndex).toBeGreaterThan(-1);
      expect(args[tIndex + 1]).toBe(10);
    });

    it("should set seek", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.seek(5);
      const args = cmd._getArguments();
      expect(args).toContain("-ss");
      const ssIndex = args.indexOf("-ss");
      expect(ssIndex).toBeGreaterThan(-1);
      expect(args[ssIndex + 1]).toBe(5);
    });
  });

  describe("Custom options", function () {
    it("should add input options", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.inputOptions("-some", "option");
      const args = cmd._getArguments();
      expect(args).toContain("-some");
      expect(args).toContain("option");
    });

    it("should add output options", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.outputOptions("-some", "option");
      const args = cmd._getArguments();
      expect(args).toContain("-some");
      expect(args).toContain("option");
    });

    it("should add complex filter", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.complexFilter("split[out1][out2]");
      const args = cmd._getArguments();
      expect(args).toContain("-filter_complex");
    });

    it("should throw when adding input options without input", function () {
      const cmd = new Ffmpeg();
      expect(() => {
        cmd.inputOptions("-some");
      }).toThrow("No input specified");
    });
  });

  describe("Video size options", function () {
    it("should set size", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.size("640x480");
      const args = cmd._getArguments();
      // Size filters are added to videoFilters
      expect(cmd).toBeTruthy();
    });

    it("should set aspect ratio", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.aspectRatio("16:9");
      expect(cmd).toBeTruthy();
    });

    it("should set aspect ratio as number", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.aspectRatio(1.777);
      expect(cmd).toBeTruthy();
    });

    it("should throw on invalid aspect ratio", function () {
      const cmd = new Ffmpeg("test.mp4");
      expect(() => {
        cmd.aspectRatio("invalid");
      }).toThrow("Invalid aspect ratio");
    });

    it("should set autopad", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.autopad();
      expect(cmd).toBeTruthy();
    });

    it("should set autopad with color", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.autopad("red");
      expect(cmd).toBeTruthy();
    });

    it("should keep display aspect ratio", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.keepDAR();
      expect(cmd).toBeTruthy();
    });
  });

  describe("Misc options", function () {
    it("should use preset", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.usingPreset("divx");
      expect(cmd).toBeTruthy();
    });

    it("should use preset function", function () {
      const cmd = new Ffmpeg("test.mp4");
      const presetFn = (c: any) => {
        c.audioCodec("aac");
      };
      cmd.usingPreset(presetFn);
      expect(cmd).toBeTruthy();
    });

    it("should set renice", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.renice(5);
      expect(cmd.options.niceness).toBe(5);
    });

    it("should set priority", function () {
      const cmd = new Ffmpeg("test.mp4");
      cmd.priority(10);
      expect(cmd.options.niceness).toBe(10);
    });
  });
});
