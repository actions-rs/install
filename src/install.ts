import * as path from "path";
import * as os from "os";
import { promises as fs } from "fs";

import * as core from "@actions/core";
import * as cache from "@actions/cache";
import { Cargo } from "@actions-rs/core";

const CACHE_KEY_PREFIX = "actions-rs-install";
const CACHE_KEY_SEPARATOR = "-";

export interface Options {
    features: string[];
    allFeatures: boolean;
    noDefaultFeatures: boolean;
}

// TODO: Supports only currently existing GitHub runners.
// TODO: Check if there any pre-existing env variable to determine OS type and version
function getRunner(): string {
    const platform = os.platform() as string;
    switch (platform) {
        case "win32":
            return "windows-2019";
        case "darwin":
            return "macos-10.15";
        case "linux":
            // TODO: Is there better way to determine Actions runner OS?
            if (os.release().startsWith("4.15")) {
                return "ubuntu-16.04";
            } else {
                return "ubuntu-18.04";
            }
        default:
            throw new Error("Unsupported OS");
    }
}

function makeCacheKey(
    crate: string,
    version: string,
    options: Options
): string {
    // TODO: Mix up runner OS
    const parts = [CACHE_KEY_PREFIX, getRunner(), crate, version];

    if (options.noDefaultFeatures) {
        parts.push("no-default-features");
    }
    if (options.allFeatures) {
        parts.push("all-features");
    }

    // TODO: resulting cache key can't exceed 512 characters.
    // It is a big enough capacity not to worry about it right now,
    // but we should probably hash the features list in order not to
    // exceed it.
    if (options.features) {
        const features = options.features;
        features.sort();
        for (const feature of features) {
            parts.push(feature);
        }
    }

    return parts.join(CACHE_KEY_SEPARATOR);
}

export async function install(
    crate: string,
    version: string,
    options: Options
): Promise<void> {
    const cacheKey = makeCacheKey(crate, version, options);
    core.debug(`Cache key for ${crate} == ${version}: "${cacheKey}"`);

    // If missing in cache, crate will be installed into this installation root.
    // Note that binaries will be at `${installRoot}/bin` after `cargo install` execution.
    //
    // We can't use smth like `os.tmpdir()`, `@actions/cache` requires that
    // files should be in `$WORKSPACE`.
    const workspace = process.env["GITHUB_WORKSPACE"] ?? process.cwd();
    const installRoot = path.join(
        workspace,
        "target",
        "actions-rs-install",
        crate
    );
    await fs.mkdir(installRoot, {
        recursive: true,
    });

    core.debug(`Restoring cache into ${installRoot}`);
    const result = await cache.restoreCache([installRoot], cacheKey, []);
    console.log("Cache restoration result", result);

    // There is no cache entry, installing it manually.
    if (result === undefined) {
        const cargo = await Cargo.get();
        const args = ["install", crate];
        if (version !== "latest" && version !== "*") {
            args.push("--version");
            args.push(version);
        }
        if (options.allFeatures) {
            args.push("--all-features");
        }
        if (options.noDefaultFeatures) {
            args.push("--no-default-features");
        }
        if (options.features.length > 0) {
            args.push("--features");
            args.push(options.features.join(","));
        }

        args.push("--root");
        args.push(installRoot);
        args.push("--no-track");

        try {
            core.startGroup(`Installing ${crate}`);
            await cargo.call(args);
        } finally {
            core.endGroup();
        }

        await cache.saveCache([installRoot], cacheKey);
    }

    const targetDir = path.join(os.homedir(), ".cargo", "bin");
    core.debug(`Copying files from the ${installRoot} into ${targetDir}`);

    const copyRoot = path.join(installRoot, "bin");
    const files = await fs.readdir(copyRoot);
    for (const file of files) {
        const source = path.join(copyRoot, file);
        const target = path.join(targetDir, path.basename(file));
        core.debug(`Copying ${source} to ${target}`);
        await fs.copyFile(source, target);
    }

    core.debug(`Removing temporary install root at ${installRoot}`);
    fs.unlink(installRoot);
}
