/**
 * Fill empty values in a CSV.
 *
 * ### Examples
 *
 * Fill empty values in a CSV.
 *
 * ```
 * {
 *   "csv": { "$file": "/assets/us-states.csv" },
 *   "fill": {
 *     "type": "MostRecent"
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
  /** The CSV file to fill. */
  csv: File;
  fill: FillU;
  /** Specify the column(s) to fill using [column-selection syntax](./#column-selection-syntax) - defaults to all columns. */
  columns?: string;
  /** Set to `true` to consider the first row when filling. */
  no_headers?: boolean;
};

export type FillU = MostRecentFill | FirstFill | StaticFill;

export const enum Fill {
  MostRecent = "MostRecent",
  First = "First",
  Static = "Static",
}

/** Fill empty values using the last seen, non-empty value. */
export type MostRecentFill = {
  type: Fill.MostRecent;
  /** Set to `true` to backfill empty values at the start of the column with the first, non-empty value. */
  backfill?: boolean;
};

/** Fill empty values using the first, non-empty value. */
export type FirstFill = {
  type: Fill.First;
  /** Set to `true` to backfill empty values at the start of the column with the first, non-empty value. */
  backfill?: boolean;
};

/** Fill empty values using a static value. */
export type StaticFill = {
  type: Fill.Static;
  value: string;
};

export async function main(input: Input): Promise<File> {
  const { venv, paths } = await initVirtualEnv({ csv: input.csv });

  const out = outPath(input.csv, { suffix: "-filled" });

  const args = ["fill", "--output", out];

  if (input.no_headers) {
    args.push("--no-headers");
  }

  switch (input.fill.type) {
    case Fill.MostRecent:
    case Fill.First:
      if (input.fill.backfill) {
        args.push("--backfill");
      }
      if (input.fill.type === Fill.First) {
        args.push("--first");
      }
      break;
    case Fill.Static:
      args.push("--default", input.fill.value);
      break;
  }

  const sel = await parseColumnSelection(
    input.columns || "1..-1",
    paths.csv,
    venv,
    false
  );
  args.push(sel, paths.csv);

  await venv.run(qsv, args);

  return readFile(out, venv);
}
