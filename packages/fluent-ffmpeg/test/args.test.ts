import Ffmpeg from "../src/index";
import path from "path";
import utils from "../src/utils";
import fs from "fs";
import { exec } from "child_process";
import testhelper from "./helpers";
import { describe, it, expect, beforeAll } from "vitest";

describe("Command", function () {
  console.log(
    "DEBUG: _test_getSizeFilters exists on prototype?",
    !!Ffmpeg.prototype._test_getSizeFilters
  );
  console.log("DEBUG: Ffmpeg prototype keys:", Object.keys(Ffmpeg.prototype));
  let testfile: string;

  // Patch prototype to ensure test methods exist on all instances
  const FfmpegProto = new Ffmpeg().constructor.prototype;

  FfmpegProto._test_getArgs = function (callback: (args: string[], err?: Error) => void) {
    const self = this;

    // Mock _checkCapabilities to succeed immediately
    this._checkCapabilities = function (cb: (err?: Error | null) => void) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (self as any).options.logger.debug("Simulated _checkCapabilities");
      if (cb) cb(null);
    };

    let capturedArgs: string[] = [];
    let capturedErr: Error | undefined;

    // Mock _spawnFfmpeg to capture args and not run ffmpeg
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any)._spawnFfmpeg = function (
      args: string[],
      options: unknown,
      processCB: unknown,
      endCB: (err: Error | null) => void
    ) {
      capturedArgs = args;
      if (endCB) endCB(null);
    };

    // We don't need to listen to error/end because we hijack _spawnFfmpeg
    // But existing tests might rely on callbacks?
    // The original implementation used this.run() and listened to events.

    // Let's call run() which will trigger our mocked _spawnFfmpeg
    this.run();

    // Since our mocks are synchronous, we can callback immediately
    callback(capturedArgs, capturedErr);
  };

  FfmpegProto._test_getSizeFilters = function () {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const self = this as any;
    return utils
      .makeFilterStrings(self._currentOutput.sizeFilters.get())
      .concat(self._currentOutput.videoFilters.get());
  };
  let testfilewide: string;

  beforeAll(async () => {
    // check for ffmpeg installation
    testfile = path.join(__dirname, "assets", "testvideo-43.avi");
    testfilewide = path.join(__dirname, "assets", "testvideo-169.avi");

    return new Promise<void>((resolve, reject) => {
      exec(testhelper.getFfmpegCheck(), function (err: unknown) {
        if (!err) {
          // check if file exists
          fs.exists(testfile, function (exists: unknown) {
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

  describe("Constructor", function () {
    it("should enable calling the constructor without new", function () {
      // @ts-ignore
      expect(Ffmpeg()).toBeInstanceOf(Ffmpeg);
    });
  });

  describe("usingPreset", function () {
    it("should properly generate the command for the requested preset", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .usingPreset("podcast")
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args.length).toBe(42);
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });

    it("should properly generate the command for the requested preset in custom folder", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({
          source: testfile,
          nolog: true,
          preset: path.join(__dirname, "assets", "presets"),
        })
          .usingPreset("custompreset.cjs")
          ._test_getArgs(function (args: unknown) {
            try {
              expect(args.length).toBe(42);
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });

    it("should allow using functions as presets", function () {
      return new Promise<void>((resolve, reject) => {
        let presetArg: unknown;

        function presetFunc(command: unknown) {
          presetArg = command;
          command.withVideoCodec("libx264");
          command.withAudioFrequency(22050);
        }

        const cmd = new Ffmpeg({ source: testfile, logger: testhelper.logger });

        cmd.usingPreset(presetFunc)._test_getArgs(function (args: unknown, err: unknown) {
          testhelper.logArgError(err);
          try {
            expect(err).toBeFalsy();
            expect(presetArg).toBe(cmd);
            const argsJoined = args.join(" ");
            expect(argsJoined).toContain("-vcodec libx264");
            expect(argsJoined).toContain("-ar 22050");
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    it("should throw an exception when a preset is not found", function () {
      expect(() => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger }).usingPreset("NOTFOUND");
      }).toThrow(/NOTFOUND could not be loaded/);
    });

    it("should throw an exception when a preset has no load function", function () {
      expect(() => {
        new Ffmpeg({
          presets: path.join(__dirname, "assets", "presets"),
        }).usingPreset("noload.cjs");
      }).toThrow(/has no load\(\) function/);
    });
  });

  describe("withNoVideo", function () {
    it("should apply the skip video argument", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .withNoVideo()
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-vn");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });
    it("should skip any video transformation options", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .withSize("320x?")
          .withNoVideo()
          .withAudioBitrate("256k")
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-vn");
              expect(args).not.toContain("-s");
              expect(args.join(" ")).toContain("-b:a");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });
  });

  describe("withNoAudio", function () {
    it("should apply the skip audio argument", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .withNoAudio()
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-an");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });
    it("should skip any audio transformation options", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .withAudioChannels(2)
          .withNoAudio()
          .withSize("320x?")
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-an");
              expect(args).not.toContain("-ac");
              expect(args.join(" ")).toContain("scale=w=320:h=trunc(ow/a/2)*2");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });
  });

  describe("withVideoBitrate", function () {
    it("should apply default bitrate argument by default", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .withVideoBitrate("256k")
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-b:v");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });
    it("should apply additional bitrate arguments for constant bitrate", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .withVideoBitrate("256k", true)
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-b:v");
              expect(args).toContain("-maxrate");
              expect(args).toContain("-minrate");
              expect(args).toContain("-bufsize");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });
  });

  describe("withMultiFile", function () {
    it("should allow image2 multi-file input format", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: "image-%05d.png", logger: testhelper.logger })._test_getArgs(function (
          args: unknown,
          err: unknown
        ) {
          testhelper.logArgError(err);
          try {
            expect(err).toBeFalsy();
            expect(args).toContain("-i");
            expect(args).toContain("image-%05d.png");
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });
  });

  describe("withFps", function () {
    it("should apply the rate argument", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .withFps(27.77)
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-r");
              expect(args).toContain("27.77");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });
  });

  describe("withInputFPS", function () {
    it("should apply the rate argument", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .withInputFPS(27.77)
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-r");
              expect(args).toContain("27.77");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });
  });

  describe("native", function () {
    it("should apply the native framerate argument", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .native()
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-re");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });
  });

  describe("addingAdditionalInput", function () {
    it("should allow for additional inputs", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .addInput("soundtrack.mp3")
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-i");
              expect(args).toContain("soundtrack.mp3");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });

    it("should fail to add invalid inputs", function () {
      expect(() => {
        new Ffmpeg().addInput({});
      }).toThrow(/Invalid input/);
    });

    it("should refuse to add more than 1 input stream", function () {
      const stream1 = fs.createReadStream(testfile);
      const stream2 = fs.createReadStream(testfilewide);
      const command = new Ffmpeg().addInput(stream1);

      expect(() => {
        command.addInput(stream2);
      }).toThrow(/Only one input stream is supported/);
    });

    it("should fail on input-related options when no input was added", function () {
      expect(() => {
        new Ffmpeg().inputFormat("avi");
      }).toThrow(/No input specified/);

      expect(() => {
        new Ffmpeg().inputFps(24);
      }).toThrow(/No input specified/);

      expect(() => {
        new Ffmpeg().seekInput(1);
      }).toThrow(/No input specified/);

      expect(() => {
        new Ffmpeg().loop();
      }).toThrow(/No input specified/);

      expect(() => {
        new Ffmpeg().inputOptions("-anoption");
      }).toThrow(/No input specified/);
    });
  });

  describe("withVideoCodec", function () {
    it("should apply the video codec argument", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .withVideoCodec("libx264")
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-vcodec");
              expect(args).toContain("libx264");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });
  });

  describe("withVideoFilter", function () {
    it("should apply the video filter argument", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .withVideoFilter("scale=123:456")
          .withVideoFilter("pad=1230:4560:100:100:yellow")
          .withVideoFilter("multiple=1", "filters=2")
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-filter:v");
              expect(args).toContain(
                "scale=123:456,pad=1230:4560:100:100:yellow,multiple=1,filters=2"
              );
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });

    it("should accept filter arrays", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .withVideoFilter(["multiple=1", "filters=2"])
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-filter:v");
              expect(args).toContain("multiple=1,filters=2");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });

    it("should enable using filter objects", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .withVideoFilter(
            {
              filter: "option_string",
              options: "opt1=value1:opt2=value2",
            },
            {
              filter: "unnamed_options",
              options: ["opt1", "opt2"],
            },
            {
              filter: "named_options",
              options: {
                opt1: "value1",
                opt2: "value2",
              },
            }
          )
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-filter:v");
              const filterArg = (args as string[])[(args as string[]).indexOf("-filter:v") + 1];
              expect(filterArg).toContain("option_string=opt1=value1:opt2=value2");
              expect(filterArg).toContain("unnamed_options=opt1:opt2");
              expect(filterArg).toContain("named_options=");
              expect(filterArg).toContain("opt1=value1");
              expect(filterArg).toContain("opt2=value2");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });
  });

  describe("withAudioBitrate", function () {
    it("should apply the audio bitrate argument", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .withAudioBitrate(256)
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-b:a");
              expect(args).toContain("256k");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });
  });

  describe("loop", function () {
    it("should add the -loop 1 argument", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger }).loop()._test_getArgs(function (
          args: unknown,
          err: unknown
        ) {
          testhelper.logArgError(err);
          try {
            expect(err).toBeFalsy();
            if (args.indexOf("-loop") != -1 || args.indexOf("-loop_output") != -1) {
              resolve();
            } else {
              reject(new Error("args should contain loop or loop_output"));
            }
          } catch (e) {
            reject(e);
          }
        });
      });
    });
    it("should add the -loop 1 and a time argument (seconds)", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .loop(120)
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              if (args.indexOf("-loop") != -1 || args.indexOf("-loop_output") != -1) {
                expect(args).toContain("-t");
                expect(args).toContain("120");
                resolve();
              } else {
                reject(new Error("args should contain loop or loop_output"));
              }
            } catch (e) {
              reject(e);
            }
          });
      });
    });
    it("should add the -loop 1 and a time argument (timemark)", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .loop("00:06:46.81")
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              if (args.indexOf("-loop") != -1 || args.indexOf("-loop_output") != -1) {
                expect(args).toContain("-t");
                expect(args).toContain("00:06:46.81");
                resolve();
              } else {
                reject(new Error("args should contain loop or loop_output"));
              }
            } catch (e) {
              reject(e);
            }
          });
      });
    });
  });

  describe("takeFrames", function () {
    it("should add the -vframes argument", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .takeFrames(250)
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-vframes");
              expect(args).toContain("250");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });
  });

  describe("withAudioCodec", function () {
    it("should apply the audio codec argument", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .withAudioCodec("mp3")
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-acodec");
              expect(args).toContain("mp3");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });
  });

  describe("withAudioFilter", function () {
    it("should apply the audio filter argument", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .withAudioFilter("silencedetect=n=-50dB:d=5")
          .withAudioFilter("volume=0.5")
          .withAudioFilter("multiple=1", "filters=2")
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-filter:a");
              expect(args).toContain("silencedetect=n=-50dB:d=5,volume=0.5,multiple=1,filters=2");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });

    it("should accept filter arrays", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .withAudioFilter(["multiple=1", "filters=2"])
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-filter:a");
              expect(args).toContain("multiple=1,filters=2");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });

    it("should enable using filter objects", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .withAudioFilter(
            {
              filter: "option_string",
              options: "opt1=value1:opt2=value2",
            },
            {
              filter: "unnamed_options",
              options: ["opt1", "opt2"],
            },
            {
              filter: "named_options",
              options: {
                opt1: "value1",
                opt2: "value2",
              },
            }
          )
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-filter:a");
              const filterArg = (args as string[])[(args as string[]).indexOf("-filter:a") + 1];
              expect(filterArg).toContain("option_string=opt1=value1:opt2=value2");
              expect(filterArg).toContain("unnamed_options=opt1:opt2");
              expect(filterArg).toContain("named_options=");
              expect(filterArg).toContain("opt1=value1");
              expect(filterArg).toContain("opt2=value2");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });
  });

  describe("withAudioChannels", function () {
    it("should apply the audio channels argument", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .withAudioChannels(1)
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-ac");
              expect(args).toContain("1");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });
  });

  describe("withAudioFrequency", function () {
    it("should apply the audio frequency argument", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .withAudioFrequency(22500)
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-ar");
              expect(args).toContain("22500");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });
  });

  describe("withAudioQuality", function () {
    it("should apply the audio quality argument", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .withAudioQuality(5)
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-aq");
              expect(args).toContain("5");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });
  });

  describe("setStartTime", function () {
    it("should apply the start time offset argument", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .setStartTime("00:00:10")
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-ss");
              expect(args.indexOf("-i")).toBeGreaterThan(args.indexOf("-ss"));
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });
  });

  describe("setDuration", function () {
    it("should apply the record duration argument", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .setDuration(10)
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-t");
              expect(args).toContain("10");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });
  });

  describe("addOption(s)", function () {
    it("should apply a single option", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .addOption("-ab", "256k")
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-ab");
              expect(args).toContain("256k");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });
    it("should apply supplied extra options", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .addOptions([
            "-flags",
            "+loop",
            "-cmp",
            "+chroma",
            "-partitions",
            "+parti4x4+partp8x8+partb8x8",
          ])
          .addOptions("-single option")
          .addOptions("-multiple", "-options")
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-flags");
              expect(args).toContain("+loop");
              expect(args).toContain("-cmp");
              expect(args).toContain("+chroma");
              expect(args).toContain("-partitions");
              expect(args).toContain("+parti4x4+partp8x8+partb8x8");
              expect(args).toContain("-single");
              expect(args).toContain("option");
              expect(args).toContain("-multiple");
              expect(args).toContain("-options");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });
    it("should apply a single input option", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .addInputOption("-r", "29.97")
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              const joined = args.join(" ");
              expect(joined).toContain("-r 29.97");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });
    it("should apply multiple input options", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .addInputOptions(["-r 29.97", "-f ogg"])
          .addInputOptions("-single option")
          .addInputOptions("-multiple", "-options")
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              const joined = args.join(" ");
              expect(joined).toContain("-r 29.97");
              expect(joined).toContain("-f ogg");
              expect(joined).toContain("-single option");
              expect(joined).toContain("-multiple");
              expect(joined).toContain("-options");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });
  });

  describe("toFormat", function () {
    it("should apply the target format", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .toFormat("mp4")
          ._test_getArgs(function (args: unknown, err: unknown) {
            testhelper.logArgError(err);
            try {
              expect(err).toBeFalsy();
              expect(args).toContain("-f");
              expect(args).toContain("mp4");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
      });
    });
  });

  describe("Size calculations", function () {
    it("Should throw an error when an invalid aspect ratio is passed", function () {
      expect(() => {
        new Ffmpeg().aspect("blah");
      }).toThrow(/Invalid aspect ratio/);
    });

    it("Should add scale and setsar filters when keepPixelAspect was called", function () {
      let filters;

      filters = new Ffmpeg({ source: testfile, logger: testhelper.logger })
        .keepPixelAspect(true)
        ._test_getSizeFilters();
      expect(filters.length).toBe(2);
      expect(filters[0]).toBe("scale=w='if(gt(sar,1),iw*sar,iw)':h='if(lt(sar,1),ih/sar,ih)'");
      expect(filters[1]).toBe("setsar=1");
    });

    it("Should throw an error when an invalid size was requested", function () {
      expect(() => {
        new Ffmpeg().withSize("aslkdbasd");
      }).toThrow(/^Invalid size specified/);
    });

    it("Should not add scale filters when withSize was not called", function () {
      expect(
        new Ffmpeg({ source: testfile, logger: testhelper.logger })._test_getSizeFilters().length
      ).toBe(0);

      expect(
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .withAspect(4 / 3)
          ._test_getSizeFilters().length
      ).toBe(0);

      expect(
        new Ffmpeg({ source: testfile, logger: testhelper.logger })
          .applyAutopadding(true, "white")
          ._test_getSizeFilters().length
      ).toBe(0);
    });

    it("Should add proper scale filter when withSize was called with a percent value", function () {
      let filters;

      filters = new Ffmpeg({ source: testfile, logger: testhelper.logger })
        .withSize("42%")
        ._test_getSizeFilters();
      expect(filters.length).toBe(1);
      expect(filters[0]).toBe("scale=w=trunc(iw*0.42/2)*2:h=trunc(ih*0.42/2)*2");

      filters = new Ffmpeg({ source: testfile, logger: testhelper.logger })
        .withSize("42%")
        .withAspect(4 / 3)
        ._test_getSizeFilters();
      expect(filters.length).toBe(1);
      expect(filters[0]).toBe("scale=w=trunc(iw*0.42/2)*2:h=trunc(ih*0.42/2)*2");

      filters = new Ffmpeg({ source: testfile, logger: testhelper.logger })
        .withSize("42%")
        .applyAutopadding(true, "white")
        ._test_getSizeFilters();
      expect(filters.length).toBe(1);
      expect(filters[0]).toBe("scale=w=trunc(iw*0.42/2)*2:h=trunc(ih*0.42/2)*2");
    });

    it("Should add proper scale filter when withSize was called with a fixed size", function () {
      let filters;

      filters = new Ffmpeg({ source: testfile, logger: testhelper.logger })
        .withSize("100x200")
        ._test_getSizeFilters();
      expect(filters.length).toBe(1);
      expect(filters[0]).toBe("scale=w=100:h=200");

      filters = new Ffmpeg({ source: testfile, logger: testhelper.logger })
        .withSize("100x200")
        .withAspect(4 / 3)
        ._test_getSizeFilters();
      expect(filters.length).toBe(1);
      expect(filters[0]).toBe("scale=w=100:h=200");
    });

    it('Should add proper scale filter when withSize was called with a "?" and no aspect ratio is specified', function () {
      let filters;

      filters = new Ffmpeg({ source: testfile, logger: testhelper.logger })
        .withSize("100x?")
        ._test_getSizeFilters();
      expect(filters.length).toBe(1);
      expect(filters[0]).toBe("scale=w=100:h=trunc(ow/a/2)*2");

      filters = new Ffmpeg({ source: testfile, logger: testhelper.logger })
        .withSize("100x?")
        .applyAutopadding(true, "white")
        ._test_getSizeFilters();
      expect(filters.length).toBe(1);
      expect(filters[0]).toBe("scale=w=100:h=trunc(ow/a/2)*2");

      filters = new Ffmpeg({ source: testfile, logger: testhelper.logger })
        .withSize("?x200")
        ._test_getSizeFilters();
      expect(filters.length).toBe(1);
      expect(filters[0]).toBe("scale=w=trunc(oh*a/2)*2:h=200");

      filters = new Ffmpeg({ source: testfile, logger: testhelper.logger })
        .withSize("?x200")
        .applyAutopadding(true, "white")
        ._test_getSizeFilters();
      expect(filters.length).toBe(1);
      expect(filters[0]).toBe("scale=w=trunc(oh*a/2)*2:h=200");
    });

    it('Should add proper scale filter when withSize was called with a "?" and an aspect ratio is specified', function () {
      let filters;

      filters = new Ffmpeg({ source: testfile, logger: testhelper.logger })
        .withSize("100x?")
        .withAspect(0.5)
        ._test_getSizeFilters();
      expect(filters.length).toBe(1);
      expect(filters[0]).toBe("scale=w=100:h=200");

      filters = new Ffmpeg({ source: testfile, logger: testhelper.logger })
        .withSize("?x100")
        .withAspect(2)
        ._test_getSizeFilters();
      expect(filters.length).toBe(1);
      expect(filters[0]).toBe("scale=w=200:h=100");
    });

    it('Should add scale and pad filters when withSize was called with a "?", aspect ratio and auto padding are specified', function () {
      let filters;

      filters = new Ffmpeg({ source: testfile, logger: testhelper.logger })
        .withSize("100x?")
        .withAspect(0.5)
        .applyAutopadding(true, "white")
        ._test_getSizeFilters();
      expect(filters.length).toBe(2);
      expect(filters[0]).toBe(
        "scale=w='if(gt(a,0.5),100,trunc(200*a/2)*2)':h='if(lt(a,0.5),200,trunc(100/a/2)*2)'"
      );
      expect(filters[1]).toBe(
        "pad=w=100:h=200:x='if(gt(a,0.5),0,(100-iw)/2)':y='if(lt(a,0.5),0,(200-ih)/2)':color=white"
      );

      filters = new Ffmpeg({ source: testfile, logger: testhelper.logger })
        .withSize("?x100")
        .withAspect(2)
        .applyAutopadding(true, "white")
        ._test_getSizeFilters();
      expect(filters.length).toBe(2);
      expect(filters[0]).toBe(
        "scale=w='if(gt(a,2),200,trunc(100*a/2)*2)':h='if(lt(a,2),100,trunc(200/a/2)*2)'"
      );
      expect(filters[1]).toBe(
        "pad=w=200:h=100:x='if(gt(a,2),0,(200-iw)/2)':y='if(lt(a,2),0,(100-ih)/2)':color=white"
      );
    });

    it("Should add scale and pad filters when withSize was called with a fixed size and auto padding is specified", function () {
      let filters;

      filters = new Ffmpeg({ source: testfile, logger: testhelper.logger })
        .withSize("100x200")
        .applyAutopadding(true, "white")
        ._test_getSizeFilters();
      expect(filters.length).toBe(2);
      expect(filters[0]).toBe(
        "scale=w='if(gt(a,0.5),100,trunc(200*a/2)*2)':h='if(lt(a,0.5),200,trunc(100/a/2)*2)'"
      );
      expect(filters[1]).toBe(
        "pad=w=100:h=200:x='if(gt(a,0.5),0,(100-iw)/2)':y='if(lt(a,0.5),0,(200-ih)/2)':color=white"
      );

      filters = new Ffmpeg({ source: testfile, logger: testhelper.logger })
        .withSize("100x200")
        .withAspect(4 / 3)
        .applyAutopadding(true, "white")
        ._test_getSizeFilters();
      expect(filters.length).toBe(2);
      expect(filters[0]).toBe(
        "scale=w='if(gt(a,0.5),100,trunc(200*a/2)*2)':h='if(lt(a,0.5),200,trunc(100/a/2)*2)'"
      );
      expect(filters[1]).toBe(
        "pad=w=100:h=200:x='if(gt(a,0.5),0,(100-iw)/2)':y='if(lt(a,0.5),0,(200-ih)/2)':color=white"
      );

      filters = new Ffmpeg({ source: testfile, logger: testhelper.logger })
        .withSize("200x100")
        .applyAutopadding(true, "white")
        ._test_getSizeFilters();
      expect(filters.length).toBe(2);
      expect(filters[0]).toBe(
        "scale=w='if(gt(a,2),200,trunc(100*a/2)*2)':h='if(lt(a,2),100,trunc(200/a/2)*2)'"
      );
      expect(filters[1]).toBe(
        "pad=w=200:h=100:x='if(gt(a,2),0,(200-iw)/2)':y='if(lt(a,2),0,(100-ih)/2)':color=white"
      );

      filters = new Ffmpeg({ source: testfile, logger: testhelper.logger })
        .withSize("200x100")
        .withAspect(4 / 3)
        .applyAutopadding(true, "white")
        ._test_getSizeFilters();
      expect(filters.length).toBe(2);
      expect(filters[0]).toBe(
        "scale=w='if(gt(a,2),200,trunc(100*a/2)*2)':h='if(lt(a,2),100,trunc(200/a/2)*2)'"
      );
      expect(filters[1]).toBe(
        "pad=w=200:h=100:x='if(gt(a,2),0,(200-iw)/2)':y='if(lt(a,2),0,(100-ih)/2)':color=white"
      );
    });

    it("Should round sizes to multiples of 2", function () {
      let filters;
      const aspect = 102 / 202;

      filters = new Ffmpeg({ source: testfile, logger: testhelper.logger })
        .withSize("101x201")
        ._test_getSizeFilters();
      expect(filters.length).toBe(1);
      expect(filters[0]).toBe("scale=w=102:h=202");

      filters = new Ffmpeg({ source: testfile, logger: testhelper.logger })
        .withSize("101x201")
        .applyAutopadding(true, "white")
        ._test_getSizeFilters();
      expect(filters.length).toBe(2);
      expect(filters[0]).toBe(
        "scale=w='if(gt(a," +
          aspect +
          "),102,trunc(202*a/2)*2)':h='if(lt(a," +
          aspect +
          "),202,trunc(102/a/2)*2)'"
      );
      expect(filters[1]).toBe(
        "pad=w=102:h=202:x='if(gt(a," +
          aspect +
          "),0,(102-iw)/2)':y='if(lt(a," +
          aspect +
          "),0,(202-ih)/2)':color=white"
      );

      filters = new Ffmpeg({ source: testfile, logger: testhelper.logger })
        .withSize("101x?")
        .withAspect("1:2")
        ._test_getSizeFilters();
      expect(filters.length).toBe(1);
      expect(filters[0]).toBe("scale=w=102:h=202");

      filters = new Ffmpeg({ source: testfile, logger: testhelper.logger })
        .withSize("?x201")
        .withAspect("1:2")
        ._test_getSizeFilters();
      expect(filters.length).toBe(1);
      expect(filters[0]).toBe("scale=w=102:h=202");
    });

    it("Should apply autopadding when no boolean argument was passed to applyAutopadding", function () {
      const filters = new Ffmpeg({ source: testfile, logger: testhelper.logger })
        .withSize("100x?")
        .withAspect(0.5)
        .applyAutopadding("white")
        ._test_getSizeFilters();
      expect(filters.length).toBe(2);
      expect(filters[1]).toBe(
        "pad=w=100:h=200:x='if(gt(a,0.5),0,(100-iw)/2)':y='if(lt(a,0.5),0,(200-ih)/2)':color=white"
      );
    });

    it("Should default to black padding", function () {
      let filters = new Ffmpeg({ source: testfile, logger: testhelper.logger })
        .withSize("100x?")
        .withAspect(0.5)
        .applyAutopadding()
        ._test_getSizeFilters();
      expect(filters.length).toBe(2);
      expect(filters[1]).toBe(
        "pad=w=100:h=200:x='if(gt(a,0.5),0,(100-iw)/2)':y='if(lt(a,0.5),0,(200-ih)/2)':color=black"
      );

      filters = new Ffmpeg({ source: testfile, logger: testhelper.logger })
        .withSize("100x?")
        .withAspect(0.5)
        .applyAutopadding(true)
        ._test_getSizeFilters();
      expect(filters.length).toBe(2);
      expect(filters[1]).toBe(
        "pad=w=100:h=200:x='if(gt(a,0.5),0,(100-iw)/2)':y='if(lt(a,0.5),0,(200-ih)/2)':color=black"
      );
    });
  });

  describe("complexFilter", function () {
    it("should generate a complex filter from a single filter", function () {
      const filters = new Ffmpeg().complexFilter("filterstring")._getArguments();

      expect(filters.length).toBe(2);
      expect(filters[0]).toBe("-filter_complex");
      expect(filters[1]).toBe("filterstring");
    });

    it("should generate a complex filter from a filter array", function () {
      const filters = new Ffmpeg().complexFilter(["filter1", "filter2"])._getArguments();

      expect(filters.length).toBe(2);
      expect(filters[1]).toBe("filter1;filter2");
    });

    it("should support filter objects", function () {
      const filters = new Ffmpeg()
        .complexFilter(["filter1", { filter: "filter2" }])
        ._getArguments();

      expect(filters.length).toBe(2);
      expect(filters[1]).toBe("filter1;filter2");
    });

    it("should support filter options", function () {
      const filters = new Ffmpeg()
        .complexFilter([
          { filter: "filter1", options: "optionstring" },
          { filter: "filter2", options: ["opt1", "opt2", "opt3"] },
          { filter: "filter3", options: { opt1: "value1", opt2: "value2" } },
        ])
        ._getArguments();

      expect(filters.length).toBe(2);
      expect(filters[1]).toBe(
        "filter1=optionstring;filter2=opt1:opt2:opt3;filter3=opt1=value1:opt2=value2"
      );
    });

    it("should escape filter options with ambiguous characters", function () {
      const filters = new Ffmpeg()
        .complexFilter([
          { filter: "filter1", options: "optionstring" },
          { filter: "filter2", options: ["op,t1", "op,t2", "op,t3"] },
          { filter: "filter3", options: { opt1: "val,ue1", opt2: "val,ue2" } },
        ])
        ._getArguments();

      expect(filters.length).toBe(2);
      expect(filters[1]).toBe(
        "filter1=optionstring;filter2='op,t1':'op,t2':'op,t3';filter3=opt1='val,ue1':opt2='val,ue2'"
      );
    });

    it("should support filter input streams", function () {
      const filters = new Ffmpeg()
        .complexFilter([
          { filter: "filter1", inputs: "input" },
          { filter: "filter2", inputs: "[input]" },
          { filter: "filter3", inputs: ["[input1]", "input2"] },
        ])
        ._getArguments();

      expect(filters.length).toBe(2);
      expect(filters[1]).toBe("[input]filter1;[input]filter2;[input1][input2]filter3");
    });

    it("should support filter output streams", function () {
      const filters = new Ffmpeg()
        .complexFilter([
          { filter: "filter1", options: "opt", outputs: "output" },
          { filter: "filter2", options: "opt", outputs: "[output]" },
          { filter: "filter3", options: "opt", outputs: ["[output1]", "output2"] },
        ])
        ._getArguments();

      expect(filters.length).toBe(2);
      expect(filters[1]).toBe(
        "filter1=opt[output];filter2=opt[output];filter3=opt[output1][output2]"
      );
    });

    it("should support an additional mapping argument", function () {
      let filters = new Ffmpeg().complexFilter(["filter1", "filter2"], "output")._getArguments();

      expect(filters.length).toBe(4);
      expect(filters[2]).toBe("-map");
      expect(filters[3]).toBe("[output]");

      filters = new Ffmpeg().complexFilter(["filter1", "filter2"], "[output]")._getArguments();

      expect(filters.length).toBe(4);
      expect(filters[2]).toBe("-map");
      expect(filters[3]).toBe("[output]");

      filters = new Ffmpeg()
        .complexFilter(["filter1", "filter2"], ["[output1]", "output2"])
        ._getArguments();

      expect(filters.length).toBe(6);
      expect(filters[2]).toBe("-map");
      expect(filters[3]).toBe("[output1]");
      expect(filters[4]).toBe("-map");
      expect(filters[5]).toBe("[output2]");
    });

    it("should override any previously set complex filtergraphs", function () {
      const filters = new Ffmpeg()
        .complexFilter(["filter1a", "filter1b"], "output1")
        .complexFilter(["filter2a", "filter2b"], "output2")
        ._getArguments();

      expect(filters.length).toBe(4);
      expect(filters[1]).toBe("filter2a;filter2b");
      expect(filters[2]).toBe("-map");
      expect(filters[3]).toBe("[output2]");
    });
  });

  describe("clone", function () {
    it("should return a new FfmpegCommand instance", function () {
      const command = new Ffmpeg({ source: testfile, logger: testhelper.logger });
      const clone = command.clone();

      expect(clone).toBeInstanceOf(Ffmpeg);
      expect(clone).not.toBe(command);
    });

    it("should duplicate FfmpegCommand options at the time of the call", function () {
      return new Promise<void>((resolve, reject) => {
        const command = new Ffmpeg({ source: testfile, logger: testhelper.logger }).preset(
          "flashvideo"
        );

        const clone = command.clone();

        command._test_getArgs(function (originalArgs: unknown) {
          clone._test_getArgs(function (cloneArgs: unknown) {
            try {
              expect(cloneArgs.length).toBe(originalArgs.length);
              originalArgs.forEach(function (arg: unknown, index: unknown) {
                expect(cloneArgs[index]).toBe(arg);
              });
              resolve();
            } catch (e) {
              reject(e);
            }
          });
        });
      });
    });

    it("should have separate argument lists", function () {
      return new Promise<void>((resolve, reject) => {
        const command = new Ffmpeg({ source: testfile, logger: testhelper.logger }).preset(
          "flashvideo"
        );

        const clone = command.clone().audioFrequency(22050);

        command._test_getArgs(function (originalArgs: unknown) {
          clone._test_getArgs(function (cloneArgs: unknown) {
            try {
              expect(cloneArgs.length).toBe(originalArgs.length + 2);
              resolve();
            } catch (e) {
              reject(e);
            }
          });
        });
      });
    });
  });
});
