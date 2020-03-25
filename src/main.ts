import * as core from "@actions/core";

export async function run(): Promise<void> {}

async function main(): Promise<void> {
    try {
        await run();
    } catch (error) {
        core.setFailed(error.message);
    }
}

main();
