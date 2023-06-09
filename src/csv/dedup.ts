/**
 * Remove deduplicate rows from a CSV file.
 *
 * ### Examples
 *
 * Remove deplicate rows from a CSV.
 *
 * ```
 * {
 *   "csv": { "$file": "/assets/us-states.csv" }
 * }
 * ```
 *
 * @module
 */

import qsv from "file:@jspawn/qsv-wasm/qsv.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";

export type Input = {
  /** The CSV file to deduplicate. */
  csv: File;
};

export async function main(input: Input): Promise<File> {
  const { venv, paths } = await initVirtualEnv({ csv: input.csv });

  const out = outPath(input.csv, { suffix: "-dedup" });
  await venv.run(qsv, ["extdedup", paths.csv, out]);

  return readFile(out, venv);
}
