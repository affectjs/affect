/*jshint node:true*/
import { spawn, ChildProcess, SpawnOptionsWithoutStdio } from "child_process";
import path from "path";
import fs from "fs";
import { PassThrough } from "stream";
import utils, { FfmpegCommand as FfmpegCommandInterface, Ring } from "./utils";

/*
 *! Processor methods
 */

export default function (proto: FfmpegCommandInterface & Record<string, any>) {
  /**
   * Get ffmpeg arguments
   */
  proto._getArguments = function (this: FfmpegCommandInterface) {
    let args: string[] = [];

    // Add inputs
    this._inputs.forEach((input) => {
      const inputArgs = input.options.get();
      args = args.concat(inputArgs);
      args.push("-i", input.source as string);
    });

    // Add complex filters
    args.push(...((this as any)._complexFilters.get() as string[]));

    // Add global options
    args.push(...((this as any)._global.get() as string[]));

    // Add outputs
    this._outputs.forEach((output) => {
      const oArgs = output.options.get();
      const aArgs = output.audio.get();
      const vArgs = output.video.get();
      const aFilters = output.audioFilters.get();
      const vFilters = output.videoFilters.get();

      const hasContent =
        oArgs.length > 0 ||
        aArgs.length > 0 ||
        vArgs.length > 0 ||
        aFilters.length > 0 ||
        vFilters.length > 0;

      // Add options, audio, video
      args.push(...oArgs);
      args.push(...aArgs);
      args.push(...vArgs);

      if (aFilters.length > 0) {
        args.push("-filter:a", aFilters.join(","));
      }

      if (vFilters.length > 0) {
        args.push("-filter:v", vFilters.join(","));
      }

      // Rule: add target if exists, OR if it has content, OR if it's the lone default (no complex filters)
      if (
        output.target ||
        hasContent ||
        (this._outputs.length === 1 && !this._complexFilters.get().length)
      ) {
        args.push((output.target as string) || "-");
      }
    });

    return args;
  };

  /**
   * Run ffmpeg command
   */
  proto.run = function (this: FfmpegCommandInterface) {
    this._checkCapabilities((err) => {
      if (err) {
        console.log("DEBUG: _checkCapabilities returned error:", err);
        return this.emit("error", err);
      }

      this._spawnFfmpeg(this._getArguments(), {
        niceness: this.options.niceness,
        cwd: this.options.cwd,
        timeout: this.options.timeout,
      });
    });

    return this;
  };

  /**
   * Spawn ffmpeg process
   */
  proto._spawnFfmpeg = function (
    this: FfmpegCommandInterface,
    args: string[],
    options: { niceness?: number; cwd?: string; timeout?: number },
    processCB?: (ffmpegProc: ChildProcess, stdoutRing: Ring, stderrRing: Ring) => void,
    endCB?: (err: Error | null, stdoutRing?: Ring, stderrRing?: Ring) => void
  ) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    let processExited = false;
    let stdoutRing: Ring;
    let stderrRing: Ring;

    this._getFfmpegPath((err, ffmpegPath) => {
      if (err) {
        if (processCB) {
          stdoutRing = utils.linesRing(0);
          stderrRing = utils.linesRing(0);
          return endCB ? endCB(err, stdoutRing, stderrRing) : self.emit("error", err);
        }
        return self.emit("error", err);
      }

      if (!ffmpegPath) {
        const error = new Error("ffmpeg binary not found");
        return endCB ? endCB(error) : self.emit("error", error);
      }

      let finalArgs = args;
      if (options.niceness && options.niceness !== 0 && !utils.isWindows) {
        finalArgs = ["-n", options.niceness.toString(), ffmpegPath].concat(args);
        ffmpegPath = "nice";
      }

      // 诊断日志
      console.log("DEBUG: spawning ffmpeg:", ffmpegPath, finalArgs.join(" "));

      const spawnOptions: SpawnOptionsWithoutStdio = {
        cwd: options.cwd,
      };

      const ffmpegProc = spawn(ffmpegPath, finalArgs, spawnOptions);

      if (ffmpegProc.stderr) {
        ffmpegProc.stderr.setEncoding("utf8");
      }

      stdoutRing = utils.linesRing(self.options.stdoutLines || 100);
      stderrRing = utils.linesRing(self.options.stdoutLines || 100);

      if (ffmpegProc.stdout) {
        ffmpegProc.stdout.on("data", (data) => stdoutRing.append(data));
      }

      let codecDataSent = false;
      const codecData: any = {};

      if (ffmpegProc.stderr) {
        ffmpegProc.stderr.on("data", (data) => {
          stderrRing.append(data);
          const lines = data.toString().split(/\r\n|\r|\n/);
          lines.forEach((line: string) => {
            if (!codecDataSent) {
              codecDataSent = utils.extractCodecData(self, line, codecData);
            }
            utils.extractProgress(self, line);
          });
        });
      }

      // Handle input streams
      let inputStreamsCount = 0;
      self._inputs.forEach((input) => {
        if (input.isStream && input.source && typeof (input.source as any).pipe === "function") {
          inputStreamsCount++;
          (input.source as any).on("error", (streamErr: Error) => {
            const errWithMsg = new Error("Input stream error: " + streamErr.message);
            if (!processExited) {
              processExited = true;
              ffmpegProc.kill("SIGKILL");
              if (endCB) endCB(errWithMsg, stdoutRing, stderrRing);
              else self.emit("error", errWithMsg);
            }
          });
          (input.source as any).pipe(ffmpegProc.stdin);
        }
      });
      if (inputStreamsCount > 0) {
        console.log("DEBUG: piped", inputStreamsCount, "input streams to stdin");
      }

      if (processCB) {
        processCB(ffmpegProc, stdoutRing, stderrRing);
      }

      if (options.timeout) {
        self.processTimer = setTimeout(() => {
          const timeoutErr = new Error("ffmpeg process timed out");
          self.kill("SIGKILL");
          if (!processExited) {
            processExited = true;
            if (endCB) endCB(timeoutErr, stdoutRing, stderrRing);
            else self.emit("error", timeoutErr);
          }
        }, options.timeout * 1000);
      }

      const handleEnd = (err: Error | null) => {
        if (!processExited) {
          processExited = true;
          if (self.processTimer) clearTimeout(self.processTimer);
          if (endCB) {
            endCB(err, stdoutRing, stderrRing);
          } else {
            if (err) self.emit("error", err);
            else self.emit("end");
          }
        }
      };

      ffmpegProc.on("error", (err) => {
        // Ignore spurious errors where the error object is the ChildProcess itself
        if (err && (err as any).pid && (err as any).spawnargs) {
          // This is a ChildProcess object, not an Error - ignore it
          return;
        }
        handleEnd(err);
      });

      ffmpegProc.on("exit", (code, signal) => {
        console.log("DEBUG: ffmpegProc exit:", code, signal);
        if (code !== 0 && code !== 255 && signal !== "SIGKILL") {
          const stderr = stderrRing.get();
          const err = new Error(
            "ffmpeg exited with code " + code + ": " + utils.extractError(stderr)
          );
          handleEnd(err);
        } else {
          handleEnd(null);
        }
      });
    });
  };

  /**
   * Save output to file
   */
  proto.save = proto.saveToFile = function (this: FfmpegCommandInterface, outputPath: string) {
    this._checkCapabilities((err) => {
      if (err) return this.emit("error", err);

      const outStream = fs.createWriteStream(outputPath);
      outStream.on("error", (streamErr) => this.emit("error", streamErr));

      this._spawnFfmpeg(
        this._getArguments(),
        {
          niceness: this.options.niceness,
          cwd: this.options.cwd,
          timeout: this.options.timeout,
        },
        (ffmpegProc) => {
          if (ffmpegProc.stdout) {
            ffmpegProc.stdout.pipe(outStream);
          }
        }
      );
    });

    return this;
  };

  /**
   * Pipe output to stream
   */
  proto.pipe =
    proto.stream =
    proto.writeToStream =
      function (this: FfmpegCommandInterface, stream?: any, options?: { end?: boolean }) {
        const hasStream = !!stream;
        const outStream = hasStream ? stream : new PassThrough();

        this._checkCapabilities((err) => {
          if (err) {
            if (hasStream) this.emit("error", err);
            else outStream.emit("error", err);
            return;
          }

          this._spawnFfmpeg(
            this._getArguments(),
            {
              niceness: this.options.niceness,
              cwd: this.options.cwd,
              timeout: this.options.timeout,
            },
            (ffmpegProc) => {
              if (ffmpegProc.stdout) {
                ffmpegProc.stdout.pipe(outStream, options);
              }
              ffmpegProc.on("error", (procErr) => {
                if (hasStream) this.emit("error", procErr);
                else outStream.emit("error", procErr);
              });
            }
          );
        });

        return outStream;
      };
}
