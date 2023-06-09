/**
 * Update a CSV so each record has the same number of columns - accomplished by inserting empty values.
 *
 * ### Examples
 *
 * Pad a CSV to have matching column lengths.
 *
 * ```
 * {
 *   "csv": { "$file": "/assets/sample.csv" },
 *   "length": 4
 * }
 * ```
 *
 * @module
 */

import qsv from "file:@jspawn/qsv-wasm/qsv.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";

export type Input = {
  /** The CSV file to pad. */
  csv: File;
  /** The length of the longest record is used by default. Specify a length to force a specific number of columns. */
  length?: integer;
};

export async function main(input: Input): Promise<File> {
  const { venv, paths } = await initVirtualEnv({ csv: input.csv });

  const out = outPath(input.csv, { suffix: "-padded" });

  const args = ["fixlengths", "--output", out];

  if (input.length) {
    args.push("--length", input.length.toString());
  }

  args.push(paths.csv);

  await venv.run(qsv, args);

  return readFile(out, venv);
}
