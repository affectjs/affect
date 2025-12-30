/**
 * @affectjs/affect - Sharp Backend Adapter
 *
 * Adapter for sharp backend
 */

import sharp from 'sharp';
import type { Backend, Operation, ExecutionContext, Result } from '../types';

export const sharpBackend: Backend = {
    name: 'sharp',
    supportedTypes: ['image'] as const,
    
    canHandle(operation: Operation, mediaType: string): boolean {
        return mediaType === 'image';
    },
    
    async execute(operation: Operation, context: ExecutionContext): Promise<Result> {
        // TODO: Implement sharp backend execution
        // This will convert operations to sharp API calls
        throw new Error('Sharp backend not implemented yet');
    },
};

