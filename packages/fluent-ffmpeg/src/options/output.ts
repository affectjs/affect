/*jshint node:true, laxcomma:true*/
import utils from "../utils";
import type { FfmpegCommand, FilterSpec } from "../utils";

/**
 * Output-related methods
 *
 * @param {Object} proto prototype to extend
 */
export default function (proto: FfmpegCommand) {
  /**
   * Add an output to the command
   *
   * @method FfmpegCommand#addOutput
   * @category Output
   * @aliases output
   *
   * @param {String|Writable} target output file path or writable stream
   * @param {Object} [pipeopts] pipe options
   * @return FfmpegCommand
   */
  proto.addOutput = proto.output = function (target: string | unknown, pipeopts?: unknown) {
    let isFile = false;

    if (typeof target === "string" && !target.match(/^https?:\/\//) && !target.match(/^pipe:/)) {
      isFile = true;
    }

    this._outputs.push({
      target: target,
      pipeopts: pipeopts,
      isFile: isFile,
      options: utils.args(),
      audio: utils.args(),
      video: utils.args(),
      audioFilters: utils.args(),
      videoFilters: utils.args(),
      sizeFilters: utils.args(),
      flags: {},
    });

    this._currentOutput = this._outputs[this._outputs.length - 1];

    return this;
  };

  /**
   * Specify output format
   *
   * @method FfmpegCommand#format
   * @category Output
   * @aliases withOutputFormat,toFormat
   *
   * @param {String} format output format
   * @return FfmpegCommand
   */
  proto.withOutputFormat =
    proto.toFormat =
    proto.format =
      function (format: string) {
        this._currentOutput.options("-f", format);
        return this;
      };

  /**
   * Specify output duration
   *
   * @method FfmpegCommand#duration
   * @category Output
   * @aliases withDuration,setDuration
   *
   * @param {String|Number} duration duration in seconds or as a '[[hh:]mm:]ss[.xxx]' string
   * @return FfmpegCommand
   */
  proto.withDuration =
    proto.setDuration =
    proto.duration =
      function (duration: string | number) {
        this._currentOutput.options("-t", duration);
        return this;
      };

  /**
   * Specify output seek time
   *
   * @method FfmpegCommand#seek
   * @category Output
   * @aliases seekOutput
   *
   * @param {String|Number} seek seek time in seconds or as a '[[hh:]mm:]ss[.xxx]' string
   * @return FfmpegCommand
   */
  proto.seekOutput = proto.seek = function (seek: string | number) {
    this._currentOutput.options("-ss", seek);
    return this;
  };

  /**
   * Skip audio transcoding
   *
   * @method FfmpegCommand#noAudio
   * @category Audio
   * @aliases withNoAudio
   *
   * @return FfmpegCommand
   */
  proto.withNoAudio = proto.noAudio = function () {
    this._currentOutput.audio.clear();
    this._currentOutput.audioFilters.clear();
    this._currentOutput.options("-an");
    return this;
  };

  /**
   * Specify audio codec
   *
   * @method FfmpegCommand#audioCodec
   * @category Audio
   * @aliases withAudioCodec
   *
   * @param {String} codec audio codec name
   * @return FfmpegCommand
   */
  proto.withAudioCodec = proto.audioCodec = function (codec: string) {
    this._currentOutput.audio("-acodec", codec);
    return this;
  };

  /**
   * Specify audio bitrate
   *
   * @method FfmpegCommand#audioBitrate
   * @category Audio
   * @aliases withAudioBitrate
   *
   * @param {String|Number} bitrate audio bitrate in kbps
   * @return FfmpegCommand
   */
  proto.withAudioBitrate = proto.audioBitrate = function (
    bitrate: string | number,
    options?:
      | boolean
      | { maxrate?: string | number; minrate?: string | number; bufsize?: string | number }
  ) {
    if (typeof bitrate === "number" || (bitrate as any) + "s" !== bitrate) {
      bitrate = bitrate + "k";
    }
    this._currentOutput.audio("-b:a", bitrate as string);

    if (options === true) {
      this._currentOutput.audio("-maxrate", bitrate as string);
      this._currentOutput.audio("-minrate", bitrate as string);
      this._currentOutput.audio("-bufsize", bitrate as string);
    } else if (options && typeof options === "object") {
      if (options.maxrate) this._currentOutput.audio("-maxrate", options.maxrate.toString());
      if (options.minrate) this._currentOutput.audio("-minrate", options.minrate.toString());
      if (options.bufsize) this._currentOutput.audio("-bufsize", options.bufsize.toString());
    }

    return this;
  };

  /**
   * Specify audio channels
   *
   * @method FfmpegCommand#audioChannels
   * @category Audio
   * @aliases withAudioChannels
   *
   * @param {Number} channels number of audio channels
   * @return FfmpegCommand
   */
  proto.withAudioChannels = proto.audioChannels = function (channels: number) {
    this._currentOutput.audio("-ac", channels);
    return this;
  };

  /**
   * Specify audio frequency
   *
   * @method FfmpegCommand#audioFrequency
   * @category Audio
   * @aliases withAudioFrequency
   *
   * @param {Number} freq audio frequency in Hz
   * @return FfmpegCommand
   */
  proto.withAudioFrequency = proto.audioFrequency = function (freq: number) {
    this._currentOutput.audio("-ar", freq);
    return this;
  };

  /**
   * Add audio filter(s)
   *
   * @method FfmpegCommand#audioFilters
   * @category Audio
   * @aliases withAudioFilter,withAudioFilters,audioFilter
   *
   * @param {...(String|Object)} filters filter specification(s)
   * @return FfmpegCommand
   */
  proto.withAudioFilter =
    proto.withAudioFilters =
    proto.audioFilter =
    proto.audioFilters =
      function (...filters: (string | FilterSpec | (string | FilterSpec)[])[]) {
        let finalFilters: (string | FilterSpec)[];
        if (filters.length > 1) {
          finalFilters = filters as (string | FilterSpec)[];
        } else {
          const first = filters[0];
          finalFilters = Array.isArray(first) ? first : [first as string | FilterSpec];
        }

        this._currentOutput.audioFilters(...utils.makeFilterStrings(finalFilters));
        return this;
      };

  /**
   * Skip video transcoding
   *
   * @method FfmpegCommand#noVideo
   * @category Video
   * @aliases withNoVideo
   *
   * @return FfmpegCommand
   */
  proto.withNoVideo = proto.noVideo = function () {
    this._currentOutput.video.clear();
    this._currentOutput.videoFilters.clear();
    this._currentOutput.options("-vn");
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
   * @param {String|Number} bitrate video bitrate in kbps
   * @return FfmpegCommand
   */
  proto.withVideoBitrate = proto.videoBitrate = function (
    bitrate: string | number,
    options?:
      | boolean
      | { maxrate?: string | number; minrate?: string | number; bufsize?: string | number }
  ) {
    if (typeof bitrate === "number" || (bitrate as any) + "s" !== bitrate) {
      bitrate = bitrate + "k";
    }
    this._currentOutput.video("-b:v", bitrate as string);

    if (options === true) {
      this._currentOutput.video("-maxrate", bitrate as string);
      this._currentOutput.video("-minrate", bitrate as string);
      this._currentOutput.video("-bufsize", bitrate as string);
    } else if (options && typeof options === "object") {
      if (options.maxrate) this._currentOutput.video("-maxrate", options.maxrate.toString());
      if (options.minrate) this._currentOutput.video("-minrate", options.minrate.toString());
      if (options.bufsize) this._currentOutput.video("-bufsize", options.bufsize.toString());
    }

    return this;
  };

  /**
   * Specify video frame rate
   *
   * @method FfmpegCommand#fps
   * @category Video
   * @aliases withVideoFps,withVideoFPS,withFps,withFPS,videoFPS,videoFps,FPS
   *
   * @param {Number} fps video frame rate
   * @return FfmpegCommand
   */
  proto.withVideoFps =
    proto.withVideoFPS =
    proto.withFps =
    proto.withFPS =
    proto.videoFPS =
    proto.videoFps =
    proto.FPS =
    proto.fps =
      function (fps: number) {
        this._currentOutput.video("-r", fps);
        return this;
      };

  /**
   * Add video filter(s)
   *
   * @method FfmpegCommand#videoFilters
   * @category Video
   * @aliases withVideoFilter,withVideoFilters,videoFilter
   *
   * @param {...(String|Object)} filters filter specification(s)
   * @return FfmpegCommand
   */
  proto.withVideoFilter =
    proto.withVideoFilters =
    proto.videoFilter =
    proto.videoFilters =
      function (...filters: (string | FilterSpec | (string | FilterSpec)[])[]) {
        let finalFilters: (string | FilterSpec)[];
        if (filters.length > 1) {
          finalFilters = filters as (string | FilterSpec)[];
        } else {
          const first = filters[0];
          finalFilters = Array.isArray(first) ? first : [first as string | FilterSpec];
        }

        this._currentOutput.videoFilters(...utils.makeFilterStrings(finalFilters));
        return this;
      };

  /**
   * Specify the number of video frames to record
   *
   * @method FfmpegCommand#frames
   * @category Video
   * @aliases takeFrames,withFrames
   *
   * @param {Number} frames number of frames
   * @return FfmpegCommand
   */
  proto.takeFrames =
    proto.withFrames =
    proto.frames =
      function (frames: number) {
        this._currentOutput.video("-vframes", frames);
        return this;
      };

  /**
   * Update flv metadata after transcoding
   *
   * @method FfmpegCommand#flvmeta
   * @category Output
   * @aliases updateFlvMetadata
   *
   * @return FfmpegCommand
   */
  proto.updateFlvMetadata = proto.flvmeta = function () {
    this._currentOutput.flags.flvmeta = true;
    return this;
  };
}
