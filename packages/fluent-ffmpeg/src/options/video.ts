/*jshint node:true*/
import utils from "../utils";
import type { FfmpegCommand, FilterSpec } from "../utils";

/**
 * Video-related methods
 *
 * @param {Object} proto prototype to extend
 */
export default function (proto: FfmpegCommand) {
  /**
   * Disable video in the output
   *
   * @method FfmpegCommand#noVideo
   * @category Video
   * @aliases withNoVideo
   * @return FfmpegCommand
   */
  proto.withNoVideo = proto.noVideo = function () {
    this._currentOutput.video.clear();
    this._currentOutput.videoFilters.clear();
    this._currentOutput.video("-vn");

    return this;
  };

  /**
   * Specify video codec
   *
   * @method FfmpegCommand#videoCodec
   * @category Video
   * @aliases withVideoCodec
   *
   * @param {String} codec video codec name
   * @return FfmpegCommand
   */
  proto.withVideoCodec = proto.videoCodec = function (codec: string) {
    this._currentOutput.video("-vcodec", codec);

    return this;
  };

  /**
   * Specify video bitrate
   *
   * @method FfmpegCommand#videoBitrate
   * @category Video
   * @aliases withVideoBitrate
   *
   * @param {String|Number} bitrate video bitrate in kbps (with an optional 'k' suffix)
   * @return FfmpegCommand
   */
  proto.withVideoBitrate = proto.videoBitrate = function (bitrate: string | number) {
    this._currentOutput.video("-b:v", ("" + bitrate).replace(/k?$/, "k"));
    return this;
  };

  /**
   * Specify video FPS
   *
   * @method FfmpegCommand#fps
   * @category Video
   * @aliases withFps,withFPS,withVideoFPS,withVideoFps,videoFPS,videoFps,fps,FPS
   *
   * @param {Number} fps video FPS
   * @return FfmpegCommand
   */
  proto.withVideoFps =
    proto.withVideoFPS =
    proto.withFps =
    proto.withFPS =
    proto.videoFPS =
    proto.videoFps =
    proto.fps =
    proto.FPS =
      function (fps: number) {
        this._currentOutput.video("-r", fps);
        return this;
      };

  /**
   * Specify video frames
   *
   * @method FfmpegCommand#frames
   * @category Video
   * @aliases withFrames
   *
   * @param {Number} frames video frame count
   * @return FfmpegCommand
   */
  proto.withFrames = proto.frames = function (frames: number) {
    this._currentOutput.video("-vframes", frames);
    return this;
  };

  /**
   * Specify custom video filter(s)
   *
   * @method FfmpegCommand#videoFilters
   * @aliases withVideoFilter,withVideoFilters,videoFilter
   * @category Video
   *
   * @param {...String|String[]|Object[]} filters video filter strings, string array or
   *   filter specification array
   * @return FfmpegCommand
   */
  proto.videoFilters = function (...filters: (string | FilterSpec)[]) {
    let finalFilters: (string | FilterSpec)[];
    if (filters.length === 1 && Array.isArray(filters[0])) {
      finalFilters = filters[0] as (string | FilterSpec)[];
    } else {
      finalFilters = filters;
    }

    this._currentOutput.videoFilters(utils.makeFilterStrings(finalFilters));
    return this;
  };
}
