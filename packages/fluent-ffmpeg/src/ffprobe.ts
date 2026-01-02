/*jshint node:true, laxcomma:true*/
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { type FfmpegCommand } from "./utils.js";

export interface FfprobeStream extends Record<string, unknown> {
  codec_type?: string;
  width?: number;
  height?: number;
  duration?: string | number;
  bit_rate?: string | number;
}

export interface FfprobeFormat extends Record<string, unknown> {
  duration?: string | number;
  bit_rate?: string | number;
  tags?: Record<string, unknown>;
}

export interface FfprobeData {
  streams: FfprobeStream[];
  format: FfprobeFormat;
  chapters: Record<string, unknown>[];
}

function legacyTag(key: string): boolean {
  return !!key.match(/^TAG:/);
}
function legacyDisposition(key: string): boolean {
  return !!key.match(/^DISPOSITION:/);
}

function parseFfprobeOutput(out: string): FfprobeData {
  let lines = out.split(/\r\n|\r|\n/);

  lines = lines.filter(function (line) {
    return line.length > 0;
  });

  const data: FfprobeData = {
    streams: [],
    format: {},
    chapters: [],
  };

  function parseBlock(name: string): Record<string, unknown> {
    const blockData: Record<string, unknown> = {};

    let line = lines.shift();
    while (typeof line !== "undefined") {
      if (line.toLowerCase() === "[/" + name + "]") {
        return blockData;
      } else if (line.match(/^\[/)) {
        line = lines.shift();
        continue;
      }

      const kv = line.match(/^([^=]+)=(.*)$/);
      if (kv) {
        if (!kv[1].match(/^TAG:/) && kv[2].match(/^[0-9]+(\.[0-9]+)?$/)) {
          blockData[kv[1]] = Number(kv[2]);
        } else {
          blockData[kv[1]] = kv[2];
        }
      }

      line = lines.shift();
    }

    return blockData;
  }

  let line = lines.shift();
  while (typeof line !== "undefined") {
    if (line.match(/^\[stream/i)) {
      const stream = parseBlock("stream") as FfprobeStream;
      data.streams.push(stream);
    } else if (line.match(/^\[chapter/i)) {
      const chapter = parseBlock("chapter");
      data.chapters.push(chapter);
    } else if (line.toLowerCase() === "[format]") {
      data.format = parseBlock("format") as FfprobeFormat;
    }

    line = lines.shift();
  }

  return data;
}

/**
 * ffprobe exports
 * @param {Object} proto prototype to extend
 */
export default function (proto: Record<string, unknown>) {
  /**
   * Run ffprobe on last specified input
   *
   * @method FfmpegCommand#ffprobe
   * @category Metadata
   *
   * @param {?Number} [index] 0-based index of input to probe (defaults to last input)
   * @param {?String[]} [options] array of output options to return
   * @param {Function} callback callback function
   *
   */
  proto.ffprobe = function (this: FfmpegCommand, ...args: unknown[]) {
    let input: FfmpegCommand["_inputs"][number];
    let index: number | null = null;
    let options: string[] = [];

    // the last argument should be the callback
    const lastArg = args[args.length - 1];
    if (typeof lastArg !== "function") {
      throw new Error("ffprobe: callback argument must be a function");
    }
    const callback = lastArg as (err: Error | null, data?: FfprobeData) => void;

    let ended = false;
    const handleCallback = (err: Error | null, data?: FfprobeData) => {
      if (!ended) {
        ended = true;
        callback(err, data);
      }
    };

    // map the arguments to the correct variable names
    switch (args.length) {
      case 3:
        index = args[0] as number;
        options = args[1] as string[];
        break;
      case 2:
        if (typeof args[0] === "number") {
          index = args[0];
        } else if (Array.isArray(args[0])) {
          options = args[0] as string[];
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
    this._getFfprobePath((err: Error | null, path: string) => {
      if (err) {
        return handleCallback(err);
      } else if (!path) {
        return handleCallback(new Error("Cannot find ffprobe"));
      }

      let stdout = "";
      let stdoutClosed = false;
      let stderr = "";
      let stderrClosed = false;

      // Spawn ffprobe
      const hasOutputFormat = options.some(function (opt: string) {
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

      let ffprobeArgs = ["-show_streams", "-show_format"];
      if (!hasOutputFormat) {
        ffprobeArgs.push("-of", "default");
      }
      const src = input.isStream ? "pipe:0" : (input.source as string);
      ffprobeArgs = ffprobeArgs.concat(options, src);

      const ffprobe = spawn(path, ffprobeArgs, {
        windowsHide: true,
      }) as ChildProcessWithoutNullStreams;

      if (input.isStream) {
        ffprobe.stdin.on("error", (stdinErr: Error & { code?: string }) => {
          if (["ECONNRESET", "EPIPE", "EOF"].indexOf(stdinErr.code || "") >= 0) {
            return;
          }
          handleCallback(stdinErr);
        });

        ffprobe.stdin.on("close", () => {
          const source = input.source as { pause?: () => void; unpipe?: (dest: unknown) => void };
          if (source && typeof source.pause === "function") {
            source.pause();
            if (typeof source.unpipe === "function") {
              source.unpipe(ffprobe.stdin);
            }
          }
        });

        const source = input.source as { pipe?: (dest: unknown) => void };
        if (source && typeof source.pipe === "function") {
          source.pipe(ffprobe.stdin);
        }
      }

      ffprobe.on("error", (spawnErr: Error) => {
        handleCallback(spawnErr);
      });

      let exitError: Error | null = null;
      let processExited = false;

      const handleExit = (exitErr?: Error) => {
        if (exitErr) {
          exitError = exitErr;
        }

        if (processExited && stdoutClosed && stderrClosed) {
          if (exitError) {
            if (stderr) {
              exitError.message += "\n" + stderr;
            }

            return handleCallback(exitError);
          }

          const data = parseFfprobeOutput(stdout);

          (data.streams as (FfprobeStream | FfprobeFormat)[])
            .concat([data.format])
            .forEach(function (target) {
              if (target && typeof target === "object") {
                const obj = target as Record<string, unknown>;
                const legacyTagKeys = Object.keys(obj).filter(legacyTag);

                if (legacyTagKeys.length) {
                  const tags = (obj.tags || {}) as Record<string, unknown>;
                  obj.tags = tags;

                  legacyTagKeys.forEach(function (tagKey) {
                    tags[tagKey.substr(4)] = obj[tagKey];
                    delete obj[tagKey];
                  });
                }

                const legacyDispositionKeys = Object.keys(obj).filter(legacyDisposition);

                if (legacyDispositionKeys.length) {
                  const disposition = (obj.disposition || {}) as Record<string, unknown>;
                  obj.disposition = disposition;

                  legacyDispositionKeys.forEach(function (dispositionKey) {
                    disposition[dispositionKey.substr(12)] = obj[dispositionKey];
                    delete obj[dispositionKey];
                  });
                }
              }
            });

          handleCallback(null, data);
        }
      };

      ffprobe.on("exit", (code: number | null, signal: string | null) => {
        processExited = true;

        if (code) {
          handleExit(new Error("ffprobe exited with code " + code));
        } else if (signal) {
          handleExit(new Error("ffprobe was killed with signal " + signal));
        } else {
          handleExit();
        }
      });

      ffprobe.stdout.on("data", (data: string | Buffer) => {
        stdout += data;
      });

      ffprobe.stdout.on("close", () => {
        stdoutClosed = true;
        handleExit();
      });

      ffprobe.stderr.on("data", (data: string | Buffer) => {
        stderr += data;
      });

      ffprobe.stderr.on("close", () => {
        stderrClosed = true;
        handleExit();
      });
    });
  };
}
