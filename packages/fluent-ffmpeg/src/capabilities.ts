/*jshint node:true*/
import fs from "fs";
import path from "path";
import async from "async";
import utils from "./utils";

/*
 *! Capability helpers
 */

var avCodecRegexp = /^\s*([D ])([E ])([VAS])([S ])([D ])([T ]) ([^ ]+) +(.*)$/;
var ffCodecRegexp = /^\s*([D\.])([E\.])([VAS])([I\.])([L\.])([S\.]) ([^ ]+) +(.*)$/;
var ffEncodersRegexp = /\(encoders:([^\)]+)\)/;
var ffDecodersRegexp = /\(decoders:([^\)]+)\)/;
var encodersRegexp = /^\s*([VAS\.])([F\.])([S\.])([X\.])([B\.])([D\.]) ([^ ]+) +(.*)$/;
var formatRegexp = /^\s*([D ])([E ])\s+([^ ]+)\s+(.*)$/;
var lineBreakRegexp = /\r\n|\r|\n/;
var filterRegexp = /^(?: [T\.][S\.][C\.] )?([^ ]+) +(AA?|VV?|\|)->(AA?|VV?|\|) +(.*)$/;

var cache: Record<string, any> = {};

export default function (proto: any) {
  /**
   * Manually define the ffmpeg binary full path.
   *
   * @method FfmpegCommand#setFfmpegPath
   *
   * @param {String} ffmpegPath The full path to the ffmpeg binary.
   * @return FfmpegCommand
   */
  proto.setFfmpegPath = function (ffmpegPath: string) {
    cache.ffmpegPath = ffmpegPath;
    return this;
  };

  /**
   * Manually define the ffprobe binary full path.
   *
   * @method FfmpegCommand#setFfprobePath
   *
   * @param {String} ffprobePath The full path to the ffprobe binary.
   * @return FfmpegCommand
   */
  proto.setFfprobePath = function (ffprobePath: string) {
    cache.ffprobePath = ffprobePath;
    return this;
  };

  /**
   * Manually define the flvtool2/flvmeta binary full path.
   *
   * @method FfmpegCommand#setFlvtoolPath
   *
   * @param {String} flvtool The full path to the flvtool2 or flvmeta binary.
   * @return FfmpegCommand
   */
  proto.setFlvtoolPath = function (flvtool: string) {
    cache.flvtoolPath = flvtool;
    return this;
  };

  /**
   * Forget executable paths
   *
   * (only used for testing purposes)
   *
   * @method FfmpegCommand#_forgetPaths
   * @private
   */
  proto._forgetPaths = function () {
    delete cache.ffmpegPath;
    delete cache.ffprobePath;
    delete cache.flvtoolPath;
    delete cache.ffmpegVersion;
  };

  /**
   * Get ffmpeg version
   *
   * Detects the installed ffmpeg version by running 'ffmpeg -version'
   * and parsing the version string. The result is cached.
   *
   * @method FfmpegCommand#_getFfmpegVersion
   * @param {Function} callback callback with signature (err, version)
   *   version is an object with {major, minor, patch, full} properties
   * @private
   */
  proto._getFfmpegVersion = function (callback: (err: Error | null, version?: any) => void) {
    var self = this;

    if ("ffmpegVersion" in cache) {
      return callback(null, cache.ffmpegVersion);
    }

    this._spawnFfmpeg(
      ["-version"],
      { captureStdout: true, stdoutLines: 10 },
      function (err: Error | null, stdoutRing: any) {
        if (err) {
          return callback(err);
        }

        var stdout = stdoutRing.get();
        // Parse version from output like "ffmpeg version 4.4.2" or "ffmpeg version n4.4.2"
        var versionMatch = stdout.match(/ffmpeg version (?:n)?(\d+)\.(\d+)(?:\.(\d+))?/);
        var version = null;

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
   *
   * If the FFMPEG_PATH environment variable is set, try to use it.
   * If it is unset or incorrect, try to find ffmpeg in the PATH instead.
   *
   * @method FfmpegCommand#_getFfmpegPath
   * @param {Function} callback callback with signature (err, path)
   * @private
   */
  proto._getFfmpegPath = function (callback: (err: Error | null, path?: string) => void) {
    if ("ffmpegPath" in cache) {
      return callback(null, cache.ffmpegPath);
    }

    async.waterfall(
      [
        // Try FFMPEG_PATH
        function (cb: (err: Error | null, path: string) => void) {
          if (process.env.FFMPEG_PATH) {
            fs.access(process.env.FFMPEG_PATH, fs.constants.F_OK, function (err) {
              if (!err) {
                cb(null, process.env.FFMPEG_PATH!);
              } else {
                cb(null, "");
              }
            });
          } else {
            cb(null, "");
          }
        },

        // Search in the PATH
        function (ffmpeg: string, cb: (err: Error | null, path: string) => void) {
          if (ffmpeg.length) {
            return cb(null, ffmpeg);
          }

          utils.which("ffmpeg", function (err, ffmpeg) {
            cb(err, ffmpeg!);
          });
        },
      ],
      function (err: Error | null, ffmpeg: string) {
        if (err) {
          callback(err);
        } else {
          callback(null, (cache.ffmpegPath = ffmpeg || ""));
        }
      }
    );
  };

  /**
   * Check for ffprobe availability
   *
   * If the FFPROBE_PATH environment variable is set, try to use it.
   * If it is unset or incorrect, try to find ffprobe in the PATH instead.
   * If this still fails, try to find ffprobe in the same directory as ffmpeg.
   *
   * @method FfmpegCommand#_getFfprobePath
   * @param {Function} callback callback with signature (err, path)
   * @private
   */
  proto._getFfprobePath = function (callback: (err: Error | null, path?: string) => void) {
    var self = this;

    if ("ffprobePath" in cache) {
      return callback(null, cache.ffprobePath);
    }

    async.waterfall(
      [
        // Try FFPROBE_PATH
        function (cb: (err: Error | null, path: string) => void) {
          if (process.env.FFPROBE_PATH) {
            fs.access(process.env.FFPROBE_PATH, fs.constants.F_OK, function (err) {
              cb(null, !err ? process.env.FFPROBE_PATH! : "");
            });
          } else {
            cb(null, "");
          }
        },

        // Search in the PATH
        function (ffprobe: string, cb: (err: Error | null, path: string) => void) {
          if (ffprobe.length) {
            return cb(null, ffprobe);
          }

          utils.which("ffprobe", function (err, ffprobe) {
            cb(err, ffprobe);
          });
        },

        // Search in the same directory as ffmpeg
        function (ffprobe: string, cb: (err: Error | null, path: string) => void) {
          if (ffprobe.length) {
            return cb(null, ffprobe);
          }

          self._getFfmpegPath(function (err: Error | null, ffmpeg: string) {
            if (err) {
              cb(err, "");
            } else if (ffmpeg.length) {
              var name = utils.isWindows ? "ffprobe.exe" : "ffprobe";
              var ffprobe = path.join(path.dirname(ffmpeg), name);
              fs.access(ffprobe, fs.constants.F_OK, function (err) {
                cb(null, !err ? ffprobe : "");
              });
            } else {
              cb(null, "");
            }
          });
        },
      ],
      function (err: Error | null, ffprobe: string) {
        if (err) {
          callback(err);
        } else {
          callback(null, (cache.ffprobePath = ffprobe || ""));
        }
      }
    );
  };

  /**
   * Check for flvtool2/flvmeta availability
   *
   * If the FLVTOOL2_PATH or FLVMETA_PATH environment variable are set, try to use them.
   * If both are either unset or incorrect, try to find flvtool2 or flvmeta in the PATH instead.
   *
   * @method FfmpegCommand#_getFlvtoolPath
   * @param {Function} callback callback with signature (err, path)
   * @private
   */
  proto._getFlvtoolPath = function (callback: (err: Error | null, path?: string) => void) {
    if ("flvtoolPath" in cache) {
      return callback(null, cache.flvtoolPath);
    }

    async.waterfall(
      [
        // Try FLVMETA_PATH
        function (cb: (err: Error | null, path: string) => void) {
          if (process.env.FLVMETA_PATH) {
            fs.access(process.env.FLVMETA_PATH, fs.constants.F_OK, function (err) {
              cb(null, !err ? process.env.FLVMETA_PATH! : "");
            });
          } else {
            cb(null, "");
          }
        },

        // Try FLVTOOL2_PATH
        function (flvtool: string, cb: (err: Error | null, path: string) => void) {
          if (flvtool.length) {
            return cb(null, flvtool);
          }

          if (process.env.FLVTOOL2_PATH) {
            fs.access(process.env.FLVTOOL2_PATH, fs.constants.F_OK, function (err) {
              cb(null, !err ? process.env.FLVTOOL2_PATH! : "");
            });
          } else {
            cb(null, "");
          }
        },

        // Search for flvmeta in the PATH
        function (flvtool: string, cb: (err: Error | null, path: string) => void) {
          if (flvtool.length) {
            return cb(null, flvtool);
          }

          utils.which("flvmeta", function (err, flvmeta) {
            cb(err, flvmeta!);
          });
        },

        // Search for flvtool2 in the PATH
        function (flvtool: string, cb: (err: Error | null, path: string) => void) {
          if (flvtool.length) {
            return cb(null, flvtool);
          }

          utils.which("flvtool2", function (err, flvtool2) {
            cb(err, flvtool2!);
          });
        },
      ],
      function (err: Error | null, flvtool: string) {
        if (err) {
          callback(err);
        } else {
          callback(null, (cache.flvtoolPath = flvtool || ""));
        }
      }
    );
  };

  /**
   * A callback passed to {@link FfmpegCommand#availableFilters}.
   *
   * @callback FfmpegCommand~filterCallback
   * @param {Error|null} err error object or null if no error happened
   * @param {Object} filters filter object with filter names as keys and the following
   *   properties for each filter:
   * @param {String} filters.description filter description
   * @param {String} filters.input input type, one of 'audio', 'video' and 'none'
   * @param {Boolean} filters.multipleInputs whether the filter supports multiple inputs
   * @param {String} filters.output output type, one of 'audio', 'video' and 'none'
   * @param {Boolean} filters.multipleOutputs whether the filter supports multiple outputs
   */

  /**
   * Query ffmpeg for available filters
   *
   * @method FfmpegCommand#availableFilters
   * @category Capabilities
   * @aliases getAvailableFilters
   *
   * @param {FfmpegCommand~filterCallback} callback callback function
   */
  proto.availableFilters = proto.getAvailableFilters = function (
    callback: (err: Error | null, filters?: any) => void
  ) {
    if ("filters" in cache) {
      return callback(null, cache.filters);
    }

    this._spawnFfmpeg(
      ["-filters"],
      { captureStdout: true, stdoutLines: 0 },
      function (err: Error | null, stdoutRing: any) {
        if (err) {
          return callback(err);
        }

        var stdout = stdoutRing.get();
        var lines = stdout.split("\n");
        var data: any = {};
        var types: any = { A: "audio", V: "video", "|": "none" };

        lines.forEach(function (line: string) {
          var match = line.match(filterRegexp);
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
   * A callback passed to {@link FfmpegCommand#availableCodecs}.
   *
   * @callback FfmpegCommand~codecCallback
   * @param {Error|null} err error object or null if no error happened
   * @param {Object} codecs codec object with codec names as keys and the following
   *   properties for each codec (more properties may be available depending on the
   *   ffmpeg version used):
   * @param {String} codecs.description codec description
   * @param {Boolean} codecs.canDecode whether the codec is able to decode streams
   * @param {Boolean} codecs.canEncode whether the codec is able to encode streams
   */

  /**
   * Query ffmpeg for available codecs
   *
   * @method FfmpegCommand#availableCodecs
   * @category Capabilities
   * @aliases getAvailableCodecs
   *
   * @param {FfmpegCommand~codecCallback} callback callback function
   */
  proto.availableCodecs = proto.getAvailableCodecs = function (
    callback: (err: Error | null, codecs?: any) => void
  ) {
    if ("codecs" in cache) {
      return callback(null, cache.codecs);
    }

    this._spawnFfmpeg(
      ["-codecs"],
      { captureStdout: true, stdoutLines: 0 },
      function (err: Error | null, stdoutRing: any) {
        if (err) {
          return callback(err);
        }

        var stdout = stdoutRing.get();
        var lines = stdout.split(lineBreakRegexp);
        var data: any = {};

        lines.forEach(function (line: string) {
          var match = line.match(avCodecRegexp);
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
            var codecData = (data[match[7]] = {
              type: { V: "video", A: "audio", S: "subtitle" }[match[3] as "V" | "A" | "S"],
              description: match[8],
              canDecode: match[1] === "D",
              canEncode: match[2] === "E",
              intraFrameOnly: match[4] === "I",
              isLossy: match[5] === "L",
              isLossless: match[6] === "S",
            });

            var encoders = codecData.description.match(ffEncodersRegexp);
            encoders = encoders ? encoders[1].trim().split(" ") : [];

            var decoders = codecData.description.match(ffDecodersRegexp);
            decoders = decoders ? decoders[1].trim().split(" ") : [];

            if (encoders.length || decoders.length) {
              var coderData: any = {};
              utils.copy(codecData, coderData);
              delete coderData.canEncode;
              delete coderData.canDecode;

              encoders.forEach(function (name: string) {
                data[name] = {};
                utils.copy(coderData, data[name]);
                data[name].canEncode = true;
              });

              decoders.forEach(function (name: string) {
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
   * A callback passed to {@link FfmpegCommand#availableEncoders}.
   *
   * @callback FfmpegCommand~encodersCallback
   * @param {Error|null} err error object or null if no error happened
   * @param {Object} encoders encoders object with encoder names as keys and the following
   *   properties for each encoder:
   * @param {String} encoders.description codec description
   * @param {Boolean} encoders.type "audio", "video" or "subtitle"
   * @param {Boolean} encoders.frameMT whether the encoder is able to do frame-level multithreading
   * @param {Boolean} encoders.sliceMT whether the encoder is able to do slice-level multithreading
   * @param {Boolean} encoders.experimental whether the encoder is experimental
   * @param {Boolean} encoders.drawHorizBand whether the encoder supports draw_horiz_band
   * @param {Boolean} encoders.directRendering whether the encoder supports direct encoding method 1
   */

  /**
   * Query ffmpeg for available encoders
   *
   * @method FfmpegCommand#availableEncoders
   * @category Capabilities
   * @aliases getAvailableEncoders
   *
   * @param {FfmpegCommand~encodersCallback} callback callback function
   */
  proto.availableEncoders = proto.getAvailableEncoders = function (
    callback: (err: Error | null, encoders?: any) => void
  ) {
    if ("encoders" in cache) {
      return callback(null, cache.encoders);
    }

    this._spawnFfmpeg(
      ["-encoders"],
      { captureStdout: true, stdoutLines: 0 },
      function (err: Error | null, stdoutRing: any) {
        if (err) {
          return callback(err);
        }

        var stdout = stdoutRing.get();
        var lines = stdout.split(lineBreakRegexp);
        var data: any = {};

        lines.forEach(function (line: string) {
          var match = line.match(encodersRegexp);
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
   * A callback passed to {@link FfmpegCommand#availableFormats}.
   *
   * @callback FfmpegCommand~formatCallback
   * @param {Error|null} err error object or null if no error happened
   * @param {Object} formats format object with format names as keys and the following
   *   properties for each format:
   * @param {String} formats.description format description
   * @param {Boolean} formats.canDemux whether the format is able to demux streams from an input file
   * @param {Boolean} formats.canMux whether the format is able to mux streams into an output file
   */

  /**
   * Query ffmpeg for available formats
   *
   * @method FfmpegCommand#availableFormats
   * @category Capabilities
   * @aliases getAvailableFormats
   *
   * @param {FfmpegCommand~formatCallback} callback callback function
   */
  proto.availableFormats = proto.getAvailableFormats = function (
    callback: (err: Error | null, formats?: any) => void
  ) {
    if ("formats" in cache) {
      return callback(null, cache.formats);
    }

    // Run ffmpeg -formats
    this._spawnFfmpeg(
      ["-formats"],
      { captureStdout: true, stdoutLines: 0 },
      function (err: Error | null, stdoutRing: any) {
        if (err) {
          return callback(err);
        }

        // Parse output
        var stdout = stdoutRing.get();
        var lines = stdout.split(lineBreakRegexp);
        var data: any = {};

        lines.forEach(function (line: string) {
          var match = line.match(formatRegexp);
          if (match) {
            match[3].split(",").forEach(function (format: string) {
              if (!(format in data)) {
                data[format] = {
                  description: match[4],
                  canDemux: false,
                  canMux: false,
                };
              }

              if (match[1] === "D") {
                data[format].canDemux = true;
              }
              if (match[2] === "E") {
                data[format].canMux = true;
              }
            });
          }
        });

        callback(null, (cache.formats = data));
      }
    );
  };

  /**
   * Check capabilities before executing a command
   *
   * Checks whether all used codecs and formats are indeed available
   *
   * @method FfmpegCommand#_checkCapabilities
   * @param {Function} callback callback with signature (err)
   * @private
   */
  proto._checkCapabilities = function (callback: (err?: Error | null) => void) {
    var self = this;
    async.waterfall(
      [
        // Get available formats
        function (cb: (err: Error | null, formats?: any) => void) {
          self.availableFormats(cb);
        },

        // Check whether specified formats are available
        function (formats: any, cb: (err?: Error, result?: any) => void) {
          var unavailable: string[];

          // Output format(s)
          unavailable = self._outputs.reduce(function (fmts: string[], output: any) {
            var format = output.options.find("-f", 1);
            if (format) {
              if (!(format[0] in formats) || !formats[format[0]].canMux) {
                fmts.push(format);
              }
            }

            return fmts;
          }, []);

          if (unavailable.length === 1) {
            return cb(new Error("Output format " + unavailable[0] + " is not available"));
          } else if (unavailable.length > 1) {
            return cb(new Error("Output formats " + unavailable.join(", ") + " are not available"));
          }

          // Input format(s)
          unavailable = self._inputs.reduce(function (fmts: string[], input: any) {
            var format = input.options.find("-f", 1);
            if (format) {
              if (!(format[0] in formats) || !formats[format[0]].canDemux) {
                fmts.push(format[0]);
              }
            }

            return fmts;
          }, []);

          if (unavailable.length === 1) {
            return cb(new Error("Input format " + unavailable[0] + " is not available"));
          } else if (unavailable.length > 1) {
            return cb(new Error("Input formats " + unavailable.join(", ") + " are not available"));
          }

          cb();
        },

        // Get available codecs
        function (cb: (err: Error | null, encoders?: any) => void) {
          self.availableEncoders(cb);
        },

        // Check whether specified codecs are available and add strict experimental options if needed
        function (encoders: any, cb: (err?: Error) => void) {
          var unavailable: string[];

          // Audio codec(s)
          unavailable = self._outputs.reduce(function (cdcs: string[], output: any) {
            var acodec = output.audio.find("-acodec", 1);
            if (acodec && acodec[0] !== "copy") {
              if (!(acodec[0] in encoders) || encoders[acodec[0]].type !== "audio") {
                cdcs.push(acodec[0]);
              }
            }

            return cdcs;
          }, []);

          if (unavailable.length === 1) {
            return cb(new Error("Audio codec " + unavailable[0] + " is not available"));
          } else if (unavailable.length > 1) {
            return cb(new Error("Audio codecs " + unavailable.join(", ") + " are not available"));
          }

          // Video codec(s)
          unavailable = self._outputs.reduce(function (cdcs: string[], output: any) {
            var vcodec = output.video.find("-vcodec", 1);
            if (vcodec && vcodec[0] !== "copy") {
              if (!(vcodec[0] in encoders) || encoders[vcodec[0]].type !== "video") {
                cdcs.push(vcodec[0]);
              }
            }

            return cdcs;
          }, []);

          if (unavailable.length === 1) {
            return cb(new Error("Video codec " + unavailable[0] + " is not available"));
          } else if (unavailable.length > 1) {
            return cb(new Error("Video codecs " + unavailable.join(", ") + " are not available"));
          }

          cb();
        },
      ],
      callback
    );
  };
}
