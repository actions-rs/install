import os from "os";
import { promises as fs } from "fs";
import path from "path";

import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as tc from "@actions/tool-cache";
import * as http from "@actions/http-client";

const CLOUDFRONT_ROOT = "https://d1ad61wkrfbmp3.cloudfront.net";
// Path to the public key of the sign certificate.
// It is resolved either from compiled `dist/index.js` during usual Action run,
// or from this one file and always points to the file at the repo root.
const CACHE_PUBLIC_KEY = path.resolve(__dirname, "..", "public.pem");

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
    const runner = getRunner();

    core.debug(`Determined current Actions runner OS: ${runner}`);

    return `${CLOUDFRONT_ROOT}/${crate}/${runner}/${crate}-${version}.zip`;
}

function binPath(): string {
    return path.join(os.homedir(), ".cargo", "bin");
}

/**
 * Build download path
 */
function targetPath(crate: string): string {
    const filename = `${crate}.zip`;

    return path.join(os.tmpdir(), filename);
}

async function verify(crate: string, signature: string): Promise<void> {
    await exec.exec("openssl", [
        "dgst",
        "-sha256",
        "-verify",
        CACHE_PUBLIC_KEY,
        "-signature",
        signature,
        crate,
    ]);
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
    const signatureUrl = `${url}.sig`;

    const path = targetPath(crate);
    const signaturePath = `${path}.sig`;

    core.debug(`Constructed S3 URL for ${crate}: ${url}`);

    try {
        await fs.access(path);

        core.warning(`Crate ${crate} already exist at ${path}`);
    } catch (error) {
        core.info(`Downloading ${crate} signature into ${signaturePath}`);
        await tc.downloadTool(signatureUrl, signaturePath);

        core.info(`Downloading ${crate} == ${version} into ${path}`);
        await tc.downloadTool(url, path);

        try {
            core.info("Starting signature verification process");
            await verify(path, signaturePath);

            const cargoBinPath = binPath();
            core.info(`Extracting files into ${cargoBinPath}`);
            await tc.extractZip(path, cargoBinPath);
        } catch (error) {
            core.warning(
                `Unable to validate signature for downloaded ${crate}!`
            );

            // Remove downloaded files, as they are now considered dangerous now
            await fs.unlink(path);
            await fs.unlink(signaturePath);
            throw error;
        }

        await fs.chmod(path, 0o755);
    }
}
