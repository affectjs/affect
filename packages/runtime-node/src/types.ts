/**
 * @affectjs/runtime - Type Definitions
 */

export type MediaType = "video" | "audio" | "image";

export type Operation =
  | { type: "resize"; width: number | string; height?: number | string }
  | { type: "encode"; codec: string; param?: number | string }
  | { type: "filter"; name: string; value?: number | string }
  | {
      type: "crop";
      x?: number | string;
      y?: number | string;
      width: number | string;
      height: number | string;
    }
  | { type: "rotate"; angle: number; flip?: string }
  | { type: "videoCodec"; codec: string }
  | { type: "videoBitrate"; bitrate: string | number }
  | { type: "size"; size: string }
  | { type: "fps"; fps: number }
  | { type: "noVideo" }
  | { type: "audioCodec"; codec: string }
  | { type: "audioBitrate"; bitrate: string | number }
  | { type: "audioChannels"; channels: number }
  | { type: "audioFrequency"; frequency: number }
  | { type: "noAudio" }
  | { type: "format"; format: string }
  | { type: "options"; options: Record<string, unknown> }
  | { type: "outputOptions"; options: string[] }
  | { type: "save"; path: string }
  | { type: "tone"; r: number; g: number; b: number }
  | { type: "if"; condition: unknown; thenOperations?: Operation[]; elseOperations?: Operation[] };

export interface Result {
  success: boolean;
  output?: string;
  error?: Error;
  metadata?: {
    duration?: number;
    size?: number;
    format?: string;
  };
}

export interface Backend {
  name: string;
  supportedTypes: MediaType[];
  // Adapter pattern: declare supported file formats (extensions)
  supportedFormats: {
    video?: string[];
    audio?: string[];
    image?: string[];
  };
  execute(operation: Operation, context: ExecutionContext): Promise<Result>;
  canHandle(operation: Operation, mediaType: MediaType): boolean;
  // Adapter pattern: check if backend supports the file format
  supportsFormat(filePath: string, mediaType: MediaType): boolean;
  // Adapter pattern: create command instance from input
  createCommand(input: string, mediaType: MediaType): unknown;
  // Adapter pattern: apply operation to command
  applyOperation(command: unknown, operation: Operation, mediaType: MediaType): unknown;
  // Adapter pattern: get metadata
  getMetadata(input: string): Promise<unknown>;
}

export interface ExecutionContext {
  input: string;
  output?: string;
  mediaType: MediaType;
  operations: Operation[];
}

export interface RuntimeOptions {
  backend?: string;
  parallel?: boolean;
  progress?: (progress: ProgressInfo) => void;
}

export interface ProgressInfo {
  percent: number;
  current: number;
  total: number;
  message?: string;
}
