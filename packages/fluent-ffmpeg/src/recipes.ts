import fs from "fs";
import path from "path";
import { PassThrough, Writable } from "stream";
import async from "async";
import utils from "./utils.js";
import { type FfmpegCommand } from "./utils.js";

interface FfprobeData {
  streams: {
    codec_type: string;
    width: number;
    height: number;
    duration: string | number;
    bit_rate?: string | number;
  }[];
  format: {
    duration: string | number;
    bit_rate?: string | number;
  };
}

interface FfmpegInput {
  source: string | unknown;
  isStream: boolean;
  options: {
    get(): string[];
  };
}

interface SizeFilter {
  inputs?: string;
  outputs?: string;
}

interface FfmpegOutput {
  sizeFilters: {
    get(): SizeFilter[];
    clear(): void;
  };
}

/*
 * Useful recipes for commands
 */

/**
 * Recipes component
 * @param {Object} proto prototype to extend
 */
export default function (proto: Record<string, unknown>) {
  /**
   * Execute ffmpeg command and save output to a file
   *
   * @method FfmpegCommand#save
   * @category Processing
   * @aliases saveToFile
   *
   * @param {String} output file path
   * @return FfmpegCommand
   */
  proto.saveToFile = proto.save = function (this: FfmpegCommand, output: string) {
    this.output(output).run();
    return this;
  };

  /**
   * Execute ffmpeg command and save output to a stream
   *
   * If 'stream' is not specified, a PassThrough stream is created and returned.
   * 'options' will be used when piping ffmpeg output to the output stream
   * (@see http://nodejs.org/api/stream.html#stream_readable_pipe_destination_options)
   *
   * @method FfmpegCommand#pipe
   * @category Processing
   * @aliases stream,writeToStream
   *
   * @param {stream.Writable} [stream] output stream
   * @param {Object} [options={}] pipe options
   * @return Output stream
   */
  proto.writeToStream =
    proto.pipe =
    proto.stream =
      function (this: FfmpegCommand, stream?: Writable, options?: Record<string, unknown>) {
        let finalStream = stream;
        let finalOptions = options;

        if (finalStream && !("writable" in finalStream)) {
          finalOptions = finalStream as unknown as Record<string, unknown>;
          finalStream = undefined;
        }

        if (!finalStream) {
          if (process.version.match(/v0\.8\./)) {
            throw new Error("PassThrough stream is not supported on node v0.8");
          }

          finalStream = new PassThrough();
        }

        this.output(finalStream, finalOptions).run();
        return finalStream;
      };

  /**
   * Generate images from a video
   *
   * Note: this method makes the command emit a 'filenames' event with an array of
   * the generated image filenames.
   *
   * @method FfmpegCommand#screenshots
   * @category Processing
   * @aliases takeScreenshots,thumbnail,thumbnails,screenshot
   *
   * @param {Number|Object} [config=1] screenshot count or configuration object with
   *   the following keys:
   * @param {Number} [config.count] number of screenshots to take; using this option
   *   takes screenshots at regular intervals (eg. count=4 would take screens at 20%, 40%,
   *   60% and 80% of the video length).
   * @param {String} [config.folder='.'] output folder
   * @param {String} [config.filename='tn.png'] output filename pattern, may contain the following
   *   tokens:
   *   - '%s': offset in seconds
   *   - '%w': screenshot width
   *   - '%h': screenshot height
   *   - '%r': screenshot resolution (same as '%wx%h')
   *   - '%f': input filename
   *   - '%b': input basename (filename w/o extension)
   *   - '%i': index of screenshot in timemark array (can be zero-padded by using it like `%000i`)
   * @param {Number[]|String[]} [config.timemarks] array of timemarks to take screenshots
   *   at; each timemark may be a number of seconds, a '[[hh:]mm:]ss[.xxx]' string or a
   *   'XX%' string.  Overrides 'count' if present.
   * @param {Number[]|String[]} [config.timestamps] alias for 'timemarks'
   * @param {Boolean} [config.fastSeek] use fast seek (less accurate)
   * @param {String} [config.size] screenshot size, with the same syntax as {@link FfmpegCommand#size}
   * @param {String} [folder] output folder (legacy alias for 'config.folder')
   * @return FfmpegCommand
   */
  proto.takeScreenshots =
    proto.thumbnail =
    proto.thumbnails =
    proto.screenshot =
    proto.screenshots =
      function (this: FfmpegCommand, config: unknown, folder: string) {
        const source = (this._inputs[0] as unknown as FfmpegInput).source;
        let finalConfig: Record<string, unknown>;

        // Accept a number of screenshots instead of a config object
        if (typeof config === "number") {
          finalConfig = {
            count: config,
          };
        } else {
          finalConfig = (config as Record<string, unknown>) || { count: 1 };
        }

        // Accept a second 'folder' parameter instead of finalConfig.folder
        if (!("folder" in finalConfig)) {
          finalConfig.folder = folder || ".";
        }

        // Accept 'timestamps' instead of 'timemarks'
        if ("timestamps" in finalConfig) {
          finalConfig.timemarks = finalConfig.timestamps;
        }

        // Compute timemarks from count if not present
        if (!("timemarks" in finalConfig)) {
          if (!finalConfig.count) {
            throw new Error(
              "Cannot take screenshots: neither a count nor a timemark list are specified"
            );
          }

          const count = Number(finalConfig.count);
          const interval = 100 / (1 + count);
          finalConfig.timemarks = [];
          for (let i = 0; i < count; i++) {
            (finalConfig.timemarks as unknown[]).push(interval * (i + 1) + "%");
          }
        }

        // Parse size option
        let fixedSize: RegExpMatchArray | null = null;
        let fixedWidth: RegExpMatchArray | null = null;
        let fixedHeight: RegExpMatchArray | null = null;
        let percentSize: RegExpMatchArray | null = null;

        if ("size" in finalConfig) {
          const size = String(finalConfig.size);
          fixedSize = size.match(/^(\d+)x(\d+)$/);
          fixedWidth = size.match(/^(\d+)x\?$/);
          fixedHeight = size.match(/^\?x(\d+)$/);
          percentSize = size.match(/^(\d+)%$/);

          if (!fixedSize && !fixedWidth && !fixedHeight && !percentSize) {
            throw new Error("Invalid size parameter: " + finalConfig.size);
          }
        }

        // Metadata helper
        let metadata: FfprobeData | undefined;
        const getMetadata = (cb: (err: Error | null, meta?: FfprobeData) => void) => {
          if (metadata) {
            cb(null, metadata);
          } else {
            this.ffprobe((err: Error, meta: unknown) => {
              metadata = meta as FfprobeData;
              cb(err, metadata);
            });
          }
        };

        async.waterfall(
          [
            // Compute percent timemarks if any
            (next: (err?: Error | null) => void) => {
              const timemarks = finalConfig.timemarks as unknown[];
              if (
                timemarks.some(function (t: unknown) {
                  return ("" + t).match(/^[\d.]+%$/);
                })
              ) {
                if (typeof source !== "string") {
                  return next(
                    new Error(
                      "Cannot compute screenshot timemarks with an input stream, please specify fixed timemarks"
                    )
                  );
                }

                getMetadata((err, meta) => {
                  if (err || !meta) {
                    next(err || new Error("Could not get metadata"));
                  } else {
                    // Select video stream with the highest resolution
                    const vstream = meta.streams.reduce(
                      function (
                        biggest: { width: number; height: number; duration: string | number },
                        stream
                      ) {
                        if (
                          stream.codec_type === "video" &&
                          stream.width * stream.height > biggest.width * biggest.height
                        ) {
                          return stream;
                        } else {
                          return biggest;
                        }
                      },
                      { width: 0, height: 0, duration: 0 }
                    );

                    if (vstream.width === 0) {
                      return next(new Error("No video stream in input, cannot take screenshots"));
                    }

                    let duration = Number(vstream.duration);
                    if (isNaN(duration)) {
                      duration = Number(meta.format.duration);
                    }

                    if (isNaN(duration)) {
                      return next(
                        new Error("Could not get input duration, please specify fixed timemarks")
                      );
                    }

                    finalConfig.timemarks = timemarks.map(function (mark: unknown) {
                      if (("" + mark).match(/^([\d.]+)%$/)) {
                        return (duration * parseFloat("" + mark)) / 100;
                      } else {
                        return mark;
                      }
                    });

                    next();
                  }
                });
              } else {
                next();
              }
            },

            // Turn all timemarks into numbers and sort them
            (next: (err?: Error | null) => void) => {
              const timemarks = finalConfig.timemarks as unknown[];
              finalConfig.timemarks = timemarks
                .map(function (mark: unknown) {
                  return utils.timemarkToSeconds(mark as string | number);
                })
                .sort(function (a: number, b: number) {
                  return a - b;
                });

              next();
            },

            // Add '_%i' to pattern when requesting multiple screenshots and no variable token is present
            (next: (err: Error | null, pattern?: string) => void) => {
              const timemarks = finalConfig.timemarks as unknown[];
              let pattern = (finalConfig.filename as string) || "tn.png";

              if (pattern.indexOf(".") === -1) {
                pattern += ".png";
              }

              if (timemarks.length > 1 && !pattern.match(/%(s|0*i)/)) {
                const ext = path.extname(pattern);
                pattern = path.join(
                  path.dirname(pattern),
                  path.basename(pattern, ext) + "_%i" + ext
                );
              }

              next(null, pattern);
            },

            // Replace filename tokens (%f, %b) in pattern
            (pattern: string, next: (err: Error | null, pattern?: string) => void) => {
              if (pattern.match(/%[bf]/)) {
                if (typeof source !== "string") {
                  return next(new Error("Cannot replace %f or %b when using an input stream"));
                }

                pattern = pattern
                  .replace(/%f/g, path.basename(source))
                  .replace(/%b/g, path.basename(source, path.extname(source)));
              }

              next(null, pattern);
            },

            // Compute size if needed
            (
              pattern: string,
              next: (err: Error | null, pattern?: string, width?: number, height?: number) => void
            ) => {
              if (pattern.match(/%[whr]/)) {
                if (fixedSize) {
                  return next(null, pattern, Number(fixedSize[1]), Number(fixedSize[2]));
                }

                getMetadata((err, meta) => {
                  if (err || !meta) {
                    return next(
                      err ||
                        new Error("Could not determine video resolution to replace %w, %h or %r")
                    );
                  }

                  const vstream = meta.streams.reduce(
                    function (biggest: { width: number; height: number }, stream) {
                      if (
                        stream.codec_type === "video" &&
                        stream.width * stream.height > biggest.width * biggest.height
                      ) {
                        return stream;
                      } else {
                        return biggest;
                      }
                    },
                    { width: 0, height: 0 }
                  );

                  if (vstream.width === 0) {
                    return next(new Error("No video stream in input, cannot replace %w, %h or %r"));
                  }

                  let width = vstream.width;
                  let height = vstream.height;

                  if (fixedWidth) {
                    height = (height * Number(fixedWidth[1])) / width;
                    width = Number(fixedWidth[1]);
                  } else if (fixedHeight) {
                    width = (width * Number(fixedHeight[1])) / height;
                    height = Number(fixedHeight[1]);
                  } else if (percentSize) {
                    width = (width * Number(percentSize[1])) / 100;
                    height = (height * Number(percentSize[1])) / 100;
                  }

                  next(null, pattern, Math.round(width / 2) * 2, Math.round(height / 2) * 2);
                });
              } else {
                next(null, pattern, -1, -1);
              }
            },

            // Replace size tokens (%w, %h, %r) in pattern
            (
              pattern: string,
              width: number,
              height: number,
              next: (err: Error | null, pattern?: string) => void
            ) => {
              pattern = pattern
                .replace(/%r/g, "%wx%h")
                .replace(/%w/g, String(width))
                .replace(/%h/g, String(height));

              next(null, pattern);
            },

            // Replace variable tokens in pattern (%s, %i) and generate filename list
            (pattern: string, next: (err: Error | null, filenames?: string[]) => void) => {
              const timemarks = finalConfig.timemarks as unknown[];
              const filenames = timemarks.map((t: unknown, i: number) => {
                return pattern
                  .replace(/%s/g, String(utils.timemarkToSeconds(t as string | number)))
                  .replace(/%(0*)i/g, function (_match: unknown, padding: string) {
                    const idx = "" + (i + 1);
                    return padding.substr(0, Math.max(0, padding.length + 1 - idx.length)) + idx;
                  });
              });

              this.emit("filenames", filenames);
              next(null, filenames);
            },

            // Create output directory
            (filenames: string[], next: (err: Error | null, filenames?: string[]) => void) => {
              const folderStr = String(finalConfig.folder);
              fs.access(folderStr, fs.constants.F_OK, function (err) {
                if (err) {
                  // Directory doesn't exist, create it
                  fs.mkdir(folderStr, function (mkdirErr) {
                    if (mkdirErr) {
                      next(mkdirErr);
                    } else {
                      next(null, filenames);
                    }
                  });
                } else {
                  // Directory exists
                  next(null, filenames);
                }
              });
            },
          ],
          (err: unknown, filenames: unknown) => {
            if (err) {
              return this.emit("error", err as Error);
            }

            const timemarks = finalConfig.timemarks as unknown[];
            const count = timemarks.length;
            const filenamesList = filenames as string[];
            const split = {
              filter: "split",
              options: count,
              outputs: [] as string[],
              inputs: undefined as string | undefined,
            };
            let filters: Record<string, unknown>[] = [split as unknown as Record<string, unknown>];

            if ("size" in finalConfig) {
              // Set size to generate size filters
              this.size(String(finalConfig.size));

              // Get size filters and chain them with 'sizeN' stream names
              const currentOutput = this._currentOutput as unknown as FfmpegOutput;
              const sizeFilters = currentOutput.sizeFilters.get().map(function (
                f: SizeFilter,
                i: number
              ) {
                if (i > 0) {
                  f.inputs = "size" + (i - 1);
                }

                f.outputs = "size" + i;

                return f;
              });

              // Input last size filter output into split filter
              split.inputs = "size" + (sizeFilters.length - 1);

              // Add size filters in front of split filter
              filters = (sizeFilters as unknown as Record<string, unknown>[]).concat(filters);

              // Remove size filters
              currentOutput.sizeFilters.clear();
            }

            let firstMark = 0;
            for (let i = 0; i < count; i++) {
              const stream = "screen" + i;
              split.outputs.push(stream);

              if (i === 0) {
                firstMark = timemarks[i] as number;
                this.seekInput(firstMark);
              }

              this.output(path.join(String(finalConfig.folder), filenamesList[i]))
                .frames(1)
                .map(stream);

              if (i > 0) {
                this.seek((timemarks[i] as number) - firstMark);
              }
            }

            this.complexFilter(filters);
            this.run();
          }
        );

        return this;
      };

  /**
   * Merge (concatenate) inputs to a single file
   *
   * @method FfmpegCommand#mergeToFile
   * @category Processing
   * @aliases concatenate,concat
   *
   * @param {String|Writable} target output file or writable stream
   * @param {Object} [options] pipe options (only used when outputting to a writable stream)
   * @return FfmpegCommand
   */
  proto.mergeToFile =
    proto.concatenate =
    proto.concat =
      function (this: FfmpegCommand, target: string | Writable, options?: Record<string, unknown>) {
        const inputs = this._inputs as unknown as FfmpegInput[];
        if (inputs.some((input) => input.isStream)) {
          return this.emit("error", new Error("Cannot merge streams, only files can be merged"));
        }

        const fileInput = inputs.filter(function (input) {
          return !input.isStream;
        })[0];

        this.ffprobe(this._inputs.indexOf(fileInput), (err: Error, data: unknown) => {
          if (err) {
            return this.emit("error", err);
          }

          const ffData = data as FfprobeData;

          const hasAudioStreams = ffData.streams.some(function (stream: { codec_type: string }) {
            return stream.codec_type === "audio";
          });

          const hasVideoStreams = ffData.streams.some(function (stream: { codec_type: string }) {
            return stream.codec_type === "video";
          });

          // Setup concat filter and start processing
          this.output(target, options)
            .complexFilter({
              filter: "concat",
              options: {
                n: inputs.length,
                v: hasVideoStreams ? 1 : 0,
                a: hasAudioStreams ? 1 : 0,
              },
            })
            .run();
        });

        return this;
      };
}
