# @revam/rollup-plugin-common

Revam's common tasks for rollup in a single plugin.

## Description

This package is a collection of the most common tasks I use with
[rollup.js](https://rollupjs.org), modified or created by me for my personal
use, and now shared on [npm](https://npmjs.org). Tasks included are listed
below.

**Tasks:**

- Generate a package.json in each output directory. Can be a combination of
  generated content, picked content (from project's package.json), and
  generated dependency lists. Supports customised ordering of fields.

- Copy files to each output directory. Supports copying of both files and
  folders.

- Append an auto-generated banner in each chunk emitted by rollup.

## Acknowledgements

This work is based on existing plugins, listed below. If you use this
plugin, then please show your support for their work that made it possible for
me to create this by staring them on github or simular:

- [rollup-plugin-copy-assets](https://github.com/bengsfort/rollup-plugin-copy-assets)
- [rollup-plugin-generate-package-json](https://github.com/VladShcherbin/rollup-plugin-generate-package-json)

## Usage

See this projects [rollup.config.ts](./config/rollup.config.ts) for a full
usage example, or just include the default exported function in your plugins
array.

## Typescript

This module includes a [TypeScript](https://www.typescriptlang.org/)
declaration file to enable auto complete in compatible editors and type
information for TypeScript projects.

## Changelog and versioning

All notable changes to this project will be documented in [changelog.md](./changelog.md).

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## License

This project is licensed under the ISC license. See [license.txt](./license.txt)
for the full terms.
