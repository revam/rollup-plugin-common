import { OutputBundle, PluginContext } from "rollup";

export type WriteBundleFunction = (this: PluginContext, bundle: OutputBundle, outputFolder: string) => void | Promise<void>;

export const enum ErrorCodes {
  Exists = "ERR_ASSET_EXISTS",
  Directory = "ERR_DIRECTORY_EXPECTED",
  NoDirectory = "ERR_NO_DIRECTORY_EXPECTED",
  NotFound = "ERR_NOT_FOUND",
  Unsupported = "ERR_UNSUPPORTED",
}
