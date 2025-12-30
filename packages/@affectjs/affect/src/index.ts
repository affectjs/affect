/**
 * @affectjs/affect - Unified Media Processing Runtime
 *
 * Main entry point for the runtime engine
 */

export { affect, execute, affectBatch } from './runtime';
export type {
    MediaType,
    Operation,
    Result,
    RuntimeOptions,
    ProgressInfo,
} from './types';

