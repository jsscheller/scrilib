import qsv from "file:@jspawn/qsv-wasm/qsv.wasm";
import { initVirtualEnv, readFile } from "../util.js";
import { parseColumnSelection } from "./shared.js";

export type Input = {
  first: DiffFile;
  second: DiffFile;
  /**
   * The column(s) used to uniquely identify a record - defaults to the first column. This matters when determining if a record was modified or deleted.
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
  key_columns?: string;
  /**
   * Optionally specify column(s) to use when sorting the final results.
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
  sort_columns?: string;
};

export type DiffFile = {
  csv: File;
  /** When set to `true`, the first row will be considered when diffing. */
  no_headers?: boolean;
};

/** Determine differences between two CSV files. */
export async function main(input: Input): Promise<File> {
  const { venv, paths } = await initVirtualEnv({
    first: input.first.csv,
    second: input.second.csv,
  });

  const out = "diff.csv";
  const args = ["diff", "--output", out];
  if (input.first.no_headers) {
    args.push("--no-headers-left");
  }
  if (input.second.no_headers) {
    args.push("--no-headers-right");
  }
  if (input.sort_columns) {
    const sel = await parseColumnSelection(
      input.sort_columns,
      paths.first,
      venv
    );
    args.push("--sort-columns", sel);
  }
  if (input.key_columns) {
    const sel = await parseColumnSelection(
      input.key_columns,
      paths.first,
      venv
    );
    args.push("--key", sel);
  }
  args.push(paths.first, paths.second);
  await venv.run(qsv, args);

  return readFile(out, venv);
}
