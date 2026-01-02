/*jshint node:true*/
import path from "path";
import util from "util";
import { EventEmitter } from "events";

import utils from "./utils";
import type { FfmpegCommand as FfmpegCommandInterface } from "./utils";

/**
 * Create an ffmpeg command
 */
function FfmpegCommand(
  this: FfmpegCommandInterface,
  input?: unknown,
  options?: Record<string, unknown>
) {
  // Make 'new' optional
  if (!(this instanceof FfmpegCommand)) {
    return new (FfmpegCommand as unknown as {
      new (i?: unknown, o?: unknown): FfmpegCommandInterface;
    })(input, options);
  }

  EventEmitter.call(this);

  let finalOptions: Record<string, unknown> = {};
  if (typeof input === "object" && input !== null && !("readable" in input)) {
    finalOptions = input as Record<string, unknown>;
  } else {
    finalOptions = options || {};
    finalOptions.source = input;
  }

  this._inputs = [];
  if (finalOptions.source) {
    this.input(finalOptions.source);
  }

  this._outputs = [];
  this.output(undefined);

  ["_global", "_complexFilters"].forEach((prop) => {
    (this as unknown as Record<string, unknown>)[prop] = utils.args();
  });

  if (!("stdoutLines" in finalOptions)) {
    finalOptions.stdoutLines = 100;
  }
  if (!finalOptions.presets) {
    finalOptions.presets = (finalOptions.preset as string) || path.join(__dirname, "presets");
  }
  if (!finalOptions.niceness) {
    finalOptions.niceness = (finalOptions.priority as number) || 0;
  }

  this.options = finalOptions as FfmpegCommandInterface["options"];

  this.logger = (finalOptions.logger as FfmpegCommandInterface["logger"]) || {
    debug: function () {},
    info: function () {},
    warn: function () {},
    error: function () {},
  };
}
util.inherits(FfmpegCommand, EventEmitter);

/**
 * Clone an ffmpeg command
 */
FfmpegCommand.prototype.clone = function (this: FfmpegCommandInterface) {
  const clone = new (FfmpegCommand as unknown as { new (): FfmpegCommandInterface })();

  clone.options = { ...this.options };
  clone.logger = this.logger;

  clone._inputs = this._inputs.map(function (input) {
    return {
      source: input.source,
      options: input.options.clone(),
    };
  });

  if ("target" in this._outputs[0] && this._outputs[0].target !== undefined) {
    clone._outputs = [];
    clone.output(undefined);
  } else {
    clone._outputs = [
      (clone._currentOutput = {
        flags: {},
        options: utils.args(),
        audio: utils.args(),
        video: utils.args(),
        audioFilters: utils.args(),
        videoFilters: utils.args(),
        sizeFilters: utils.args(),
      } as FfmpegCommandInterface["_outputs"][0]),
    ];

    ["audio", "audioFilters", "video", "videoFilters", "sizeFilters", "options"].forEach((key) => {
      (clone._currentOutput as unknown as Record<string, unknown>)[key] = (
        this._currentOutput as unknown as Record<string, unknown>
      )[key];
    });

    if (this._currentOutput.sizeData) {
      clone._currentOutput.sizeData = {};
      utils.copy(
        this._currentOutput.sizeData,
        clone._currentOutput.sizeData as Record<string, unknown>
      );
    }

    utils.copy(
      this._currentOutput.flags as Record<string, unknown>,
      clone._currentOutput.flags as Record<string, unknown>
    );
  }

  ["_global", "_complexFilters"].forEach((prop: string) => {
    (clone as any)[prop] = (this as any)[prop].clone();
  });

  return clone;
};

/* Add methods from options submodules */
import inputsCb from "./options/inputs";
inputsCb(FfmpegCommand.prototype);
import audioCb from "./options/audio";
audioCb(FfmpegCommand.prototype);
import videoCb from "./options/video";
videoCb(FfmpegCommand.prototype);
import videosizeCb from "./options/videosize";
videosizeCb(FfmpegCommand.prototype);
import outputCb from "./options/output";
outputCb(FfmpegCommand.prototype);
import customCb from "./options/custom";
customCb(FfmpegCommand.prototype);
import miscCb from "./options/misc";
miscCb(FfmpegCommand.prototype);

/* Add processor methods */
import processorCb from "./processor";
processorCb(FfmpegCommand.prototype);

/* Add capabilities methods */
import capabilitiesCb from "./capabilities";
capabilitiesCb(FfmpegCommand.prototype);

import ffprobeCb from "./ffprobe";
ffprobeCb(FfmpegCommand.prototype);

import recipesCb from "./recipes";
recipesCb(FfmpegCommand.prototype);

FfmpegCommand.setFfmpegPath = function (path: string) {
  new (FfmpegCommand as unknown as { new (): FfmpegCommandInterface })().setFfmpegPath(path);
};

FfmpegCommand.setFfprobePath = function (path: string) {
  new (FfmpegCommand as unknown as { new (): FfmpegCommandInterface })().setFfprobePath(path);
};

FfmpegCommand.setFlvtoolPath = function (path: string) {
  new (FfmpegCommand as unknown as { new (): FfmpegCommandInterface })().setFlvtoolPath(path);
};

FfmpegCommand.availableFilters = FfmpegCommand.getAvailableFilters = function (
  callback: (err: Error | null, filters?: unknown) => void
) {
  new (FfmpegCommand as unknown as { new (): FfmpegCommandInterface })().availableFilters(callback);
};

FfmpegCommand.availableCodecs = FfmpegCommand.getAvailableCodecs = function (
  callback: (err: Error | null, codecs?: unknown) => void
) {
  new (FfmpegCommand as unknown as { new (): FfmpegCommandInterface })().availableCodecs(callback);
};

FfmpegCommand.availableFormats = FfmpegCommand.getAvailableFormats = function (
  callback: (err: Error | null, formats?: unknown) => void
) {
  new (FfmpegCommand as unknown as { new (): FfmpegCommandInterface })().availableFormats(callback);
};

FfmpegCommand.availableEncoders = FfmpegCommand.getAvailableEncoders = function (
  callback: (err: Error | null, encoders?: unknown) => void
) {
  new (FfmpegCommand as unknown as { new (): FfmpegCommandInterface })().availableEncoders(
    callback
  );
};

FfmpegCommand.ffprobe = function (file: string, ...args: unknown[]) {
  const instance = new (FfmpegCommand as unknown as { new (f: string): FfmpegCommandInterface })(
    file
  );
  (instance as FfmpegCommandInterface).ffprobe(
    ...(args as [callback: (err: Error | null, data?: unknown) => void])
  );
};

export default FfmpegCommand as unknown as {
  new (input?: unknown, options?: unknown): FfmpegCommandInterface;
  (input?: unknown, options?: unknown): FfmpegCommandInterface;
  prototype: FfmpegCommandInterface;
  setFfmpegPath(path: string): void;
  setFfprobePath(path: string): void;
  setFlvtoolPath(path: string): void;
  availableFilters(callback: (err: Error | null, filters?: unknown) => void): void;
  getAvailableFilters(callback: (err: Error | null, filters?: unknown) => void): void;
  availableCodecs(callback: (err: Error | null, codecs?: unknown) => void): void;
  getAvailableCodecs(callback: (err: Error | null, codecs?: unknown) => void): void;
  availableFormats(callback: (err: Error | null, formats?: unknown) => void): void;
  getAvailableFormats(callback: (err: Error | null, formats?: unknown) => void): void;
  availableEncoders(callback: (err: Error | null, encoders?: unknown) => void): void;
  getAvailableEncoders(callback: (err: Error | null, encoders?: unknown) => void): void;
  ffprobe(file: string, ...args: unknown[]): void;
};
