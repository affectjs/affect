/*jshint node:true*/
import utils from "../utils";
import type { FfmpegCommand } from "../utils";

/**
 * Custom options methods
 *
 * @param {Object} proto prototype to extend
 */
export default function (proto: FfmpegCommand) {
  /**
   * Add custom input option(s)
   *
   * @method FfmpegCommand#inputOptions
   * @category Custom options
   * @aliases addInputOption,addInputOptions,withInputOption,withInputOptions,inputOption
   *
   * @param {...String} options option string(s) or string array
   * @return FfmpegCommand
   */
  proto.addInputOption =
    proto.addInputOptions =
    proto.withInputOption =
    proto.withInputOptions =
    proto.inputOption =
    proto.inputOptions =
      function (...optionsParams: (string | string[])[]) {
        if (!this._currentInput) {
          throw new Error("No input specified");
        }

        let options: string[];
        let doSplit = true;

        if (optionsParams.length > 1) {
          options = optionsParams as string[];
          doSplit = false;
        } else {
          const first = optionsParams[0];
          options = Array.isArray(first) ? first : [first as string];
        }

        this._currentInput.options(
          options.reduce(function (acc: string[], option: string) {
            const split = String(option).split(" ");

            if (doSplit && split.length === 2) {
              acc.push(split[0], split[1]);
            } else {
              acc.push(option);
            }

            return acc;
          }, [])
        );

        return this;
      };

  /**
   * Add custom output option(s)
   *
   * @method FfmpegCommand#outputOptions
   * @category Custom options
   * @aliases addOutputOption,addOutputOptions,addOption,addOptions,withOutputOption,withOutputOptions,withOption,withOptions,outputOption
   *
   * @param {...String} options option string(s) or string array
   * @return FfmpegCommand
   */
  proto.addOutputOption =
    proto.addOutputOptions =
    proto.addOption =
    proto.addOptions =
    proto.withOutputOption =
    proto.withOutputOptions =
    proto.withOption =
    proto.withOptions =
    proto.outputOption =
    proto.outputOptions =
      function (...optionsParams: (string | string[])[]) {
        let options: string[];
        let doSplit = true;

        if (optionsParams.length > 1) {
          options = optionsParams as string[];
          doSplit = false;
        } else {
          const first = optionsParams[0];
          options = Array.isArray(first) ? first : [first as string];
        }

        this._currentOutput.options(
          options.reduce(function (acc: string[], option: string) {
            const split = String(option).split(" ");

            if (doSplit && split.length === 2) {
              acc.push(split[0], split[1]);
            } else {
              acc.push(option);
            }

            return acc;
          }, [])
        );

        return this;
      };

  /**
   * Specify a complex filtergraph
   *
   * @method FfmpegCommand#complexFilter
   * @category Custom options
   * @aliases filterGraph
   *
   * @param {String|Array} spec filtergraph string or array of filter specification
   * @param {Array} [map] (array of) stream specifier(s) from the graph to include in
   *   ffmpeg output, defaults to ffmpeg automatically choosing the first matching streams.
   * @return FfmpegCommand
   */
  proto.filterGraph = proto.complexFilter = function (
    spec: unknown | unknown[],
    map?: string | string[]
  ) {
    this._complexFilters.clear();

    const finalSpec = Array.isArray(spec) ? spec : [spec];
    this._complexFilters("-filter_complex", utils.makeFilterStrings(finalSpec).join(";"));

    if (Array.isArray(map)) {
      map.forEach((streamSpec) => {
        this._complexFilters("-map", streamSpec.replace(utils.streamRegexp, "[$1]"));
      });
    } else if (typeof map === "string") {
      this._complexFilters("-map", map.replace(utils.streamRegexp, "[$1]"));
    }

    return this;
  };
}
