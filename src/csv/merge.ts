/**
 * Merge CSV files.
 *
 * ### Examples
 *
 * Join CSV files by column.
 *
 * ```
 * {
 *   "csvs": [
 *     { "$file": "/assets/us-states.csv" },
 *     { "$file": "/assets/sample.csv" }
 *   ],
 *   "merge": {
 *     "type": "Column"
 *   }
 * }
 * ```
 *
 * Join CSV files by row.
 *
 * ```
 * {
 *   "csvs": [
 *     { "$file": "/assets/sample.csv" },
 *     { "$file": "/assets/sample.csv" }
 *   ],
 *   "merge": {
 *     "type": "Row"
 *   }
 * }
 * ```
 *
 * @module
 */

import qsv from "file:@jspawn/qsv-wasm/qsv.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";

export type Input = {
  /** The CSV files to merge. */
  csvs: File[];
  merge: MergeU;
};

export type MergeU = ColumnMerge | RowMerge;

export const enum Merge {
  Column = "Column",
  Row = "Row",
}

/** Join by columns - making the resulting file "wider". The number of rows in the output is the maximum number of rows across all input files */
export type ColumnMerge = {
  type: Merge.Column;
  /** Use this option to truncate the resulting rows to the minimum number of rows across all input files. */
  truncate: boolean;
};

/** Join by rows - making the resulting file "taller". The order of columns/rows in the result depends on the order of the input files. */
export type RowMerge = {
  type: Merge.Row;
  /** Use this option if your input files do not have headers. Enabling this option requires all input files have the same number of columns. */
  no_headers?: boolean;
};

export async function main(input: Input): Promise<File> {
  if (input.csvs.length === 0) {
    throw "expected at least one input file";
  }

  const { venv, paths } = await initVirtualEnv({
    ...input.csvs.reduce((acc: { [path: string]: File }, csv, index) => {
      acc[`audio${index}`] = csv;
      return acc;
    }, {}),
  });
  const csvs = Object.values(paths);

  let args = ["cat"];
  switch (input.merge.type) {
    case Merge.Column:
      args.push("columns");
      if (!input.merge.truncate) {
        args.push("--pad");
      }
      break;
    case Merge.Row:
      if (input.merge.no_headers) {
        args.push("rows", "--no-headers");
      } else {
        args.push("rowskey");
      }
      break;
  }
  args = args.concat(csvs);

  const out = outPath(input.csvs[0], { suffix: "-merged" });
  args.push("--output", out);

  await venv.run(qsv, args);

  return readFile(out, venv);
}
