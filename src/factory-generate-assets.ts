import { dirname, join } from "path";
import { Readable } from "stream";

import { isDirectory, stat, writeFile } from "./file-system-utils";
import { ErrorCodes, WriteBundleFunction } from "./main.private";
import { makeDirP } from "./make-dir-p";

/**
 * Options for generating assets in each output directory.
 *
 * @public
 */
export interface GenerateAssetsOptions {
  /**
   * Files to create in output folder.
   */
  files: Record<string, Content>;
  /**
   * Write even if a file already exists at the output path.
   */
  force?: boolean;
}

/**
 * The content of a generated file.
 *
 * @remarks
 *
 * Can be a string, an array-buffer, a stream-like object, or a function
 * providing some {@link (Content:type) | content}.
 *
 * @public
 */
export type Content = string | Uint8Array | Readable | Iterable<Uint8Array> | AsyncIterable<Uint8Array> | (() => Content);

export default function generateAssetsFactory(opts: GenerateAssetsOptions, verbose?: boolean): WriteBundleFunction {
  const files = opts.files || [];
  const force = opts.force || false;
  return async function (_, outputFolder) {
    if (await isDirectory(outputFolder)) {
      const promises: Array<Promise<any>> = [];
      await Promise.all(Object.entries(files).map(async ([name, content]) => {
        const output = join(outputFolder, name);
        const dirnameOfOutput = dirname(output);

        let stats = await stat(dirnameOfOutput);
        if (stats) {
          if (!stats.isDirectory()) {
            return this.warn(`Cannot add entries to path "${dirnameOfOutput}" (code: ${ErrorCodes.DirectoryExpected})`);
          }
        }
        else {
          await makeDirP(dirnameOfOutput);
        }

        const stream = __convertToReadable(content);
        stats = await stat(output);
        if (!stats) {
          promises.push(writeFile(stream, output));
        }
        // It is possible to force if a file already exist
        else if (stats.isFile()) {
          if (force) {
            promises.push(writeFile(stream, output));
          }
          else if (verbose) {
            return this.warn(`Cannot write asset "${output}". (code: ${ErrorCodes.FileExists})`);
          }
        }
        else if (verbose) {
          return this.warn(`Cannot write asset "${output}". (code: ${ErrorCodes.FileExpected})`);
        }
      }));
      // Await extra promises if registered.
      if (promises.length) {
        await Promise.all(promises);
      }
    }
  };
}

declare const TextEncoder: typeof import("util").TextEncoder;
const ENCODER = new TextEncoder();

function __convertToReadable(content: Content): Readable {
  switch (typeof content) {
    case "function":
      return __convertToReadable(content());
    case "string":
      content = ENCODER.encode(content);
    // tslint:disable-next-line:no-switch-case-fall-through
    case "object":
      if (content instanceof Readable) {
        return content;
      }
      if (content instanceof Uint8Array) {
        content = __thenable(content);
      }
      if (content) {
        return Readable.from(content, { objectMode: false });
      }
    }
  throw new Error("Unsupported value not part of the `Content` type definition provided.");
}

function* __thenable(content: Uint8Array): IterableIterator<Uint8Array> {
  yield content;
}
