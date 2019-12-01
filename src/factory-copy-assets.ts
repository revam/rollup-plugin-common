import { join, relative, resolve } from "path";

import { copyFile, isDirectory, iteratePath, stat } from "./file-system-utils";
import { MessageCode, WriteBundleFunction } from "./main.private";
import { makeDirP } from "./make-dir-p";

/**
 * Options for copying assets.
 *
 * @public
 */
export interface CopyAssetsOptions {
  /**
   * Files to copy to output folder.
   *
   * @remarks
   *
   * If supplied with an array, then the first element will be the path to the
   * input file, and the second will be the path relative to the output file,
   * including the filename.
   */
  files: Array<string | [string, string]>;
  /**
   * Write output even if a file already exists at path.
   */
  force?: boolean;
  /**
   * Root directory for input files.
   *
   * @remarks
   *
   * Either an absolute path or a path relative to current working directory
   * (cwd). Defaults to current working directory if not supplied.
   */
  input?: string;
}

export default function copyAssetsFactory(opts: CopyAssetsOptions, verbose?: boolean): WriteBundleFunction {
  const files = opts.files || [];
  const force = opts.force || false;
  const inputFolder = opts.input ? resolve(opts.input) : resolve();
  return async function (_, outputFolder) {
    if (await isDirectory(outputFolder)) {
      const promises: Array<Promise<any>> = [];
      await Promise.all(files.map(async (a) => {
        const input = join(inputFolder, a instanceof Array ? a[0] : a);
        const output = join(outputFolder, relative(inputFolder, a instanceof Array ? a[1] : a));
        for await (const result of iteratePath(input, output)) {
          // Create directory
          if (result.type === "directory") {
            const stats = await stat(result.output);
            if (stats) {
              if (!stats.isDirectory()) {
                return this.warn(`Cannot add entries to path "${result.output}" (code: ${MessageCode.DirectoryExpected})`);
              }
            }
            else {
              await makeDirP(result.output);
            }
          }
          // Copy file
          else if (result.type === "file") {
            const stats = await stat(result.output);
            if (!stats) {
              promises.push(copyFile(result.input, result.output));
            }
            // It is possible to force if a file already exist
            else if (stats.isFile()) {
              if (force) {
                promises.push(copyFile(result.input, result.output));
              }
              else if (verbose) {
                return this.warn(`Cannot write file "${result.output}". (code: ${MessageCode.FileExists})`);
              }
            }
            else if (verbose) {
              return this.warn(`Cannot write file "${result.output}". (code: ${MessageCode.FileExpected})`);
            }
          }
          else if (verbose) {
            return this.warn(`Unknown entry "${result.input}". (code: ${result.code})`);
          }
        }
      }));
      // Await extra promises if registered.
      if (promises.length) {
        await Promise.all(promises);
      }
    }
  };
}
