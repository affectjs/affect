/*jshint node:true, laxcomma:true*/
import { spawn } from "child_process";

function legacyTag(key: string) {
  return key.match(/^TAG:/);
}
function legacyDisposition(key: string) {
  return key.match(/^DISPOSITION:/);
}

function parseFfprobeOutput(out: string) {
  var lines = out.split(/\r\n|\r|\n/);

  lines = lines.filter(function (line) {
    return line.length > 0;
  });

  var data: any = {
    streams: [],
    format: {},
    chapters: [],
  };

  function parseBlock(name: string) {
    var data: Record<string, any> = {};

    var line = lines.shift();
    while (typeof line !== "undefined") {
      if (line.toLowerCase() == "[/" + name + "]") {
        return data;
      } else if (line.match(/^\[/)) {
        line = lines.shift();
        continue;
      }

      var kv = line.match(/^([^=]+)=(.*)$/);
      if (kv) {
        if (!kv[1].match(/^TAG:/) && kv[2].match(/^[0-9]+(\.[0-9]+)?$/)) {
          data[kv[1]] = Number(kv[2]);
        } else {
          data[kv[1]] = kv[2];
        }
      }

      line = lines.shift();
    }

    return data;
  }

  var line = lines.shift();
  while (typeof line !== "undefined") {
    if (line.match(/^\[stream/i)) {
      var stream = parseBlock("stream");
      data.streams.push(stream);
    } else if (line.match(/^\[chapter/i)) {
      var chapter = parseBlock("chapter");
      data.chapters.push(chapter);
    } else if (line.toLowerCase() === "[format]") {
      data.format = parseBlock("format");
    }

    line = lines.shift();
  }

  return data;
}

export default function (proto: any) {
  /**
   * A callback passed to the {@link FfmpegCommand#ffprobe} method.
   *
   * @callback FfmpegCommand~ffprobeCallback
   *
   * @param {Error|null} err error object or null if no error happened
   * @param {Object} ffprobeData ffprobe output data; this object
   *   has the same format as what the following command returns:
   *
   *     `ffprobe -print_format json -show_streams -show_format INPUTFILE`
   * @param {Array} ffprobeData.streams stream information
   * @param {Object} ffprobeData.format format information
   */

  /**
   * Run ffprobe on last specified input
   *
   * @method FfmpegCommand#ffprobe
   * @category Metadata
   *
   * @param {?Number} [index] 0-based index of input to probe (defaults to last input)
   * @param {?String[]} [options] array of output options to return
   * @param {FfmpegCommand~ffprobeCallback} callback callback function
   *
   */
  proto.ffprobe = function (this: any) {
    var input,
      index = null,
      options = [],
      callback;

    // the last argument should be the callback
    var callback: any = arguments[arguments.length - 1];

    var ended = false;
    function handleCallback(err: Error | null, data?: any) {
      if (!ended) {
        ended = true;
        callback(err, data);
      }
    }

    // map the arguments to the correct variable names
    switch (arguments.length) {
      case 3:
        index = arguments[0];
        options = arguments[1];
        break;
      case 2:
        if (typeof arguments[0] === "number") {
          index = arguments[0];
        } else if (Array.isArray(arguments[0])) {
          options = arguments[0];
        }
        break;
    }

    if (index === null) {
      if (!this._currentInput) {
        return handleCallback(new Error("No input specified"));
      }

      input = this._currentInput;
    } else {
      input = this._inputs[index];

      if (!input) {
        return handleCallback(new Error("Invalid input index"));
      }
    }

    // Find ffprobe
    this._getFfprobePath(function (err: Error, path: string) {
      if (err) {
        return handleCallback(err);
      } else if (!path) {
        return handleCallback(new Error("Cannot find ffprobe"));
      }

      var stdout = "";
      var stdoutClosed = false;
      var stderr = "";
      var stderrClosed = false;

      // Spawn ffprobe
      // Use -of (or -print_format for older versions) to ensure consistent output format
      // FFmpeg 6.1.1+ recommends -of, and -output_format is an alias
      // Check if output format is already specified in options
      var hasOutputFormat = options.some(function (opt: any) {
        return (
          typeof opt === "string" &&
          (opt === "-of" ||
            opt === "-print_format" ||
            opt === "-output_format" ||
            opt.startsWith("-of=") ||
            opt.startsWith("-print_format=") ||
            opt.startsWith("-output_format="))
        );
      });

      var ffprobeArgs = ["-show_streams", "-show_format"];
      if (!hasOutputFormat) {
        // Default to ini format for backward compatibility with parseFfprobeOutput
        // Try -of first (FFmpeg 6.1.1+), fallback to -print_format for older versions
        ffprobeArgs.push("-of", "default");
      }
      var src = input.isStream ? "pipe:0" : input.source;
      ffprobeArgs = ffprobeArgs.concat(options, src);

      var ffprobe = spawn(path, ffprobeArgs, { windowsHide: true });

      if (input.isStream) {
        // Skip errors on stdin. These get thrown when ffprobe is complete and
        // there seems to be no way hook in and close stdin before it throws.
        ffprobe.stdin!.on("error", function (err: any) {
          if (["ECONNRESET", "EPIPE", "EOF"].indexOf(err.code) >= 0) {
            return;
          }
          handleCallback(err);
        });

        // Once ffprobe's input stream closes, we need no more data from the
        // input
        ffprobe.stdin!.on("close", function () {
          input.source.pause();
          input.source.unpipe(ffprobe.stdin);
        });

        input.source.pipe(ffprobe.stdin);
      }

      ffprobe.on("error", callback);

      // Ensure we wait for captured streams to end before calling callback
      var exitError: Error | null = null;
      function handleExit(err?: Error) {
        if (err) {
          exitError = err;
        }

        if (processExited && stdoutClosed && stderrClosed) {
          if (exitError) {
            if (stderr) {
              exitError.message += "\n" + stderr;
            }

            return handleCallback(exitError);
          }

          // Process output
          var data = parseFfprobeOutput(stdout);

          // Handle legacy output with "TAG:x" and "DISPOSITION:x" keys
          [data.format].concat(data.streams).forEach(function (target: any) {
            if (target) {
              var legacyTagKeys = Object.keys(target).filter(legacyTag);

              if (legacyTagKeys.length) {
                target.tags = target.tags || {};

                legacyTagKeys.forEach(function (tagKey) {
                  target.tags[tagKey.substr(4)] = target[tagKey];
                  delete target[tagKey];
                });
              }

              var legacyDispositionKeys = Object.keys(target).filter(legacyDisposition);

              if (legacyDispositionKeys.length) {
                target.disposition = target.disposition || {};

                legacyDispositionKeys.forEach(function (dispositionKey) {
                  target.disposition[dispositionKey.substr(12)] = target[dispositionKey];
                  delete target[dispositionKey];
                });
              }
            }
          });

          handleCallback(null, data);
        }
      }

      // Handle ffprobe exit
      var processExited = false;
      ffprobe.on("exit", function (code, signal) {
        processExited = true;

        if (code) {
          handleExit(new Error("ffprobe exited with code " + code));
        } else if (signal) {
          handleExit(new Error("ffprobe was killed with signal " + signal));
        } else {
          handleExit();
        }
      });

      // Handle stdout/stderr streams
      ffprobe.stdout!.on("data", function (data) {
        stdout += data;
      });

      ffprobe.stdout!.on("close", function () {
        stdoutClosed = true;
        handleExit();
      });

      ffprobe.stderr!.on("data", function (data) {
        stderr += data;
      });

      ffprobe.stderr!.on("close", function () {
        stderrClosed = true;
        handleExit();
      });
    });
  };
}
