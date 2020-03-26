import os from "os";
import { promises as fs } from "fs";
import path from "path";

import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import * as http from "@actions/http-client";

function getRunner(): string {
    const platform = os.platform() as string;
    switch (platform) {
        case "windows":
            return "windows-2019";
        case "darwin":
            return "macos-10.15";
        case "linux":
            // TODO: Handle `ubuntu-16.04`
            return "ubuntu-18.04";
        default:
            throw new Error("Unsupported OS");
    }
}

function getExt(): string {
    const platform = os.platform() as string;
    switch (platform) {
        case "windows":
            return ".exe";
        default:
            return "";
    }
}

async function resolveVersion(crate: string): Promise<string> {
    const url = `https://crates.io/api/v1/crates/${crate}`;
    const client = new http.HttpClient(
        "@actions-rs (https://github.com/actions-rs/)"
    );

    const resp: any = await client.getJson(url);
    if (resp.result == null) {
        throw new Error("Unable to fetch latest crate version");
    }

    return resp.result["crate"]["newest_version"];
}

function buildUrl(crate: string, version: string): string {
    /**
     * !!! READ THIS IMPORTANT NOTICE !!!
     *
     * In case you want to use that binary cache bucket
     * for your purposes, please, don't do that.
     *
     * It is strictly private and intended to be used
     * by `@actions-rs` only.
     * There are no stable folders, naming structure,
     * bucket name or even the AWS region used.
     * You are not doing yourself better
     * by trying to trick everyone, just stop right now.
     */
    const s3Region = "us-east-2";
    const s3Bucket = "actions-rs.install.binary-cache";
    const runner = getRunner();
    const ext = getExt();

    core.debug(`Determined current Actions runner OS: ${runner}`);

    return `https://s3.${s3Region}.amazonaws.com/${s3Bucket}/${crate}/${runner}/${crate}-${version}${ext}`;
}

function targetPath(crate: string): string {
    const ext = getExt();
    const filename = `${crate}${ext}`;

    return path.join(os.homedir(), ".cargo", "bin", filename);
}

export async function downloadFromCache(
    crate: string,
    version: string
): Promise<void> {
    if (version == "latest") {
        core.debug(`Latest version requested for ${crate}, querying crates.io`);
        version = await resolveVersion(crate);
        core.info(`Newest ${crate} version available at crates.io: ${version}`);
    }
    const url = buildUrl(crate, version);
    const path = targetPath(crate);

    core.debug(`Constructed S3 URL for ${crate}: ${url}`);
    core.info(`Downloading ${crate} == ${version} into ${path}`);

    try {
        await fs.access(path);

        core.warning(`Crate ${crate} already exist at ${path}`);
    } catch (error) {
        core.debug(`Downloading ${url} into ${path}`);
        await tc.downloadTool(url, path);
        await fs.chmod(path, 0o755);
    }
}
