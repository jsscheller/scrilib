import qsv from "file:@jspawn/qsv-wasm/qsv.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";
import { parseColumnSelection } from "./shared.js";

export type Input = {
  /** The CSV file to fill. */
  csv: File;
  fill: FillU;
  /**
   * The column(s) to fill - defaults to all columns.
   *
   * Examples:
   *
   * |  |  |
   * | --- | --- |
   * | `1,4` | first and fourth column |
   * | `1..4` | columns 1 through 4 |
   * | `4..1` | columns 4 through 1 |
   * | `!1..2` | all columns expect the first two |
   * | `Foo` | columns named `Foo` |
   * | `/foo/i` | columns containing `foo` (ignoring case) |
   */
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

/** Fill empty values in a CSV. */
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
