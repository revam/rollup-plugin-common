import { OutputBundle, PluginContext } from "rollup";

export type WriteBundleFunction = (this: PluginContext, bundle: OutputBundle, outputFolder: string) => void | Promise<void>;

export const enum ErrorCodes {
  DirectoryExpected = "ERR_DIRECTORY_EXPECTED",
  FileExists = "ERR_FILE_EXISTS",
  FileExpected = "ERR_FILE_EXPECTED",
  NotFound = "ERR_NOT_FOUND",
  Unsupported = "ERR_UNSUPPORTED",
}
