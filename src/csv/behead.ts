import qsv from "file:@jspawn/qsv-wasm/qsv.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";

export type Input = {
  /** The CSV file to behead. */
  csv: File;
};

/** Remove the header from a CSV. */
export async function main(input: Input): Promise<File> {
  const { venv, paths } = await initVirtualEnv({ csv: input.csv });

  const out = outPath(input.csv, { suffix: "-headless" });
  await venv.run(qsv, ["behead", paths.csv, "--output", out]);

  return readFile(out, venv);
}
