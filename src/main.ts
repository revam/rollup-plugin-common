import { dirname, resolve } from "path";
import { Plugin, TransformHook } from "rollup";

import copyAssetsFactory, { CopyAssetsOptions } from "./factory-copy-assets";
import generateAssetsFactory, { GenerateAssetsOptions } from "./factory-generate-assets";
import generatePackageJsonFactory from "./factory-generate-package";
import replaceFactory, { ReplaceOptions } from "./factory-replace";
import { generatePackageObject, GeneratePackageOptions } from "./generate-package-object";
import { WriteBundleFunction } from "./main.private";

export { CopyAssetsOptions } from "./factory-copy-assets";
export { Content, GenerateAssetsOptions } from "./factory-generate-assets";
export { GeneratePackageOptions } from "./generate-package-object";
export { ReplaceOptions, ReplacePattern } from "./factory-replace";

/**
 * Options for plugin.
 *
 * @public
 */
export interface Options {
  /**
   * Copy assets to output directory.
   */
  copyAssets?: CopyAssetsOptions;
  /**
   * Copy assets to output directory.
   *
   * @deprecated Use {@link Options.copyAssets} instead.
   */
  copyFiles?: CopyAssetsOptions;
  /**
   * Generate assets in each output directory.
   */
  generateAssets?: GenerateAssetsOptions;
  /**
   * Generate package.json in each output directory.
   */
  package?: boolean | GeneratePackageOptions;
  /**
   *  Replace text with regular expressions.
   */
  replace?: ReplaceOptions;
  /**
   * Be more verbose with messages when something unexpected happens.
   */
  verbose?: boolean;
  /**
   * Use generated banner in output files.
   */
  useBanner?: boolean;
}

/**
 * Options for copying assets.
 *
 * @public
 * @deprecated Use {@link CopyAssetsOptions} instead.
 */
export type CopyFilesOptions = CopyAssetsOptions;

/**
 * Options for package generation.
 *
 * @public
 * @deprecated Use {@link GeneratePackageOptions} instead.
 */
export type PackageOptions = GeneratePackageOptions;

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
  let transform: TransformHook | undefined;
  let started = false;

  // Replace text
  if (options.replace) {
    transform = replaceFactory(options.replace, verbose);
  }

  // Copy assets
  if (options.copyAssets || options.copyFiles) { // tslint:disable-line:deprecation
    const opts = (options.copyAssets || options.copyFiles) as CopyAssetsOptions; // tslint:disable-line:deprecation
    writeOuts.push(copyAssetsFactory(opts, verbose));
  }

  // Create assets
  if (options.generateAssets) {
    writeOuts.push(generateAssetsFactory(options.generateAssets, verbose));
  }

  // Generate package if options is truthy
  if (options.package) {
    const opts = typeof options.package === "object" ? options.package : {};
    writeOuts.push(generatePackageJsonFactory(opts));
  }

  // Add banner
  if (options.useBanner) {
    const pkg = generatePackageObject(typeof options.package === "object" ? options.package : undefined);
    intro = () => `/**
* ${pkg.description || ""}
*
* @package ${pkg.name || "<unknown>"}
* @version ${pkg.version || "0.0.0"}
* @homepage ${pkg.homepage || "none"}
* @license ${pkg.license || "unlicensed"}
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
    transform,
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
