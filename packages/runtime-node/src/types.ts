/**
 * @affectjs/runtime - Type Definitions
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
    createCommand(input: string, mediaType: MediaType): any;
    // Adapter pattern: apply operation to command
    applyOperation(command: any, operation: Operation, mediaType: MediaType): any;
    // Adapter pattern: get metadata
    getMetadata(input: string): Promise<any>;
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

