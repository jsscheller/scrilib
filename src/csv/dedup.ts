import qsv from "file:@jspawn/qsv-wasm/qsv.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";

export type Input = {
  /** The CSV file to deduplicate. */
  csv: File;
};

/** Remove deduplicate rows from a CSV file. */
export async function main(input: Input): Promise<File> {
  const { venv, paths } = await initVirtualEnv({ csv: input.csv });

  const out = outPath(input.csv, { suffix: "-dedup" });
  await venv.run(qsv, ["extdedup", paths.csv, out]);

  return readFile(out, venv);
}
