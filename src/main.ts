import * as core from "@actions/core";
import { Cargo } from "@actions-rs/core";

import * as input from "./input";
import * as download from "./download";

interface Options {
    useToolCache: boolean;
    useCache: boolean;
}

async function downloadFromToolCache(
    crate: string,
    version: string
): Promise<void> {
    try {
        await download.downloadFromCache(crate, version);
    } catch (error) {
        core.warning(
            `Unable to download ${crate} == ${version} from the tool cache: ${error}`
        );
        throw error;
    }
}

export async function run(
    crate: string,
    version: string,
    options: Options
): Promise<void> {
    if (options.useToolCache) {
        try {
            core.info("Tool cache is explicitly enabled via the Action input");
            core.startGroup("Downloading from the tool cache");

            return await downloadFromToolCache(crate, version);
        } finally {
            core.endGroup();
        }
    } else if (options.useCache) {
        core.info("GitHub Actions cache is used to install the tool");
        const cargo = await Cargo.get();
        await cargo.installCached(crate, version);
    } else {
        core.info(
            "Cache is disabled. Falling back to the `cargo install` command"
        );
        const cargo = await Cargo.get();
        await cargo.install(crate, version);
    }
}

async function main(): Promise<void> {
    try {
        const actionInput = input.get();

        await run(actionInput.crate, actionInput.version, {
            useToolCache: actionInput.useToolCache,
            useCache: actionInput.useCache,
        });
    } catch (error) {
        core.setFailed(error.message);
    }
}

main();
