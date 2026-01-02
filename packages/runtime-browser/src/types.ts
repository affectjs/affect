export type {
  Runtime,
  ExecutionResult,
  InputSource,
  Operation,
  MediaType,
  RuntimeConfig,
} from "@affectjs/core";

export interface ExecutionContext {
  input: string; // Identifier
  mediaType: "video" | "audio" | "image";
  operations: unknown[];
  onProgress?: (progress: number) => void;
  onLog?: (message: string) => void;
}

export interface Backend {
  name: string;
  supportedTypes: readonly string[];
  initialize(): Promise<void>;
  execute(operation: unknown, context: ExecutionContext): Promise<unknown>;
  dispose(): Promise<void>;
}
