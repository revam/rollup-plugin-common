import { OutputOptions, RollupOptions } from "rollup";

import common from "../src/main";

const output: OutputOptions[] = [
  {
    file: "dist/package/index.js",
    format: "cjs",
    preferConst: true,
  },
  {
    file: "dist/package/index.mjs",
    format: "esm",
    preferConst: true,
  },
];

const options: RollupOptions = {
  input: "dist/src/main.js",
  // FIXME: Work-around for wrong type emitted by rollup package. It is valid.
  output: output as any,
  plugins: [
    common({
      // Copy these files.
      copyFiles: {
        files: [
          "changelog.md",
          "license.txt",
          "readme.md",
          // The first path is relative to current working directory,
          // the second is relative to the output directory.
          ["dist/tsdoc-metadata.json", "tsdoc-metadata.json"],
        ],
      },
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
      // Generate banner in emitted files.
      useBanner: true,
    }),
  ],
};

export default options;
