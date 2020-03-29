/**
 * Parse action input into a some proper thing.
 */

import { input } from "@actions-rs/core";

// Parsed action input
export interface Input {
    crate: string;
    version: string;
    useToolCache: boolean;
    useCache: boolean;
}

export function get(): Input {
    const crate = input.getInput("crate", { required: true });
    const version = input.getInput("version", { required: true });
    const useToolCache = input.getInputBool("use-tool-cache") || false;
    const useCache = input.getInputBool("use-cache") || true;

    return {
        crate: crate,
        version: version,
        useToolCache: useToolCache,
        useCache: useCache,
    };
}
