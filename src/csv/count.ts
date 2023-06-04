import qsv from "file:@jspawn/qsv-wasm/qsv.wasm";
import { initVirtualEnv } from "../util.js";

export type Input = {
  /** The CSV file to count. */
  csv: File;
  /** The first row is assumed to be headers - enable this option to include the first row in the count. */
  no_headers?: boolean;
};

/** Count the number of records in a CSV file. The count does not include the header row by default. */
export async function main(input: Input): Promise<integer> {
  const { venv, paths } = await initVirtualEnv({ csv: input.csv });

  const args = ["count", paths.csv];
  if (input.no_headers) {
    args.push("--no-headers");
  }
  const output = await venv.run(qsv, args);

  return parseInt(output.stdout);
}
