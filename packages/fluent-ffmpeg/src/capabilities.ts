/*jshint node:true*/
import fs from "fs";
import path from "path";
import async from "async";
import utils from "./utils";
import type { FfmpegCommand as FfmpegCommandInterface } from "./utils";

/*
 *! Capability helpers
 */

const avCodecRegexp = /^\s*([D ])([E ])([VAS])([S ])([D ])([T ]) ([^ ]+) +(.*)$/;
const ffCodecRegexp = /^\s*([D.])([E.])([VAS])([I.])([L.])([S.]) ([^ ]+) +(.*)$/;
const ffEncodersRegexp = /\(encoders:([^)]+)\)/;
const ffDecodersRegexp = /\(decoders:([^)]+)\)/;
const encodersRegexp = /^\s*([VAS.])([F.])([S.])([X.])([B.])([D.]) ([^ ]+) +(.*)$/;
const formatRegexp = /^\s*([D ])([E ])\s+([^ ]+)\s+(.*)$/;
const lineBreakRegexp = /\r\n|\r|\n/;
const filterRegexp = /^(?: [T.][S.][C.] )?([^ ]+) +(AA?|VV?|\|)->(AA?|VV?|\|) +(.*)$/;

const cache: Record<string, unknown> = {};

export default function (proto: Record<string, unknown>) {
  /**
   * Manually define the ffmpeg binary full path.
   */
  proto.setFfmpegPath = function (this: FfmpegCommandInterface, ffmpegPath: string) {
    cache.ffmpegPath = ffmpegPath;
    return this;
  };

  /**
   * Manually define the ffprobe binary full path.
   */
  proto.setFfprobePath = function (this: FfmpegCommandInterface, ffprobePath: string) {
    cache.ffprobePath = ffprobePath;
    return this;
  };

  /**
   * Manually define the flvtool2/flvmeta binary full path.
   */
  proto.setFlvtoolPath = function (this: FfmpegCommandInterface, flvtool: string) {
    cache.flvtoolPath = flvtool;
    return this;
  };

  /**
   * Forget executable paths
   */
  proto._forgetPaths = function () {
    delete cache.ffmpegPath;
    delete cache.ffprobePath;
    delete cache.flvtoolPath;
    delete cache.ffmpegVersion;
    delete cache.codecs;
    delete cache.formats;
    delete cache.encoders;
    delete cache.filters;
  };

  /**
   * Get ffmpeg version
   */
  proto._getFfmpegVersion = function (
    this: FfmpegCommandInterface,
    callback: (err: Error | null, version?: unknown) => void
  ) {
    if ("ffmpegVersion" in cache) {
      return callback(null, cache.ffmpegVersion);
    }

    this._spawnFfmpeg(
      ["-version"],
      {},
      undefined,
      (err: Error | null, stdoutRing) => {
        if (err || !stdoutRing) {
          return callback(err);
        }

        const stdout = stdoutRing.get();
        const versionMatch = stdout.match(/ffmpeg version (?:n)?(\d+)\.(\d+)(?:\.(\d+))?/);
        let version = null;

        if (versionMatch) {
          version = {
            major: parseInt(versionMatch[1], 10),
            minor: parseInt(versionMatch[2], 10),
            patch: versionMatch[3] ? parseInt(versionMatch[3], 10) : 0,
            full: versionMatch[0].replace(/ffmpeg version (?:n)?/, ""),
          };
        }

        callback(null, (cache.ffmpegVersion = version));
      }
    );
  };

  /**
   * Check for ffmpeg availability
   */
  proto._getFfmpegPath = function (callback: (err: Error | null, path?: string) => void) {
    if ("ffmpegPath" in cache) {
      return callback(null, cache.ffmpegPath as string);
    }

    async.waterfall(
      [
        // Try PATH, but only if FFMPEG_PATH is not set correctly
        (cb: (err: Error | null, p: string) => void) => {
          if (process.env.FFMPEG_PATH) {
            fs.access(process.env.FFMPEG_PATH, fs.constants.F_OK, (err) => {
              cb(null, !err ? process.env.FFMPEG_PATH! : "");
            });
          } else {
            cb(null, "");
          }
        },
        (ffmpeg: string, cb: (err: Error | null, p: string) => void) => {
          if (ffmpeg.length) return cb(null, ffmpeg);
          utils.which("ffmpeg", (err, result) => cb(null, result || ""));
        },
      ],
      (err, result) => {
        if (err) return callback(err);
        if (result) cache.ffmpegPath = result;
        callback(null, result);
      }
    );
  };

  /**
   * Check for ffprobe availability
   */
  proto._getFfprobePath = function (
    this: FfmpegCommandInterface,
    callback: (err: Error | null, path?: string) => void
  ) {
    if ("ffprobePath" in cache) {
      return callback(null, cache.ffprobePath as string);
    }

    async.waterfall(
      [
        (cb: (err: Error | null, p: string) => void) => {
          if (process.env.FFPROBE_PATH) {
            fs.access(process.env.FFPROBE_PATH, fs.constants.F_OK, (err) => {
              cb(null, !err ? process.env.FFPROBE_PATH! : "");
            });
          } else {
            cb(null, "");
          }
        },
        (ffprobe: string, cb: (err: Error | null, p: string) => void) => {
          if (ffprobe.length) return cb(null, ffprobe);
          utils.which("ffprobe", (err, result) => cb(null, result || ""));
        },
        (ffprobe: string, cb: (err: Error | null, p: string) => void) => {
          if (ffprobe.length) return cb(null, ffprobe);
          this._getFfmpegPath((err, ffmpeg) => {
            if (err || !ffmpeg) return cb(null, "");
            const name = utils.isWindows ? "ffprobe.exe" : "ffprobe";
            const ffprobePathFound = path.join(path.dirname(ffmpeg), name);
            fs.access(ffprobePathFound, fs.constants.F_OK, (errAccess) => {
              cb(null, !errAccess ? ffprobePathFound : "");
            });
          });
        },
      ],
      (err, result) => {
        if (err) return callback(err);
        if (result) cache.ffprobePath = result;
        callback(null, result);
      }
    );
  };

  /**
   * Check for flvtool2/flvmeta availability
   */
  proto._getFlvtoolPath = function (callback: (err: Error | null, path?: string) => void) {
    if ("flvtoolPath" in cache) return callback(null, cache.flvtoolPath as string);

    async.waterfall(
      [
        (cb: (err: Error | null, p: string) => void) => {
          if (process.env.FLVMETA_PATH) {
            fs.access(process.env.FLVMETA_PATH, fs.constants.F_OK, (err) =>
              cb(null, !err ? process.env.FLVMETA_PATH! : "")
            );
          } else cb(null, "");
        },
        (p: string, cb: (err: Error | null, p: string) => void) => {
          if (p.length) return cb(null, p);
          if (process.env.FLVTOOL2_PATH) {
            fs.access(process.env.FLVTOOL2_PATH, fs.constants.F_OK, (err) =>
              cb(null, !err ? process.env.FLVTOOL2_PATH! : "")
            );
          } else cb(null, "");
        },
        (p: string, cb: (err: Error | null, p: string) => void) => {
          if (p.length) return cb(null, p);
          utils.which("flvmeta", (err, result) => cb(null, result || ""));
        },
        (p: string, cb: (err: Error | null, p: string) => void) => {
          if (p.length) return cb(null, p);
          utils.which("flvtool2", (err, result) => cb(null, result || ""));
        },
      ],
      (err, result) => {
        if (err) return callback(err);
        if (result) cache.flvtoolPath = result;
        callback(null, result);
      }
    );
  };

  /**
   * Query ffmpeg for available filters
   */
  proto.availableFilters = proto.getAvailableFilters = function (
    this: FfmpegCommandInterface,
    callback: (err: Error | null, filters?: unknown) => void
  ) {
    if ("filters" in cache) return callback(null, cache.filters);

    this._spawnFfmpeg(
      ["-filters"],
      {},
      undefined,
      (err, stdoutRing) => {
        if (err || !stdoutRing) return callback(err);
        const stdout = stdoutRing.get();
        const lines = stdout.split("\n");
        const data: Record<string, unknown> = {};
        const types: Record<string, string> = { A: "audio", V: "video", "|": "none" };

        lines.forEach((line) => {
          const match = line.match(filterRegexp);
          if (match) {
            data[match[1]] = {
              description: match[4],
              input: types[match[2].charAt(0)],
              multipleInputs: match[2].length > 1,
              output: types[match[3].charAt(0)],
              multipleOutputs: match[3].length > 1,
            };
          }
        });
        callback(null, (cache.filters = data));
      }
    );
  };

  /**
   * Query ffmpeg for available codecs
   */
  proto.availableCodecs = proto.getAvailableCodecs = function (
    this: FfmpegCommandInterface,
    callback: (err: Error | null, codecs?: unknown) => void
  ) {
    if ("codecs" in cache) return callback(null, cache.codecs);

    this._spawnFfmpeg(
      ["-codecs"],
      {},
      undefined,
      (err, stdoutRing) => {
        if (err || !stdoutRing) return callback(err);
        const stdout = stdoutRing.get();
        const lines = stdout.split(lineBreakRegexp);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: Record<string, any> = {};

        lines.forEach((line) => {
          let match = line.match(avCodecRegexp);
          if (match && match[7] !== "=") {
            data[match[7]] = {
              type: { V: "video", A: "audio", S: "subtitle" }[match[3] as "V" | "A" | "S"],
              description: match[8],
              canDecode: match[1] === "D",
              canEncode: match[2] === "E",
              drawHorizBand: match[4] === "S",
              directRendering: match[5] === "D",
              weirdFrameTruncation: match[6] === "T",
            };
          }

          match = line.match(ffCodecRegexp);
          if (match && match[7] !== "=") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const codecData: Record<string, any> = (data[match[7]] = {
              type: { V: "video", A: "audio", S: "subtitle" }[match[3] as "V" | "A" | "S"],
              description: match[8],
              canDecode: match[1] === "D",
              canEncode: match[2] === "E",
              intraFrameOnly: match[4] === "I",
              isLossy: match[5] === "L",
              isLossless: match[6] === "S",
            });

            const encoders = (codecData.description as string).match(ffEncodersRegexp);
            const encoderParts = encoders ? encoders[1].trim().split(" ") : [];

            const decoders = (codecData.description as string).match(ffDecodersRegexp);
            const decoderParts = decoders ? decoders[1].trim().split(" ") : [];

            if (encoderParts.length || decoderParts.length) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const coderData: Record<string, any> = {};
              utils.copy(codecData, coderData);
              delete coderData.canEncode;
              delete coderData.canDecode;

              encoderParts.forEach((name) => {
                data[name] = {};
                utils.copy(coderData, data[name]);
                data[name].canEncode = true;
              });

              decoderParts.forEach((name) => {
                if (name in data) {
                  data[name].canDecode = true;
                } else {
                  data[name] = {};
                  utils.copy(coderData, data[name]);
                  data[name].canDecode = true;
                }
              });
            }
          }
        });
        callback(null, (cache.codecs = data));
      }
    );
  };

  /**
   * Query ffmpeg for available encoders
   */
  proto.availableEncoders = proto.getAvailableEncoders = function (
    this: FfmpegCommandInterface,
    callback: (err: Error | null, encoders?: unknown) => void
  ) {
    if ("encoders" in cache) return callback(null, cache.encoders);

    this._spawnFfmpeg(
      ["-encoders"],
      {},
      undefined,
      (err, stdoutRing) => {
        if (err || !stdoutRing) return callback(err);
        const stdout = stdoutRing.get();
        const lines = stdout.split(lineBreakRegexp);
        const data: Record<string, unknown> = {};

        lines.forEach((line) => {
          const match = line.match(encodersRegexp);
          if (match && match[7] !== "=") {
            data[match[7]] = {
              type: { V: "video", A: "audio", S: "subtitle" }[match[1] as "V" | "A" | "S"],
              description: match[8],
              frameMT: match[2] === "F",
              sliceMT: match[3] === "S",
              experimental: match[4] === "X",
              drawHorizBand: match[5] === "B",
              directRendering: match[6] === "D",
            };
          }
        });
        callback(null, (cache.encoders = data));
      }
    );
  };

  /**
   * Query ffmpeg for available formats
   */
  proto.availableFormats = proto.getAvailableFormats = function (
    this: FfmpegCommandInterface,
    callback: (err: Error | null, formats?: unknown) => void
  ) {
    if ("formats" in cache) return callback(null, cache.formats);

    this._spawnFfmpeg(
      ["-formats"],
      {},
      undefined,
      (err, stdoutRing) => {
        if (err || !stdoutRing) return callback(err);
        const stdout = stdoutRing.get();
        const lines = stdout.split(lineBreakRegexp);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: Record<string, any> = {};

        lines.forEach((line) => {
          const match = line.match(formatRegexp);
          if (match) {
            match[3].split(",").forEach((formatFound) => {
              if (!(formatFound in data)) {
                data[formatFound] = {
                  description: match[4],
                  canDemux: false,
                  canMux: false,
                };
              }
              if (match[1] === "D") data[formatFound].canDemux = true;
              if (match[2] === "E") data[formatFound].canMux = true;
            });
          }
        });
        callback(null, (cache.formats = data));
      }
    );
  };

  /**
   * Check capabilities before executing a command
   */
  proto._checkCapabilities = function (
    this: FfmpegCommandInterface,
    callback: (err?: Error | null) => void
  ) {
    async.waterfall(
      [
        (cb: (err: Error | null, f?: unknown) => void) => this.availableFormats(cb),
        (formats: unknown, cb: (err?: Error | null) => void) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fmts = formats as Record<string, any>;
          let unavailable: string[];

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          unavailable = this._outputs.reduce((acc: string[], output: any) => {
            const formatFound = output.options.find("-f", 1);
            if (formatFound) {
              if (!(formatFound[0] in fmts) || !fmts[formatFound[0]].canMux)
                acc.push(formatFound[0]);
            }
            return acc;
          }, []);

          if (unavailable.length === 1)
            return cb(new Error(`Output format ${unavailable[0]} is not available`));
          if (unavailable.length > 1)
            return cb(new Error(`Output formats ${unavailable.join(", ")} are not available`));

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          unavailable = this._inputs.reduce((acc: string[], input: any) => {
            const formatFound = input.options.find("-f", 1);
            if (formatFound) {
              if (!(formatFound[0] in fmts) || !fmts[formatFound[0]].canDemux)
                acc.push(formatFound[0]);
            }
            return acc;
          }, []);

          if (unavailable.length === 1)
            return cb(new Error(`Input format ${unavailable[0]} is not available`));
          if (unavailable.length > 1)
            return cb(new Error(`Input formats ${unavailable.join(", ")} are not available`));

          cb(null);
        },
        (cb: (err: Error | null, e?: unknown) => void) => this.availableEncoders(cb),
        (encoders: unknown, cb: (err?: Error | null) => void) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const encs = encoders as Record<string, any>;
          let unavailable: string[];

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          unavailable = this._outputs.reduce((acc: string[], output: any) => {
            const acodec = output.audio.find("-acodec", 1);
            if (acodec && acodec[0] !== "copy") {
              if (!(acodec[0] in encs) || encs[acodec[0]].type !== "audio") acc.push(acodec[0]);
            }
            return acc;
          }, []);

          if (unavailable.length === 1)
            return cb(new Error(`Audio codec ${unavailable[0]} is not available`));
          if (unavailable.length > 1)
            return cb(new Error(`Audio codecs ${unavailable.join(", ")} are not available`));

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          unavailable = this._outputs.reduce((acc: string[], output: any) => {
            const vcodec = output.video.find("-vcodec", 1);
            if (vcodec && vcodec[0] !== "copy") {
              if (!(vcodec[0] in encs) || encs[vcodec[0]].type !== "video") acc.push(vcodec[0]);
            }
            return acc;
          }, []);

          if (unavailable.length === 1)
            return cb(new Error(`Video codec ${unavailable[0]} is not available`));
          if (unavailable.length > 1)
            return cb(new Error(`Video codecs ${unavailable.join(", ")} are not available`));

          cb(null);
        },
      ],
      callback
    );
  };
}
