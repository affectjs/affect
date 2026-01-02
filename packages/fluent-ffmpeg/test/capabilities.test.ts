import path from "path";
import assert from "assert";
import async from "async";
import os from "os";
import Ffmpeg from "../src/index";
import testhelper from "./helpers";
import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";

// delimiter fallback
const PATH_DELIMITER = path.delimiter || (os.platform().match(/win(32|64)/) ? ";" : ":");

// Ensure ffmpeg/ffprobe are in PATH for tests that rely on PATH search
if (process.env.FFMPEG_PATH) {
  const dir = path.dirname(process.env.FFMPEG_PATH);
  if (!process.env.PATH?.includes(dir)) {
    process.env.PATH = dir + PATH_DELIMITER + (process.env.PATH || "");
  }
}

describe("Capabilities", function () {
  describe("ffmpeg capabilities", function () {
    it("should enable querying for available codecs", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: "" }).getAvailableCodecs(function (err: unknown, codecs: unknown) {
          testhelper.logError(err);
          try {
            expect(err).toBeFalsy();
            expect(typeof codecs).toBe("object");
            expect(Object.keys(codecs).length).not.toBe(0);

            expect("pcm_s16le" in codecs).toBe(true);
            expect("type" in codecs.pcm_s16le).toBe(true);
            expect(typeof codecs.pcm_s16le.type).toBe("string");
            expect("description" in codecs.pcm_s16le).toBe(true);
            expect(typeof codecs.pcm_s16le.description).toBe("string");
            expect("canEncode" in codecs.pcm_s16le).toBe(true);
            expect(typeof codecs.pcm_s16le.canEncode).toBe("boolean");
            expect("canDecode" in codecs.pcm_s16le).toBe(true);
            expect(typeof codecs.pcm_s16le.canDecode).toBe("boolean");
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    it("should enable querying for available encoders", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: "" }).getAvailableEncoders(function (err: unknown, encoders: unknown) {
          testhelper.logError(err);
          try {
            expect(err).toBeFalsy();
            expect(typeof encoders).toBe("object");
            expect(Object.keys(encoders).length).not.toBe(0);

            expect("pcm_s16le" in encoders).toBe(true);
            expect("type" in encoders.pcm_s16le).toBe(true);
            expect(typeof encoders.pcm_s16le.type).toBe("string");
            expect("description" in encoders.pcm_s16le).toBe(true);
            expect(typeof encoders.pcm_s16le.description).toBe("string");
            expect("experimental" in encoders.pcm_s16le).toBe(true);
            expect(typeof encoders.pcm_s16le.experimental).toBe("boolean");
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    it("should enable querying for available formats", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: "" }).getAvailableFormats(function (err: unknown, formats: unknown) {
          testhelper.logError(err);
          try {
            expect(err).toBeFalsy();
            expect(typeof formats).toBe("object");
            expect(Object.keys(formats).length).not.toBe(0);

            expect("wav" in formats).toBe(true);
            expect("description" in formats.wav).toBe(true);
            expect(typeof formats.wav.description).toBe("string");
            expect("canMux" in formats.wav).toBe(true);
            expect(typeof formats.wav.canMux).toBe("boolean");
            expect("canDemux" in formats.wav).toBe(true);
            expect(typeof formats.wav.canDemux).toBe("boolean");
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    it("should enable querying for available filters", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg({ source: "" }).getAvailableFilters(function (err: unknown, filters: unknown) {
          testhelper.logError(err);
          try {
            expect(err).toBeFalsy();
            expect(typeof filters).toBe("object");
            expect(Object.keys(filters).length).not.toBe(0);

            expect("anull" in filters).toBe(true);
            expect("description" in filters.anull).toBe(true);
            expect(typeof filters.anull.description).toBe("string");
            expect("input" in filters.anull).toBe(true);
            expect(typeof filters.anull.input).toBe("string");
            expect("output" in filters.anull).toBe(true);
            expect(typeof filters.anull.output).toBe("string");
            expect("multipleInputs" in filters.anull).toBe(true);
            expect(typeof filters.anull.multipleInputs).toBe("boolean");
            expect("multipleOutputs" in filters.anull).toBe(true);
            expect(typeof filters.anull.multipleOutputs).toBe("boolean");
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    it("should enable querying capabilities without instanciating a command", function () {
      return new Promise<void>((resolve, reject) => {
        Ffmpeg.getAvailableCodecs(function (err: unknown, codecs: unknown) {
          testhelper.logError(err);
          try {
            expect(err).toBeFalsy();
            expect(typeof codecs).toBe("object");
            expect(Object.keys(codecs).length).not.toBe(0);

            Ffmpeg.getAvailableFilters(function (err: unknown, filters: unknown) {
              testhelper.logError(err);
              try {
                expect(err).toBeFalsy();
                expect(typeof filters).toBe("object");
                expect(Object.keys(filters).length).not.toBe(0);

                Ffmpeg.getAvailableFormats(function (err: unknown, formats: unknown) {
                  testhelper.logError(err);
                  try {
                    expect(err).toBeFalsy();
                    expect(typeof formats).toBe("object");
                    expect(Object.keys(formats).length).not.toBe(0);
                    resolve();
                  } catch (e) {
                    reject(e);
                  }
                });
              } catch (e) {
                reject(e);
              }
            });
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    it("should enable checking command arguments for available codecs, formats and encoders", function () {
      return new Promise<void>((resolve, reject) => {
        async.waterfall(
          [
            // Check with everything available
            function (cb: (...args: unknown[]) => unknown) {
              new Ffmpeg("/path/to/file.avi")
                .fromFormat("avi")
                .audioCodec("pcm_u16le")
                .videoCodec("png")
                .toFormat("mp4")
                ._checkCapabilities(cb);
            },

            // Invalid input format
            function (cb: (...args: unknown[]) => unknown) {
              new Ffmpeg("/path/to/file.avi")
                .fromFormat("invalid-input-format")
                .audioCodec("pcm_u16le")
                .videoCodec("png")
                .toFormat("mp4")
                ._checkCapabilities(function (err: unknown) {
                  try {
                    expect(err).toBeTruthy();
                    expect(err.message).toMatch(
                      /Input format invalid-input-format is not available/
                    );
                    cb();
                  } catch (e) {
                    cb(e);
                  }
                });
            },

            // Invalid output format
            function (cb: (...args: unknown[]) => unknown) {
              new Ffmpeg("/path/to/file.avi")
                .fromFormat("avi")
                .audioCodec("pcm_u16le")
                .videoCodec("png")
                .toFormat("invalid-output-format")
                ._checkCapabilities(function (err: unknown) {
                  try {
                    expect(err).toBeTruthy();
                    expect(err.message).toMatch(
                      /Output format invalid-output-format is not available/
                    );
                    cb();
                  } catch (e) {
                    cb(e);
                  }
                });
            },

            // Invalid audio codec
            function (cb: (...args: unknown[]) => unknown) {
              new Ffmpeg("/path/to/file.avi")
                .fromFormat("avi")
                .audioCodec("invalid-audio-codec")
                .videoCodec("png")
                .toFormat("mp4")
                ._checkCapabilities(function (err: unknown) {
                  try {
                    expect(err).toBeTruthy();
                    expect(err.message).toMatch(/Audio codec invalid-audio-codec is not available/);
                    cb();
                  } catch (e) {
                    cb(e);
                  }
                });
            },

            // Invalid video codec
            function (cb: (...args: unknown[]) => unknown) {
              new Ffmpeg("/path/to/file.avi")
                .fromFormat("avi")
                .audioCodec("pcm_u16le")
                .videoCodec("invalid-video-codec")
                .toFormat("mp4")
                ._checkCapabilities(function (err: unknown) {
                  try {
                    expect(err).toBeTruthy();
                    expect(err.message).toMatch(/Video codec invalid-video-codec is not available/);
                    cb();
                  } catch (e) {
                    cb(e);
                  }
                });
            },

            // Invalid audio encoder
            function (cb: (...args: unknown[]) => unknown) {
              new Ffmpeg("/path/to/file.avi")
                .fromFormat("avi")
                // Valid codec, but not a valid encoder for audio
                .audioCodec("png")
                .videoCodec("png")
                .toFormat("mp4")
                ._checkCapabilities(function (err: unknown) {
                  try {
                    expect(err).toBeTruthy();
                    expect(err.message).toMatch(/Audio codec png is not available/);
                    cb();
                  } catch (e) {
                    cb(e);
                  }
                });
            },

            // Invalid video encoder
            function (cb: (...args: unknown[]) => unknown) {
              new Ffmpeg("/path/to/file.avi")
                .fromFormat("avi")
                .audioCodec("pcm_u16le")
                // Valid codec, but not a valid encoder for video
                .videoCodec("pcm_u16le")
                .toFormat("mp4")
                ._checkCapabilities(function (err: unknown) {
                  try {
                    expect(err).toBeTruthy();
                    expect(err.message).toMatch(/Video codec pcm_u16le is not available/);
                    cb();
                  } catch (e) {
                    cb(e);
                  }
                });
            },
          ],
          function (err: unknown) {
            testhelper.logError(err);
            try {
              expect(err).toBeFalsy();
              resolve();
            } catch (e) {
              reject(e);
            }
          }
        );
      });
    });

    it("should check capabilities before running a command", function () {
      return new Promise<void>((resolve, reject) => {
        new Ffmpeg("/path/to/file.avi")
          .on("error", function (err: unknown) {
            try {
              expect(err.message).toMatch(/Output format invalid-output-format is not available/);
              resolve();
            } catch (e) {
              reject(e);
            }
          })
          .toFormat("invalid-output-format")
          .saveToFile("/tmp/will-not-be-created.mp4");
      });
    });
  });

  describe("ffmpeg path", function () {
    let FFMPEG_PATH: string | undefined;
    let ALT_FFMPEG_PATH: string | undefined;
    let skipAltTest = false;

    if (process.env.ALT_FFMPEG_PATH) {
      ALT_FFMPEG_PATH = process.env.ALT_FFMPEG_PATH;
    } else {
      skipAltTest = true;
    }

    beforeEach(function () {
      FFMPEG_PATH = process.env.FFMPEG_PATH;
    });

    afterEach(function () {
      process.env.FFMPEG_PATH = FFMPEG_PATH;
    });

    afterAll(function () {
      new Ffmpeg()._forgetPaths();
    });

    it("should allow manual definition of ffmpeg binary path", function () {
      return new Promise<void>((resolve, reject) => {
        const ff = new Ffmpeg();
        ff.setFfmpegPath("/doom/di/dom");
        ff._getFfmpegPath(function (err: unknown, ffmpeg: unknown) {
          testhelper.logError(err);
          try {
            expect(err).toBeFalsy();
            expect(ffmpeg).toBe("/doom/di/dom");
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    it("should allow static manual definition of ffmpeg binary path", function () {
      return new Promise<void>((resolve, reject) => {
        const ff = new Ffmpeg();
        Ffmpeg.setFfmpegPath("/doom/di/dom2");
        ff._getFfmpegPath(function (err: unknown, ffmpeg: unknown) {
          testhelper.logError(err);
          try {
            expect(err).toBeFalsy();
            expect(ffmpeg).toBe("/doom/di/dom2");
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    it("should look for ffmpeg in the PATH if FFMPEG_PATH is not defined", function () {
      return new Promise<void>((resolve, reject) => {
        const ff = new Ffmpeg();
        delete process.env.FFMPEG_PATH;
        ff._forgetPaths();
        ff._getFfmpegPath(function (err: unknown, ffmpeg: unknown) {
          testhelper.logError(err);
          try {
            expect(err).toBeFalsy();
            expect(typeof ffmpeg).toBe("string");
            expect(ffmpeg.length).toBeGreaterThan(0);

            if (process.env.PATH) {
              const paths = process.env.PATH.split(PATH_DELIMITER);
              expect(paths).toContain(path.dirname(ffmpeg));
            }
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    (skipAltTest ? it.skip : it)("should use FFMPEG_PATH if defined and valid", function () {
      return new Promise<void>((resolve, reject) => {
        const ff = new Ffmpeg();
        process.env.FFMPEG_PATH = ALT_FFMPEG_PATH;
        ff._forgetPaths();
        ff._getFfmpegPath(function (err: unknown, ffmpeg: unknown) {
          testhelper.logError(err);
          try {
            expect(err).toBeFalsy();
            expect(ffmpeg).toBe(ALT_FFMPEG_PATH);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    it("should fall back to searching in the PATH if FFMPEG_PATH is invalid", function () {
      return new Promise<void>((resolve, reject) => {
        const ff = new Ffmpeg();
        process.env.FFMPEG_PATH = "/nope/not-here/nothing-to-see-here";
        ff._forgetPaths();
        ff._getFfmpegPath(function (err: unknown, ffmpeg: unknown) {
          testhelper.logError(err);
          try {
            expect(err).toBeFalsy();
            expect(typeof ffmpeg).toBe("string");
            expect(ffmpeg.length).toBeGreaterThan(0);
            if (process.env.PATH) {
              const paths = process.env.PATH.split(PATH_DELIMITER);
              expect(paths).toContain(path.dirname(ffmpeg));
            }
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    it("should remember ffmpeg path", function () {
      return new Promise<void>((resolve, reject) => {
        const ff = new Ffmpeg();
        delete process.env.FFMPEG_PATH;
        ff._forgetPaths();
        let after = 0;

        ff._getFfmpegPath(function (err: unknown, ffmpeg: unknown) {
          testhelper.logError(err);
          try {
            expect(err).toBeFalsy();
            expect(typeof ffmpeg).toBe("string");
            expect(ffmpeg.length).toBeGreaterThan(0);

            ff._getFfmpegPath(function (err: unknown, ffmpeg2: unknown) {
              testhelper.logError(err);
              try {
                expect(err).toBeFalsy();
                expect(typeof ffmpeg2).toBe("string");
                expect(ffmpeg2.length).toBeGreaterThan(0);
                expect(after).toBe(0); // Sync check
                resolve();
              } catch (e) {
                reject(e);
              }
            });
            after = 1;
          } catch (e) {
            reject(e);
          }
        });
      });
    });
  });

  describe("ffprobe path", function () {
    let FFPROBE_PATH: string | undefined;
    let ALT_FFPROBE_PATH: string | undefined;
    let skipAltTest = false;

    if (process.env.ALT_FFPROBE_PATH) {
      ALT_FFPROBE_PATH = process.env.ALT_FFPROBE_PATH;
    } else {
      skipAltTest = true;
    }

    beforeEach(function () {
      FFPROBE_PATH = process.env.FFPROBE_PATH;
    });

    afterEach(function () {
      process.env.FFPROBE_PATH = FFPROBE_PATH;
    });

    afterAll(function () {
      new Ffmpeg()._forgetPaths();
    });

    it("should allow manual definition of ffprobe binary path", function () {
      return new Promise<void>((resolve, reject) => {
        const ff = new Ffmpeg();
        ff.setFfprobePath("/doom/di/dom");
        ff._getFfprobePath(function (err: unknown, ffprobe: unknown) {
          testhelper.logError(err);
          try {
            expect(err).toBeFalsy();
            expect(ffprobe).toBe("/doom/di/dom");
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    it("should allow static manual definition of ffprobe binary path", function () {
      return new Promise<void>((resolve, reject) => {
        const ff = new Ffmpeg();
        Ffmpeg.setFfprobePath("/doom/di/dom2");
        ff._getFfprobePath(function (err: unknown, ffprobe: unknown) {
          testhelper.logError(err);
          try {
            expect(err).toBeFalsy();
            expect(ffprobe).toBe("/doom/di/dom2");
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    it("should look for ffprobe in the PATH if FFPROBE_PATH is not defined", function () {
      return new Promise<void>((resolve, reject) => {
        const ff = new Ffmpeg();
        delete process.env.FFPROBE_PATH;
        ff._forgetPaths();
        ff._getFfprobePath(function (err: unknown, ffprobe: unknown) {
          testhelper.logError(err);
          try {
            expect(err).toBeFalsy();
            expect(typeof ffprobe).toBe("string");
            expect(ffprobe.length).toBeGreaterThan(0);
            if (process.env.PATH) {
              const paths = process.env.PATH.split(PATH_DELIMITER);
              expect(paths).toContain(path.dirname(ffprobe));
            }
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    (skipAltTest ? it.skip : it)("should use FFPROBE_PATH if defined and valid", function () {
      return new Promise<void>((resolve, reject) => {
        const ff = new Ffmpeg();
        process.env.FFPROBE_PATH = ALT_FFPROBE_PATH;
        ff._forgetPaths();
        ff._getFfprobePath(function (err: unknown, ffprobe: unknown) {
          testhelper.logError(err);
          try {
            expect(err).toBeFalsy();
            expect(ffprobe).toBe(ALT_FFPROBE_PATH);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    it("should fall back to searching in the PATH if FFPROBE_PATH is invalid", function () {
      return new Promise<void>((resolve, reject) => {
        const ff = new Ffmpeg();
        process.env.FFPROBE_PATH = "/nope/not-here/nothing-to-see-here";
        ff._forgetPaths();
        ff._getFfprobePath(function (err: unknown, ffprobe: unknown) {
          testhelper.logError(err);
          try {
            expect(err).toBeFalsy();
            expect(typeof ffprobe).toBe("string");
            expect(ffprobe.length).toBeGreaterThan(0);
            if (process.env.PATH) {
              const paths = process.env.PATH.split(PATH_DELIMITER);
              expect(paths).toContain(path.dirname(ffprobe));
            }
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    it("should remember ffprobe path", function () {
      return new Promise<void>((resolve, reject) => {
        const ff = new Ffmpeg();
        delete process.env.FFPROBE_PATH;
        ff._forgetPaths();
        let after = 0;
        ff._getFfprobePath(function (err: unknown, ffprobe: unknown) {
          testhelper.logError(err);
          try {
            expect(err).toBeFalsy();
            expect(typeof ffprobe).toBe("string");
            expect(ffprobe.length).toBeGreaterThan(0);

            ff._getFfprobePath(function (err: unknown, ffprobe2: unknown) {
              testhelper.logError(err);
              try {
                expect(err).toBeFalsy();
                expect(typeof ffprobe2).toBe("string");
                expect(ffprobe2.length).toBeGreaterThan(0);
                expect(after).toBe(0);
                resolve();
              } catch (e) {
                reject(e);
              }
            });
            after = 1;
          } catch (e) {
            reject(e);
          }
        });
      });
    });
  });

  describe("flvtool path", function () {
    let FLVTOOL2_PATH: string | undefined;
    let ALT_FLVTOOL_PATH: string | undefined;
    let skipAltTest = false;
    let skipTest = false;

    if (
      process.env.FLVTOOL2_PRESENT === "no" ||
      (!process.env.FLVTOOL2_PATH && process.env.FLVTOOL2_PRESENT !== "yes")
    ) {
      skipTest = true;
    }

    if (process.env.ALT_FLVTOOL_PATH) {
      ALT_FLVTOOL_PATH = process.env.ALT_FLVTOOL_PATH;
    } else {
      skipAltTest = true;
    }

    beforeEach(function () {
      FLVTOOL2_PATH = process.env.FLVTOOL2_PATH;
    });

    afterEach(function () {
      process.env.FLVTOOL2_PATH = FLVTOOL2_PATH;
    });

    afterAll(function () {
      new Ffmpeg()._forgetPaths();
    });

    (skipTest ? it.skip : it)(
      "should allow manual definition of fflvtool binary path",
      function () {
        return new Promise<void>((resolve, reject) => {
          const ff = new Ffmpeg();
          ff.setFlvtoolPath("/doom/di/dom");
          ff._getFlvtoolPath(function (err: unknown, fflvtool: unknown) {
            testhelper.logError(err);
            try {
              expect(err).toBeFalsy();
              expect(fflvtool).toBe("/doom/di/dom");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
        });
      }
    );

    (skipTest ? it.skip : it)(
      "should allow static manual definition of fflvtool binary path",
      function () {
        return new Promise<void>((resolve, reject) => {
          const ff = new Ffmpeg();
          Ffmpeg.setFlvtoolPath("/doom/di/dom2");
          ff._getFlvtoolPath(function (err: unknown, fflvtool: unknown) {
            testhelper.logError(err);
            try {
              expect(err).toBeFalsy();
              expect(fflvtool).toBe("/doom/di/dom2");
              resolve();
            } catch (e) {
              reject(e);
            }
          });
        });
      }
    );

    (skipTest ? it.skip : it)(
      "should look for fflvtool in the PATH if FLVTOOL2_PATH is not defined",
      function () {
        return new Promise<void>((resolve, reject) => {
          const ff = new Ffmpeg();
          delete process.env.FLVTOOL2_PATH;
          ff._forgetPaths();
          ff._getFlvtoolPath(function (err: unknown, fflvtool: unknown) {
            testhelper.logError(err);
            try {
              expect(err).toBeFalsy();
              expect(typeof fflvtool).toBe("string");
              expect(fflvtool.length).toBeGreaterThan(0);
              if (process.env.PATH) {
                const paths = process.env.PATH.split(PATH_DELIMITER);
                expect(paths).toContain(path.dirname(fflvtool));
              }
              resolve();
            } catch (e) {
              reject(e);
            }
          });
        });
      }
    );

    (skipTest || skipAltTest ? it.skip : it)(
      "should use FLVTOOL2_PATH if defined and valid",
      function () {
        return new Promise<void>((resolve, reject) => {
          const ff = new Ffmpeg();
          process.env.FLVTOOL2_PATH = ALT_FLVTOOL_PATH;
          ff._forgetPaths();
          ff._getFlvtoolPath(function (err: unknown, fflvtool: unknown) {
            testhelper.logError(err);
            try {
              expect(err).toBeFalsy();
              expect(fflvtool).toBe(ALT_FLVTOOL_PATH);
              resolve();
            } catch (e) {
              reject(e);
            }
          });
        });
      }
    );

    (skipTest ? it.skip : it)(
      "should fall back to searching in the PATH if FLVTOOL2_PATH is invalid",
      function () {
        return new Promise<void>((resolve, reject) => {
          const ff = new Ffmpeg();
          process.env.FLVTOOL2_PATH = "/nope/not-here/nothing-to-see-here";
          ff._forgetPaths();
          ff._getFlvtoolPath(function (err: unknown, fflvtool: unknown) {
            testhelper.logError(err);
            try {
              expect(err).toBeFalsy();
              expect(typeof fflvtool).toBe("string");
              expect(fflvtool.length).toBeGreaterThan(0);
              if (process.env.PATH) {
                const paths = process.env.PATH.split(PATH_DELIMITER);
                expect(paths).toContain(path.dirname(fflvtool));
              }
              resolve();
            } catch (e) {
              reject(e);
            }
          });
        });
      }
    );

    (skipTest ? it.skip : it)("should remember fflvtool path", function () {
      return new Promise<void>((resolve, reject) => {
        const ff = new Ffmpeg();
        delete process.env.FLVTOOL2_PATH;
        ff._forgetPaths();
        let after = 0;
        ff._getFlvtoolPath(function (err: unknown, fflvtool: unknown) {
          testhelper.logError(err);
          try {
            expect(err).toBeFalsy();
            expect(typeof fflvtool).toBe("string");
            expect(fflvtool.length).toBeGreaterThan(0);

            ff._getFlvtoolPath(function (err: unknown, fflvtool2: unknown) {
              testhelper.logError(err);
              try {
                expect(err).toBeFalsy();
                expect(typeof fflvtool2).toBe("string");
                expect(fflvtool2.length).toBeGreaterThan(0);
                expect(after).toBe(0);
                resolve();
              } catch (e) {
                reject(e);
              }
            });
            after = 1;
          } catch (e) {
            reject(e);
          }
        });
      });
    });
  });
});
