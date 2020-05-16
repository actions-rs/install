import * as core from "@actions/core";
// import * as cache from "@actions/cache";
// import { Cargo } from "@actions-rs/core";

import { install } from "./install";
import * as input from "./input";

async function run(options: input.Input): Promise<void> {
    await install(options.crate, options.version, {
        features: options.features,
        allFeatures: options.allFeatures,
        noDefaultFeatures: options.noDefaultFeatures,
    });
}

async function main(): Promise<void> {
    try {
        const actionInput = input.get();

        await run(actionInput);
    } catch (error) {
        core.setFailed(error.message);
    }
}

main();
