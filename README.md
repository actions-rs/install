# `cargo-install` Action

[![Sponsoring](https://img.shields.io/badge/Support%20it-Say%20%22Thank%20you!%22-blue)](https://actions-rs.github.io/#sponsoring)
![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)
[![Gitter](https://badges.gitter.im/actions-rs/community.svg)](https://gitter.im/actions-rs/community)
![Continuous integration](https://github.com/actions-rs/install/workflows/Continuous%20integration/badge.svg)
![Dependabot enabled](https://api.dependabot.com/badges/status?host=github&repo=actions-rs/toolchain)

This GitHub Action provides faster version of the `cargo install` command.

⚠ ️**NOTE: This is an experimental Action.** ⚠

**Table of Contents**

* [Why?](#why)
* [How does this work?](#how-does-it-work)
* [Example workflow](#example-workflow)
* [Inputs](#inputs)
* [Tool cache](#tool-cache)
    * [Security considerations](#security-considerations)
* [GitHub cache](#github-cache)
* [License](#license)
* [Contribute and support](#contribute-and-support)

## Why?

If you are using binary crates (such as [`cargo-audit`](https://crates.io/crates/cargo-audit), [`grcov`](https://github.com/mozilla/grcov), [`cargo-geiger`](https://crates.io/crates/cargo-geiger) and so on) in your CI workflows, you might have noticed that compiling these crates each time is irritatingly slow.

This Action speeds up the crates installation with some tricks, leading to a much faster job execution; crates are expected to be installed in a couple seconds.

## How does it work?

Before calling your usual `cargo install` command, this Action
attempts to download pre-build binary crate file from the binary crates cache.
See [Security considerations](#security-considerations) to read more
about potential caveats and usage policy.

If requested crate does not exist in the crates cache storage,
this Action will fall back to the usual `cargo install`.\
As soon as [actions-rs/meta#21](https://github.com/actions-rs/meta/issues/21) will be implemented,
this Action will also cache compiled binary in the GitHub cache.


## Example workflow

```yaml
on: [push]

name: build

jobs:
  check:
    name: Rust project
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions-rs/install@v0.1
        with:
          crate: cargo-audit
          version: latest
      - run: cargo audit
```

## Inputs

| Name             | Required | Description                                      | Type   | Default |
| ---------------- | :------: | ------------------------------------------------ | ------ | --------|
| `crate`          | ✓        | Binary crate name                                | string |         |
| `version`        |          | Crate version to install                         | string | latest  |
| `use-tool-cache` |          | Use pre-compiled crates to speed-up installation | bool   | false   |

## Tool cache

As it was mentioned in [How does it work?](#how-does-it-work) section,
this Action can use external pre-compiled crates cache.

In order to enable this functionaliy, you need to **explicitly** enable `use-tool-cache` input:

```yaml
- uses: actions-rs/install@v0.1
  with:
    crate: cargo-audit
    version: latest
    use-tool-cache: true
```

Before enabling this input, you should acknowledge security risks
of executing binaries compiled for you by a third party in your CI workflows.

### Security considerations

Check the [`tool-cache`](https://github.com/actions-rs/tool-cache/) repo
to understand how binary crates are built, signed and uploaded into the external cache.

This Action downloads both binary file and its signature.
Signature validation is proceeded by `openssl` by using public key
of the same certificate used for signing files at `tool-cache` repo.\
Public key is stored in this repository at `public.pem`.

If signature validation fails, binary file is removed immediately,
warning issued and fall back to the `cargo install` call happens.

## License

This Action is distributed under the terms of the MIT license, see [LICENSE](https://github.com/actions-rs/toolchain/blob/master/LICENSE) for details.

## Contribute and support

Any contributions are welcomed!

If you want to report a bug or have a feature request,
check the [Contributing guide](https://github.com/actions-rs/.github/blob/master/CONTRIBUTING.md).

You can also support author by funding the ongoing project work,
see [Sponsoring](https://actions-rs.github.io/#sponsoring).
