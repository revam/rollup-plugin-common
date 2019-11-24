import { OutputBundle, OutputChunk } from "rollup";

import { generatePackageObject, GeneratePackageOptions } from "./generate-package-object";
import { WriteBundleFunction } from "./main.private";
import { write } from "./package";

export default function generatePackageJsonFactory(opts: GeneratePackageOptions): WriteBundleFunction {
  const pkgIn = generatePackageObject(opts);
  const depTypes = ["dependencies", "peerDependencies", "optionalDependencies"].filter((d) => d in pkgIn);
  const depExtra = opts.dependencies instanceof Array ? opts.dependencies : undefined;
  return (bundle, outputFolder) => {
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
    const pkgOut = { ...pkgIn, ...depObj };
    write(outputFolder, pkgOut);
  };
}

function* chunksOfBundle(bundle: OutputBundle): IterableIterator<OutputChunk> {
  for (const value of Object.values(bundle)) {
    if (value.type === "chunk") {
      yield value;
    }
  }
}
