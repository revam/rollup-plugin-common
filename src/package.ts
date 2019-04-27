import readPkg from "read-pkg";
import writePkg from "write-pkg";

/**
 * Read first package.json, starting from `folder`. Will accend the directory
 * tree until a package.json is found or it reaches the root directory.
 *
 * @param folder - Folder to start searching in.
 * @returns The content of the first package.json found, or `undefined`.
 * @public
 */
export function read<T extends object = Record<string, any>>(folder?: string): T | never;
export function read(cwd?: string): Record<string, any> | never {
  return readPkg.sync({normalize: false, ...(cwd && { cwd } || undefined) });
}

/**
 * Write contents of package.json in `folder`.
 *
 * @param folder - Folder to put file in.
 * @param contents - Content to write to package.json.
 * @internal
 */
export function write(folder: string, contents: Record<string, any>): void | never {
  writePkg.sync(folder, contents, { indent: 2 });
}
