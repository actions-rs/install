# `cargo-install` Action

[![Sponsoring](https://img.shields.io/badge/Support%20it-Say%20%22Thank%20you!%22-blue)](https://actions-rs.github.io/#sponsoring)
![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)
[![Gitter](https://badges.gitter.im/actions-rs/community.svg)](https://gitter.im/actions-rs/community)
![Continuous integration](https://github.com/actions-rs/install/workflows/Continuous%20integration/badge.svg)
![Dependabot enabled](https://api.dependabot.com/badges/status?host=github&repo=actions-rs/toolchain)

This GitHub Action provides faster version of the `cargo install` command.

⚠ ️**NOTE: Work on this Action is still in progress, no guarantees on stability, correctness or security are provided right now.** ⚠

**Table of Contents**

* [How does this works?](#how-does-it-work)
* [Example workflow](#example-workflow)
* [Inputs](#inputs)
* [Security considerations](#security-considerations)
* [License](#license)
* [Contribute and support](#contribute-and-support)

## How does it work?

1. Most popular binary crates used in Rust CI are selected for the speed-up installation
2. They are compiled directly at GitHub virtual environments
3. Then they are uploaded into the external storage
4. When you use this Action to install one of these crates,
   it will be downloaded from this cache storage
5. If crate was not found in the cache storage, usual `cargo install` will be invoked instead.

As soon as https://github.com/actions-rs/meta/issues/21 will be implemented,
this Action will also cache resulting binary in the GitHub cache after compilation.

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
      - uses: actions-rs/install@master
        with:
          crate: cargo-audit
          version: latest
      - run: cargo audit
```

## Inputs

| Name         | Required | Description              | Type   | Default |
| ------------ | :------: | -------------------------| ------ | --------|
| `crate`      | ✓        | Binary crate name        | string |         |
| `version`    |          | Crate version to install | string | latest  |

## Security considerations

You should acknowledge that in order to speed up the crates installation,
this Action uses pre-built binaries stored in the external storage.

Before using this Action consider checking the [Security considerations](https://github.com/actions-rs/tool-cache/blob/master/README.md#security-considerations) chapter
of the tool cache builder to understand how this might affect you.

## License

This Action is distributed under the terms of the MIT license, see [LICENSE](https://github.com/actions-rs/toolchain/blob/master/LICENSE) for details.

## Contribute and support

Any contributions are welcomed!

If you want to report a bug or have a feature request,
check the [Contributing guide](https://github.com/actions-rs/.github/blob/master/CONTRIBUTING.md).

You can also support author by funding the ongoing project work,
see [Sponsoring](https://actions-rs.github.io/#sponsoring).
