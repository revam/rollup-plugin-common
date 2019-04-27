import { createReadStream, createWriteStream, readdir as READDIR, stat as STAT, Stats } from "fs";
import { dirname, join, relative, resolve } from "path";
import { OutputAsset, OutputBundle, OutputChunk, Plugin, PluginContext } from "rollup";
import { promisify } from "util";

import { makeDirP } from "./make-dir-p";
import { read, write } from "./package";

/**
 * Options for plugin.
 *
 * @public
 */
export interface Options {
  /**
   * Use generated banner in output files.
   */
  useBanner?: boolean;
  /**
   * Copy files into output directory.
   */
  copyFiles?: CopyFilesOptions;
  /**
   * Generate package configuration in output directory.
   */
  package?: boolean | PackageOptions;
  /**
   * Be more verbose with messages when something unexpected happens.
   */
  verbose?: boolean;
}

/**
 * Options for file copying.
 *
 * @public
 */
export interface CopyFilesOptions {
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

/**
 * Options for package generation.
 *
 * @public
 */
export interface PackageOptions {
  /**
   * Additional fields to include in the generated `package.json`.
   *
   * Fields added here will be overridden if also included in
   * {@link PackageOptions.pick | pick}, and the field exists in the original
   * `package.json`.
   */
  content?: Record<string, any>;
  /**
   * Additional dependencies to **always** include from the original
   * `package.json` in the generated `package.json`. Will only be included if
   * the depencendy is included in the original `package.json` and is not an
   * exclusive development dependency.
   */
  dependencies?: string[];
  /**
   * Choose the order in which fields from {@link PackageOptions.pick | "pick"} and
   * {@link PackageOptions.content | "content"}, in addition to generated
   * dependencies, appear in. All fields not included here wil not be sorted,
   * and appear in their natural order.
   */
  order?: string[];
  /**
   * Pick fields from the original `package.json` to be included in the
   * generated `package.json`.
   */
  pick?: string[];
  /**
   * Path leading to a folder containing, or directly to, the `package.json` to
   * use.
   */
  input?: string;
}

/**
 * Revam's common rollup tasks in a single plugin.
 *
 * @param options - {@link Options} for plugin.
 * @public
 */
export default function common(options: Options = {}): Plugin {
  const outputFolders = new Set<string>();
  const verbose = options.verbose || false;
  const writeOuts: WriteBundleFunction[] = [];
  let intro: (() => string) | undefined;
  let started = false;

  // Copy files
  if (options.copyFiles) {
    const opts = options.copyFiles;
    const files = opts.files || [];
    const force = opts.force || false;
    const inputFolder = opts.input ? resolve(opts.input) : resolve();
    // Register callback
    writeOuts.push(async function (_, outputFolder) {
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
                  return this.warn(`Cannot add sub-entries to entry "${result.output}" when not a directory.`);
                }
              }
              else {
                await makeDirP(result.output);
              }
            }
            // Copy file
            else if (result.type === "file") {
              const stats = await stat(result.output);
              if (stats) {
                if (stats.isDirectory()) {
                  return this.warn(`Cannot write resource to a directory at path "${result.output}".`);
                }
                // Force if resource exist
                if (force && stats.isFile()) {
                  promises.push(copyFile(result.input, result.output));
                }
                else if (verbose) {
                  return this.warn(`Cannot write resource to path "${result.output}".`);
                }
              }
              else {
                promises.push(copyFile(result.input, result.output));
              }
            }
            else if (verbose) {
              return this.warn(`Unknown entry at path "${result.input}". (code: ${result.code})`);
            }
          }
        }));
        // Await extra promises if registered.
        if (promises.length) {
          await Promise.all(promises);
        }
      }
    });
  }

  // Generate package if options is provided and is truthy or if options is not provided
  if (("package" in options && options.package) || options.package === undefined) {
    const opts = typeof options.package === "object" ? options.package : {};
    const pkgIn = read(opts.input);
    let depTypes = ["dependencies", "peerDependencies", "optionalDependencies"];
    // Seperate dependency types from opts.pick if found
    if (opts.pick) {
      const picked = opts.pick;
      if (picked.some((p) => depTypes.includes(p))) {
        const origDepNames = depTypes;
        depTypes = depTypes.filter((d) => picked.includes(d));
        opts.pick = picked.filter((d) => !origDepNames.includes(d));
      }
    }
    // Filter to only iterate dependency types which exist in package
    // configuration.
    depTypes = depTypes.filter((d) => d in pkgIn);
    const pkgPick = opts.pick && pick(pkgIn, opts.pick);
    const pkgExtra = opts.content;
    const depExtra = opts.dependencies instanceof Array ? opts.dependencies : undefined;
    const pkgOrder = opts.order && order(
      opts.order,
      // Include keys from opts.pick, opts.content and depTypes
      new Set([...opts.pick || [], ...depTypes, ...(pkgExtra ? Object.keys(pkgExtra) : [])]),
    ) || undefined;
    // Register callback
    writeOuts.push((bundle, outputFolder) => {
      const depName = new Set<string>(depExtra);
      // Read all dependencies
      for (const chunk of chunksOfBundle(bundle)) {
        chunk.imports.forEach((d) => depName.add(d));
        chunk.dynamicImports.forEach((d) => depName.add(d));
      }
      const depObj: Partial<Record<string, Record<string, string>>> = {};
      // Loop through each dependency type defined in `depTypes`
      for (const depType of depTypes) {
        if (depType in pkgIn) {
          const objIn: Record<string, string> = pkgIn[depType];
          const objOut: Record<string, string> = depObj[depType] = {};
          for (const dep of depName) {
            if (dep in objIn) {
              objOut[dep] = objIn[dep];
            }
          }
        }
      }
      const pkgOut = { ...pkgOrder, ...pkgExtra, ...pkgPick, ...depObj };
      write(outputFolder, pkgOut);
    });
  }

  // Add banner
  if (options.useBanner) {
    const pkg = read(typeof options.package === "object" ? options.package.input : undefined);
    intro = () => `/**
* ${pkg.description || ""}.
*
* @package ${pkg.name || "<unknown>"}
* @version ${pkg.version || "0.0.0"}
* @homepage ${pkg.homepage || "none"}
* @license ${pkg.license || "unknown"}
*/`;
  }

  return {
    intro,
    name: "revams-common-tasks",
    generateBundle(outputOptions) {
      if (outputOptions.file) {
        outputFolders.add(resolve(dirname(outputOptions.file)));
      }
      else if (outputOptions.dir) {
        outputFolders.add(resolve(outputOptions.dir));
      }
    },
    async writeBundle(bundle) {
      if (started) {
        return;
      }
      started = true;
      if (outputFolders.size && writeOuts.length) {
        for (const outputFolder of outputFolders) {
          for (const fn of writeOuts) {
            await fn.call(this, bundle, outputFolder);
          }
        }
      }
    },
  };
}

export { read as readPackage } from "./package";

/**
 * Iterate path and report findings.
 *
 * @param input - Input path to iterate.
 * @param output - Equivalent path for output.
 */
async function* iteratePath(input: string, output: string): AsyncIterableIterator<PathInfo> {
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

async function copyFile(input: string, output: string): Promise<void> {
  return new Promise((onClose, onError) => {
    const readStream = createReadStream(input, { autoClose: true });
    const writeStream = createWriteStream(output, { autoClose: true });
    writeStream.on("close", onClose);
    writeStream.on("error", onError);
    readStream.pipe(writeStream);
  });
}

function pick<T extends object, TKey extends keyof T & string>(source: T, keys: TKey[]): Pick<T, TKey>;
function pick(source: Record<PropertyKey, any>, keys: string[]): Record<PropertyKey, any>;
function pick(source: object, keys: string[]): object {
  const set = new Set(keys);
  const result = {};
  for (const key of set) {
    if (key in source) {
      result[key] = source[key];
    }
  }
  return result;
}

function order(fields: string[], sort: ReadonlySet<string>): object {
  return fields.reduce((p, c) => sort.has(c) && (p[c] = undefined) || p, {});
}

function *chunksOfBundle(bundle: OutputBundle): IterableIterator<OutputChunk> {
  for (const chunckOrAsset of (Object as any).values(bundle) as Array<OutputAsset & OutputChunk>) {
    if (!chunckOrAsset.isAsset) {
      yield chunckOrAsset;
    }
  }
}

type WriteBundleFunction = (this: PluginContext, bundle: OutputBundle, outputFolder: string) => void | Promise<void>;

type PathInfo =
| { type: "file"; input: string; output: string }
| { type: "directory"; output: string }
| { type: "unknown"; input: string; code: ErrorCodes }
;

const enum ErrorCodes {
  NotFound = "ERR_NOT_FOUND",
  Unsupported = "ERR_UNSUPPORTED",
}

const readDir = promisify(READDIR);
const readStat = promisify(STAT);

const stat = async (path: string): Promise<Stats | undefined> => readStat(path).catch(() => undefined);
const isDirectory = async (path: string): Promise<boolean> => readStat(path).then((s) => s.isDirectory()).catch(() => false);
