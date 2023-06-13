/**
 * Sort the rows in a CSV.
 *
 * ### Examples
 *
 * Sort a CSV by a single column.
 *
 * ```
 * {
 *   "csv": { "$file": "/assets/sample.csv" },
 *   "sort": {
 *     "type": "Numeric",
 *     "sort_columns": "1",
 *     "reverse": true
 *   }
 * }
 * ```
 *
 * @module
 */

import qsv from "file:@jspawn/qsv-wasm/qsv.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";
import { parseColumnSelection } from "./shared.js";

export type Input = {
  /** The CSV file to sort. */
  csv: File;
  sort: SortU;
  /** Set to `true` to include the first row in the sort. */
  no_headers?: boolean;
};

export type SortU = AlphabeticSort | NumericSort | RandomSort;

export const enum Sort {
  Alphabetic = "Alphabetic",
  Numeric = "Numeric",
  Random = "Random",
}

/** Sort rows in alphabetic order. */
export type AlphabeticSort = {
  type: Sort.Alphabetic;
  /** Select the column(s) to use when sorting - specified using [column-selection syntax](./#column-selection-syntax). */
  sort_columns?: string;
  /** Disregard case when comparing. */
  ignore_case?: boolean;
  /** Rows are in ascending order (A to Z) by default, set to `true` for descending order (Z to A). */
  reverse?: boolean;
};

/** Sort rows in numeric order. */
export type NumericSort = {
  type: Sort.Numeric;
  /** Select the column(s) to use when sorting - specified using [column-selection syntax](./#column-selection-syntax). */
  sort_columns?: string;
  /** Rows are in ascending order (1 to 9) by default, set to `true` for descending order (9 to 1). */
  reverse?: boolean;
};

/** Sort rows in random order. */
export type RandomSort = {
  type: Sort.Random;
};

export async function main(input: Input): Promise<File> {
  const { venv, paths } = await initVirtualEnv({ csv: input.csv });

  const out = outPath(input.csv, { suffix: "-sorted" });

  const args = ["sort", "--output", out];

  if (input.no_headers) {
    args.push("--no-headers");
  }

  switch (input.sort.type) {
    case Sort.Alphabetic:
    case Sort.Numeric:
      if (input.sort.sort_columns) {
        const sel = await parseColumnSelection(
          input.sort.sort_columns,
          paths.csv,
          venv,
          false
        );
        args.push("--select", sel);
      }
      if (input.sort.type === Sort.Alphabetic && input.sort.ignore_case) {
        args.push("--ignore-case");
      }
      if (input.sort.reverse) {
        args.push("--reverse");
      }
      if (input.sort.type === Sort.Numeric) {
        args.push("--numeric");
      }
      break;
    case Sort.Random:
      args.push("--random");
      break;
  }

  args.push(paths.csv);

  await venv.run(qsv, args);

  return readFile(out, venv);
}
