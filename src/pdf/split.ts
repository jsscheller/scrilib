import qpdf from "file:@jspawn/qpdf-wasm/qpdf.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";
import type {
  Input as PickerInput,
  Output as PickerOutput,
} from "../picker/pdfPages/index.js";
import { simplifyPageSelection, parsePageSelection } from "./shared.js";

export type Input = {
  /** The PDF to split. */
  pdf: File;
  split: SplitU;
};

export type SplitU = FixedSplit | CustomSplit;

export const enum SplitMethod {
  Fixed = "Fixed",
  Custom = "Custom",
}

/** Split using chunks of fixed size. */
export type FixedSplit = {
  type: SplitMethod.Fixed;
  /** The number of pages in each chunk. */
  chunk_size: integer;
};

/** Specify the pages for each chunk. */
export type CustomSplit = {
  type: SplitMethod.Custom;
  /**
   * Specify pages for each chunk.
   *
   * - A number preceded by `r` counts from the end, so `r1` is the last page, `r2` is the second-to-last page, etc.
   * - The letter `z` represents the last page and is the same as `r1`.
   *
   * Examples:
   *
   * |  |  |
   * | --- | --- |
   * | `1,6,4` | pages 1, 6, and 4 |
   * | `3..7` | pages 3 through 7 inclusive |
   * | `7..3` | pages 7, 6, 5, 4, and 3 |
   * | `1..-1` | all pages |
   * | `1,3,5..9,15..12` | pages 1, 3, 5, 6, 7, 8, 9, 15, 14, 13, and 12 |
   * | `-1` | the last page |
   * | `-1..-3` | the last three pages |
   * | `5,7..9,12` | pages 5, 7, 8, 9, and 12 |
   *
   * {@picker pdfPages map_input=map_picker_input map_output=map_picker_output}
   */
  chunks: string[];
};

/** Split a single PDF into multiple PDFs. */
export async function main(input: Input): Promise<File[]> {
  const { venv, paths } = await initVirtualEnv({ pdf: input.pdf });

  const { split } = input;
  const chunks = [];
  switch (split.type) {
    case SplitMethod.Fixed: {
      const output = await venv.run(qpdf, [
        "--warning-exit-0",
        paths.pdf,
        "--show-npages",
      ]);
      const pageCount = parseInt(output.stdout);
      for (let i = 1; i <= pageCount; i += split.chunk_size) {
        const end = Math.min(pageCount, i + split.chunk_size - 1);
        if (i !== end) {
          chunks.push(`${i}-${end}`);
        } else {
          chunks.push(i.toString());
        }
      }
      break;
    }
    case SplitMethod.Custom:
      for (const chunk of split.chunks) {
        const sel = await parsePageSelection(chunk, paths.pdf, venv);
        chunks.push(sel);
      }
      break;
  }

  const pdfs = [];
  for (const [index, chunk] of chunks.entries()) {
    const out = outPath(paths.pdf, { suffix: `-${index + 1}` });
    await venv.run(qpdf, [
      "--warning-exit-0",
      paths.pdf,
      "--pages",
      ".",
      chunk,
      "--",
      out,
    ]);
    pdfs.push(await readFile(out, venv));
  }

  return pdfs;
}

export async function map_picker_input(pdf: File): Promise<PickerInput> {
  return {
    pdfs: [pdf],
    allow_move: true,
    allow_remove: true,
    allow_split: true,
  };
}

export async function map_picker_output(
  output: PickerOutput
): Promise<string[]> {
  return output.pdfs.map((pdf) => {
    return simplifyPageSelection(pdf.pages.map((x) => x.page));
  });
}
