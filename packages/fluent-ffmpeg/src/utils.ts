/*jshint node:true*/
import { ChildProcess } from "child_process";
import os from "os";
import { EventEmitter } from "events";
import which from "which";

const isWindows = !!os.platform().match(/win(32|64)/);

const nlRegexp = /\r\n|\r|\n/g;
const streamRegexp = /^\[?(.*?)\]?$/;

/**
 * Parse progress line from ffmpeg stderr
 */
function parseProgressLine(line: string): Record<string, string> | null {
  const progress: Record<string, string> = {};

  line = line.replace(/=\s+/g, "=").trim();
  const progressParts = line.split(" ");

  for (let i = 0; i < progressParts.length; i++) {
    const progressSplit = progressParts[i].split("=", 2);
    const key = progressSplit[0];
    const value = progressSplit[1];

    if (typeof value === "undefined") return null;
    progress[key] = value;
  }

  return progress;
}

export interface Ring {
  append(str: string | Buffer): void;
  get(): string;
  close(): void;
  callback(cb: (line: string) => void): void;
}

export interface CodecInput {
  format: string;
  audio: string;
  video: string;
  duration: string;
  audio_details?: string[];
  video_details?: string[];
}

export interface CodecStack {
  inputStack: CodecInput[];
  inputIndex: number;
  inInput: boolean;
}

export type FilterSpec =
  | string
  | {
      filter: string;
      options?: string | string[] | Record<string, unknown>;
      inputs?: string | string[];
      outputs?: string | string[];
    };

export interface OptionCollector {
  (...args: (string | string[] | FilterSpec | FilterSpec[])[]): string[];
  clear(): void;
  get(): string[];
  clone(): OptionCollector;
}

export type FfmpegCommand = EventEmitter & {
  emit: (event: string | symbol, ...args: unknown[]) => boolean;
  _ffprobeData?: {
    format?: {
      duration?: string | number;
    };
    streams?: {
      codec_type: string;
      width: number;
      height: number;
      duration: string | number;
    }[];
  };
  options: {
    stdoutLines: number;
    niceness?: number;
    cwd?: string;
    timeout?: number;
    presets?: string;
    [key: string]: unknown;
  };
  _inputs: {
    source: string | unknown;
    isStream: boolean;
    options: OptionCollector;
  }[];
  _outputs: {
    target: string | unknown;
    pipeopts: unknown;
    isFile?: boolean;
    options: OptionCollector;
    audio: OptionCollector;
    video: OptionCollector;
    audioFilters: OptionCollector;
    videoFilters: OptionCollector;
    sizeFilters: OptionCollector;
    flags: Record<string, unknown>;
    sizeData?: Record<string, unknown>;
  }[];
  _currentInput: FfmpegCommand["_inputs"][number];
  _currentOutput: FfmpegCommand["_outputs"][number];
  _complexFilters: OptionCollector;
  ffmpegProc?: ChildProcess;
  processTimer?: NodeJS.Timeout;
  _getFfmpegPath(callback: (err: Error | null, path: string) => void): void;
  _getFlvtoolPath(callback: (err: Error | null, path: string) => void): void;
  _getFfprobePath(callback: (err: Error | null, path: string) => void): void;
  _spawnFfmpeg(
    args: string[],
    options: unknown,
    processCB?: (ffmpegProc: ChildProcess, stdoutRing: Ring, stderrRing: Ring) => void,
    endCB?: (err: Error | null, stdoutRing?: Ring, stderrRing?: Ring) => void
  ): void;
  _getArguments(): string[];
  _checkCapabilities(callback: (err: Error | null) => void): void;
  ffprobe(callback: (err: Error | null, data?: unknown) => void): FfmpegCommand;
  logger: {
    warn(msg: string): void;
    error(msg: string): void;
    debug(msg: string): void;
    info(msg: string): void;
  };
  kill(signal?: string): FfmpegCommand;
  run(): FfmpegCommand;
  input(source: string | unknown): FfmpegCommand;
  output(target: string | unknown, pipeopts?: unknown): FfmpegCommand;
  addInput(source: string | unknown): FfmpegCommand;
  addOutput(target: string | unknown, pipeopts?: unknown): FfmpegCommand;
  mergeAdd(source: string | unknown): FfmpegCommand;
  setFfmpegPath(path: string): FfmpegCommand;
  setFfprobePath(path: string): FfmpegCommand;
  setFlvtoolPath(path: string): FfmpegCommand;
  availableFilters(callback: (err: Error | null, filters?: unknown) => void): FfmpegCommand;
  availableCodecs(callback: (err: Error | null, codecs?: unknown) => void): FfmpegCommand;
  availableFormats(callback: (err: Error | null, formats?: unknown) => void): FfmpegCommand;
  availableEncoders(callback: (err: Error | null, encoders?: unknown) => void): FfmpegCommand;
  // Audio methods
  noAudio(): FfmpegCommand;
  withNoAudio(): FfmpegCommand;
  audioCodec(codec: string): FfmpegCommand;
  withAudioCodec(codec: string): FfmpegCommand;
  audioBitrate(bitrate: string | number): FfmpegCommand;
  withAudioBitrate(bitrate: string | number): FfmpegCommand;
  audioChannels(channels: number): FfmpegCommand;
  withAudioChannels(channels: number): FfmpegCommand;
  audioFrequency(freq: number): FfmpegCommand;
  withAudioFrequency(freq: number): FfmpegCommand;
  audioQuality(quality: number): FfmpegCommand;
  withAudioQuality(quality: number): FfmpegCommand;
  audioFilter(...filters: (string | FilterSpec)[]): FfmpegCommand;
  audioFilters(...filters: (string | FilterSpec)[]): FfmpegCommand;
  withAudioFilter(...filters: (string | FilterSpec)[]): FfmpegCommand;
  withAudioFilters(...filters: (string | FilterSpec)[]): FfmpegCommand;
  // Video size methods
  size(size: string): FfmpegCommand;
  withSize(size: string): FfmpegCommand;
  setSize(size: string): FfmpegCommand;
  aspect(aspect: string | number): FfmpegCommand;
  withAspect(aspect: string | number): FfmpegCommand;
  withAspectRatio(aspect: string | number): FfmpegCommand;
  setAspect(aspect: string | number): FfmpegCommand;
  setAspectRatio(aspect: string | number): FfmpegCommand;
  aspectRatio(aspect: string | number): FfmpegCommand;
  autopad(pad?: boolean | string, color?: string): FfmpegCommand;
  autoPad(pad?: boolean | string, color?: string): FfmpegCommand;
  // Misc methods
  preset(preset: string | ((...args: unknown[]) => unknown)): FfmpegCommand;
  usingPreset(preset: string | ((...args: unknown[]) => unknown)): FfmpegCommand;
  renice(priority: number): FfmpegCommand;
  priority(priority: number): FfmpegCommand;
  // Video methods
  videoCodec(codec: string): FfmpegCommand;
  withVideoCodec(codec: string): FfmpegCommand;
  videoBitrate(bitrate: string | number): FfmpegCommand;
  withVideoBitrate(bitrate: string | number): FfmpegCommand;
  videoFilter(...filters: (string | FilterSpec)[]): FfmpegCommand;
  videoFilters(...filters: (string | FilterSpec)[]): FfmpegCommand;
  withVideoFilter(...filters: (string | FilterSpec)[]): FfmpegCommand;
  withVideoFilters(...filters: (string | FilterSpec)[]): FfmpegCommand;
  fps(fps: number): FfmpegCommand;
  withVideoFps(fps: number): FfmpegCommand;
  withVideoFPS(fps: number): FfmpegCommand;
  withFps(fps: number): FfmpegCommand;
  withFPS(fps: number): FfmpegCommand;
  videoFPS(fps: number): FfmpegCommand;
  videoFps(fps: number): FfmpegCommand;
  FPS(fps: number): FfmpegCommand;
  frames(frames: number): FfmpegCommand;
  withFrames(frames: number): FfmpegCommand;
  noVideo(): FfmpegCommand;
  withNoVideo(): FfmpegCommand;
  // Output methods
  format(format: string): FfmpegCommand;
  toFormat(format: string): FfmpegCommand;
  withOutputFormat(format: string): FfmpegCommand;
  duration(duration: string | number): FfmpegCommand;
  withDuration(duration: string | number): FfmpegCommand;
  setDuration(duration: string | number): FfmpegCommand;
  seek(seek: string | number): FfmpegCommand;
  seekOutput(seek: string | number): FfmpegCommand;
  flvmeta(): FfmpegCommand;
  updateFlvMetadata(): FfmpegCommand;
};

export interface ProgressData {
  frames: number;
  currentFps: number;
  currentKbps: number;
  targetSize: number;
  timemark: string;
  percent?: number;
}

export interface CodecData {
  inputs: {
    format: string;
    streams: {
      type: string;
      details: string;
    }[];
  }[];
  currentInput?: number;
}

const utils = {
  isWindows,
  streamRegexp,

  linesRing: function (maxLines: number): Ring {
    const lines: string[] = [];
    let partialLine = "";
    let cb: ((line: string) => void) | null = null;
    let closed = false;

    return {
      append: function (str: string | Buffer) {
        const data = str.toString();
        const fullData = partialLine + data;
        const split = fullData.split(nlRegexp);
        
        // 保存最后一部分（可能是不完整的行）
        partialLine = split[split.length - 1] || "";
        
        // 处理完整的行（split.length - 1 个完整行）
        for (let i = 0; i < split.length - 1; i++) {
          const line = split[i];
          // 只处理非空行
          if (line.length > 0) {
            lines.push(line);
            if (cb && !closed) cb(line);
          }
        }

        // 限制行数（在添加后限制，包括 partialLine）
        if (maxLines > 0) {
          // 计算总行数（包括 partialLine）
          const totalLines = lines.length + (partialLine ? 1 : 0);
          if (totalLines > maxLines) {
            const toRemove = totalLines - maxLines;
            // 从开头移除多余的行
            lines.splice(0, toRemove);
          }
        }
      },

      get: function () {
        const allLines = [...lines];
        if (partialLine) {
          allLines.push(partialLine);
        }
        return allLines.join("\n");
      },

      close: function () {
        if (closed) return;
        if (partialLine) {
          lines.push(partialLine);
          if (cb) cb(partialLine);
          partialLine = "";
        }
        closed = true;
      },

      callback: function (callback: (line: string) => void) {
        cb = callback;
        // 为已存在的行调用回调
        lines.forEach((line) => {
          if (cb) cb(line);
        });
      },
    };
  },

  makeFilterStrings: function (filters: (string | FilterSpec)[]): string[] {
    const escapeFilterOption = (val: unknown) => {
      let str = String(val);
      if (str.match(/[,:=' ]/)) {
        str = "'" + str.replace(/'/g, "'\\\\''") + "'";
      }
      return str;
    };

    return filters.map((filter) => {
      if (typeof filter === "string") {
        return filter;
      }

      let res = "";
      if (filter.inputs) {
        const inputs = Array.isArray(filter.inputs) ? filter.inputs : [filter.inputs];
        res += inputs.map((stream) => String(stream).replace(utils.streamRegexp, "[$1]")).join("");
      }

      res += filter.filter;

      if (filter.options) {
        const options = filter.options;
        if (Array.isArray(options)) {
          res += "=" + options.map(escapeFilterOption).join(":");
        } else if (typeof options === "object") {
          res +=
            "=" +
            Object.keys(options)
              .map(
                (key) => key + "=" + escapeFilterOption((options as Record<string, unknown>)[key])
              )
              .join(":");
        } else {
          res += "=" + escapeFilterOption(options);
        }
      }

      if (filter.outputs) {
        const outputs = Array.isArray(filter.outputs) ? filter.outputs : [filter.outputs];
        res += outputs.map((stream) => String(stream).replace(utils.streamRegexp, "[$1]")).join("");
      }

      return res;
    });
  },

  extractProgress: function (command: FfmpegCommand, line: string) {
    const progress = parseProgressLine(line);
    if (progress) {
      if ("time" in progress) {
        const parts = progress.time.split(":");
        let seconds = 0;
        if (parts.length === 3) {
          seconds += parseInt(parts[0], 10) * 3600;
          seconds += parseInt(parts[1], 10) * 60;
          seconds += parseFloat(parts[2]);
        }

        const data: ProgressData = {
          frames: parseInt(progress.frame, 10),
          currentFps: parseInt(progress.fps, 10),
          currentKbps: parseFloat(progress.bitrate),
          targetSize: parseInt(progress.size, 10),
          timemark: progress.time,
        };

        if (
          command._ffprobeData &&
          command._ffprobeData.format &&
          command._ffprobeData.format.duration
        ) {
          const duration = parseFloat(String(command._ffprobeData.format.duration));
          data.percent = Math.round((seconds / duration) * 100);
        }

        command.emit("progress", data);
      }
    }
  },

  extractCodecData: function (command: FfmpegCommand, line: string, codecData: CodecData) {
    if (line.indexOf("Input #") === 0) {
      const match = line.match(/Input #(\d+), ([^, ]+), from '.*':/);
      if (match) {
        const inputIndex = parseInt(match[1], 10);
        if (!codecData.inputs) codecData.inputs = [];
        codecData.inputs[inputIndex] = {
          format: match[2],
          streams: [],
        };
        codecData.currentInput = inputIndex;
      }
    } else if (line.indexOf("  Stream #") === 0) {
      const match = line.match(/Stream #(\d+):(\d+): (Video|Audio): (.*)$/);
      if (match) {
        const inputIndex = parseInt(match[1], 10);
        const streamIndex = parseInt(match[2], 10);
        const type = match[3].toLowerCase();
        const details = match[4];

        if (codecData.inputs && codecData.inputs[inputIndex]) {
          codecData.inputs[inputIndex].streams[streamIndex] = {
            type: type,
            details: details,
          };
        }
      }
    }

    if (line.indexOf("Output #") === 0) {
      command.emit("codecData", codecData);
      return true;
    }

    return false;
  },

  extractError: function (stderr: string): string {
    const lines = stderr.split(nlRegexp);
    let error = "";

    lines.forEach((line) => {
      if (line.match(/Error/i) || line.match(/Invalid/i) || line.match(/Unknown/i)) {
        error += line + "\n";
      }
    });

    return error.trim() || "Unknown error";
  },

  args: function (): OptionCollector {
    const args: string[] = [];
    const collector = function (...argsParams: unknown[]) {
      if (argsParams.length === 0) return args;
      argsParams.forEach((arg) => {
        if (Array.isArray(arg)) {
          args.push(...(arg as string[]));
        } else {
          args.push(arg as string);
        }
      });
      return args;
    };
    collector.get = () => args;
    collector.clear = () => {
      args.length = 0;
    };
    collector.find = (searchArg: string, count?: number): string[] | undefined => {
      const index = args.indexOf(searchArg);
      if (index === -1) return undefined;
      const result: string[] = [];
      const numParams = count || 0;
      for (let i = 0; i < numParams && index + 1 + i < args.length; i++) {
        result.push(args[index + 1 + i]);
      }
      return result;
    };
    collector.remove = (searchArg: string, count?: number) => {
      const index = args.indexOf(searchArg);
      if (index === -1) return;
      const numParams = count || 0;
      args.splice(index, 1 + numParams);
    };
    collector.clone = () => {
      const c = (this as unknown as { args: () => OptionCollector }).args();
      c(args);
      return c;
    };
    return collector as unknown as OptionCollector;
  },

  which: function (name: string, callback: (err: Error | null, path?: string) => void) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (which as any)(name, (err: Error | null, result: string | undefined) => {
      callback(err, result || undefined);
    });
  },

  copy: function (src: Record<string, unknown>, dest: Record<string, unknown>) {
    Object.keys(src).forEach((key) => {
      dest[key] = src[key];
    });
  },

  timemarkToSeconds: function (timemark: string | number): number {
    if (typeof timemark === "number") return timemark;
    if (timemark.indexOf(":") === -1 && timemark.indexOf(".") >= 0) return Number(timemark);

    const parts = timemark.split(":");
    let seconds = 0;

    // hh:mm:ss.m
    if (parts.length === 3) {
      seconds += parseInt(parts[0], 10) * 3600;
      seconds += parseInt(parts[1], 10) * 60;
      seconds += parseFloat(parts[2]);
    }

    // mm:ss.m
    else if (parts.length === 2) {
      seconds += parseInt(parts[0], 10) * 60;
      seconds += parseFloat(parts[1]);
    }

    return seconds;
  },
};

export default utils;
