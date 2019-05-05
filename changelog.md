# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2019-05-05

### Added

- Added a new option-branch `Options.replace`, for replacing text with regular
  expressions, and a new exported interface `ReplaceOptions`.
  Based upon [rollup-plugin-re](https://github.com/jetiny/rollup-plugin-re).

### Changed

- Renamed interface `PackageOptions` to `GeneratePackageOptions`. Using the old
  name is possible, but will removed in next mayor version.

- Renamed interface `CopyFilesOptions` to `CopyFilesOptions`. Using the old
  name is possible, but will removed in next mayor version.

- Renamed option `Options.copyFiles` to `Options.copyAssets`. Using the old
  name is possible, but will removed in next mayor version.

### Fixed

- Added missing changelog for version 1.1.0.

## [1.1.0] - 2019-04-27

### Added

- Added new export "readPackage".

## 1.0.0 - 2019-04-15

### Added

- Initial public release

[Unreleased]: https://github.com/revam/rollup-plugin-common/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/revam/rollup-plugin-common/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/revam/rollup-plugin-common/compare/v1.0.0...v1.1.0
