import { createReadStream, createWriteStream, readdir as READDIR, stat as STAT, Stats } from "fs";
import { join } from "path";
import { Readable } from "stream";
import { promisify } from "util";

import { ErrorCodes } from "./main.private";

const readDir = promisify(READDIR);
const readStat = promisify(STAT);

export async function copyFile(input: string, output: string): Promise<void> {
  return new Promise((onClose, onError) => {
    const readStream = createReadStream(input, { autoClose: true });
    const writeStream = createWriteStream(output, { autoClose: true });
    writeStream.on("close", onClose);
    writeStream.on("error", onError);
    readStream.pipe(writeStream);
  });
}

export async function writeFile(readStream: Readable, output: string): Promise<void> {
  return new Promise((onClose, onError) => {
    const writeStream = createWriteStream(output, { autoClose: true });
    writeStream.on("close", onClose);
    writeStream.on("error", onError);
    readStream.pipe(writeStream);
  });
}

/**
 * Iterate path and report findings.
 *
 * @param input - Input path to iterate.
 * @param output - Equivalent path for output.
 */
export async function* iteratePath(input: string, output: string): AsyncIterableIterator<PathInfo> {
  const stats = await stat(input);
  if (stats) {
    if (stats.isFile()) {
      yield { type: "file", input, output };
    }
    else if (stats.isDirectory()) {
      yield { type: "directory", output };
      const entries = await readDir(input);
      for (const entry of entries) {
        yield* iteratePath(join(input, entry), join(output, entry));
      }
    }
    else {
      yield { type: "unknown", input, code: ErrorCodes.Unsupported };
    }
  }
  else {
    yield { type: "unknown", input, code: ErrorCodes.NotFound };
  }
}

export const stat = async (path: string): Promise<Stats | undefined> => readStat(path).catch(() => undefined);
export const isDirectory = async (path: string): Promise<boolean> => readStat(path).then((s) => s.isDirectory()).catch(() => false);

export type PathInfo =
| { type: "file"; input: string; output: string }
| { type: "directory"; output: string }
| { type: "unknown"; input: string; code: ErrorCodes }
;
