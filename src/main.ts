import * as core from "@actions/core";
import { Cargo } from "@actions-rs/core";

import * as input from "./input";
import * as download from "./download";

export async function run(crate: string, version: string): Promise<void> {
    try {
        await download.downloadFromCache(crate, version);
    } catch (error) {
        core.warning(
            `Unable to download ${crate} == ${version} from the tool cache: ${error}`
        );
        core.info("Falling back to the `cargo install` command");
        const cargo = await Cargo.get();
        await cargo.installCached(crate, version);
    }
}

async function main(): Promise<void> {
    try {
        const actionInput = input.get();

        await run(actionInput.crate, actionInput.version);
    } catch (error) {
        core.setFailed(error.message);
    }
}

main();
