/**
 * Calculate the frequency of data in a CSV.
 *
 * ### Examples
 *
 * Sort a CSV by a single column.
 *
 * ```
 * {
 *   "csv": { "$file": "/assets/us-states.csv" },
 *   "select": "/tax/i"
 * }
 * ```
 *
 * @module
 */

import qsv from "file:@jspawn/qsv-wasm/qsv.wasm";
import { initVirtualEnv } from "../util.js";
import { parseColumnSelection } from "./shared.js";

export type Input = {
  /** The CSV file to analyze. */
  csv: File;
  /** Select a subset of columns to analyze using [column-selection syntax](./#column-selection-syntax) - all columns are analyzed by default. */
  select?: string;
  /** Limit the output to a fixed number of values per column. Defaults to `10`. */
  limit?: integer;
  /** Sort the results in ascending order instead of descending. */
  ascending?: boolean;
  /** Set to `true` if your CSV has no headers - columns will be identified by their index instead of name. */
  no_headers?: boolean;
};

export type Frequency = {
  column: string;
  value: string;
  count: integer;
};

export async function main(input: Input): Promise<Frequency[]> {
  const { venv, paths } = await initVirtualEnv({ csv: input.csv });

  const out = "freq.csv";
  const args = ["frequency", "--output", out];

  args.push("--limit", (input.limit || 10).toString());

  if (input.select) {
    const sel = await parseColumnSelection(
      input.select,
      paths.csv,
      venv,
      false
    );
    args.push("--select", sel);
  }

  if (input.ascending) {
    args.push("--asc");
  }

  if (input.no_headers) {
    args.push("--no-headers");
  }

  args.push(paths.csv);

  await venv.run(qsv, args);

  const output = await venv.run(qsv, ["flatten", out]);

  const lines = output.stdout.split("\n");
  const freq = [];
  for (let i = 0; i < lines.length; i += 4) {
    freq.push({
      column: lines[i].slice("field".length + 2),
      value: lines[i + 1].slice("value".length + 2),
      count: parseInt(lines[i + 2].slice("count".length + 2)),
    });
  }
  return freq;
}
