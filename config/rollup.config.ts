import { OutputOptions, RollupOptions } from "rollup";

import common from "../src/main";

const output: OutputOptions[] = [
  {
    exports: "named",
    file: "dist/package/index.js",
    format: "cjs",
    preferConst: true,
  },
  {
    exports: "named",
    file: "dist/package/index.mjs",
    format: "esm",
    preferConst: true,
  },
];

const options: RollupOptions = {
  external: [
    "fs",
    "magic-string",
    "path",
    "read-pkg",
    "rollup-pluginutils",
    "stream",
    "write-pkg",
    "util",
  ],
  input: "dist/src/main.js",
  output,
  plugins: [
    common({
      // Copy assets
      copyAssets: {
        files: [
          "changelog.md",
          "license.txt",
          "readme.md",
          // The first path is relative to current working directory,
          // the second is relative to the output directory.
          ["dist/tsdoc-metadata.json", "tsdoc-metadata.json"],
        ],
        // // Overwrite files that already exists in the output directory.
        // force: true,
        // // Input folder (defaults to current working directory if not
        // // provided)
        // input: ".",
      },
      // // Create assets
      // createAssets: {
      //   files: {
      //     // Value can be a string, an Uint8Array, an Iterable<Uint8Array>,
      //     // an AsyncIterable<Uint8Array>, a Readable, or a function leading to
      //     // any of the previously mentioned types.
      //     "test-1.js": "process.exit(0)",
      //   },
      //   // Overwrite files that already exists in the output directory.
      //   force: true,
      // }
      // Generate package.json
      package: {
        // Set content of generated package.
        content: {
          // Commonjs export
          main: "index.js",
          // ESM export
          module: "index.mjs",
          // Typescript export
          types: "index.d.ts",
        },
        // Include rollup as a dependency in the generated package.
        dependencies: [
          "rollup",
        ],
        // My preferred order
        order: [
          "name",
          "version",
          "description",
          "license",
          "main",
          "module",
          "types",
          "files",
          "keywords",
          "author",
          "contributors",
          "repository",
          "homepage",
          "bugs",
          "dependencies",
          "optionalDependencies",
          "peerDependencies",
        ],
        // Include these fields from the original package.json.
        pick: [
          "author",
          "bugs",
          "contributors",
          "description",
          "homepage",
          "keywords",
          "license",
          "name",
          "repository",
          "version",
        ],
      },
      // Replace text with regular expressions
      replace: {
        simple: {
          '\\\${"(\\w+)"}': "$1",
        },
        // Same as above, but as a normal pattern instead.
        // patterns: [
        //   {
        //     regex: /\${"(\w+)"}/g,
        //     replace: "$1",
        //   },
        // ],
      },
      // Generate banner in emitted files.
      useBanner: true,
    }),
  ],
};

export default options;
