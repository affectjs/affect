// Input Source Types
export type InputSource =
  | string // File path or URL
  | ArrayBuffer // Memory buffer
  | Uint8Array // Memory buffer
  | Blob // Browser Blob
  | File // Browser File
  | ReadableStream; // Stream

// Basic Types
export type MediaType = "video" | "audio" | "image";

export interface Operation {
  type: string;
  [key: string]: any;
}

export interface ProgressInfo {
  percent: number;
  current: number;
  total: number;
  message?: string;
}

// Config Interface
export interface RuntimeConfig {
  corePath?: string;
  wasmPath?: string;
  worker?: boolean;
}

// Execution Result (Standardized)
export interface ExecutionResult {
  success: boolean;
  output?: Blob | string | Uint8Array | ReadableStream; // Output can be various types
  error?: Error;
  logs?: string[];
  metrics?: {
    duration: number;
    memory?: number;
  };
  metadata?: {
    duration?: number;
    size?: number;
    format?: string;
  };
}

// DSL Type
export interface AffectDSL {
  input?: string;
  output?: string;
  steps?: Operation[];
  operations?: Operation[];
  [key: string]: unknown;
}

// Runtime Interface
export interface Runtime {
  ready(): Promise<void>;

  execute(dsl: AffectDSL, inputs?: Record<string, InputSource>): Promise<ExecutionResult>;

  terminate(): Promise<void>;

  on(event: string, callback: (...args: unknown[]) => void): void;
}
