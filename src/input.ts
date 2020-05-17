/**
 * Parse action input into a some proper thing.
 */

import { input } from "@actions-rs/core";

// Parsed action input
export interface Input {
    crate: string;
    version: string | null;
    features: string[];
    allFeatures: boolean;
    noDefaultFeatures: boolean;
}

export function get(): Input {
    const crate = input.getInput("crate", { required: true });
    let version: string | null = input.getInput("version", { required: true });
    switch (version) {
        case "*":
        case "latest":
            version = null;
            break;
        default:
            break;
    }

    const features = input.getInputList("features");
    const allFeatures = input.getInputBool("all-features") || false;
    const noDefaultFeatures =
        input.getInputBool("no-default-features") || false;

    return {
        crate,
        version,
        features,
        allFeatures,
        noDefaultFeatures,
    };
}
