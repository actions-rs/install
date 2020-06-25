/**
 * Parse action input into a some proper thing.
 */

import { input } from "@actions-rs/core";

// Parsed action input
export interface Input {
    crate: string;
    version: string;
    useToolCache: boolean;
    primaryKey?: string;
    restoreKeys?: string[];
}

export function get(): Input {
    const crate = input.getInput("crate", { required: true });
    const version = input.getInput("version", { required: true });
    const useToolCache = input.getInputBool("use-tool-cache") || false;
    const primaryKey = input.getInput("key") || undefined;
    const restoreKeys = input.getInputAsArray("restore-keys") || undefined;

    return {
        crate: crate,
        version: version,
        useToolCache: useToolCache,
        primaryKey: primaryKey,
        restoreKeys: restoreKeys,
    };
}
