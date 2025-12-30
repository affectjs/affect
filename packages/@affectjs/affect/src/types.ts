/**
 * @affectjs/affect - Type Definitions
 */

export type MediaType = 'video' | 'audio' | 'image';

export interface Operation {
    type: string;
    [key: string]: any;
}

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
    execute(operation: Operation, context: ExecutionContext): Promise<Result>;
    canHandle(operation: Operation, mediaType: MediaType): boolean;
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

