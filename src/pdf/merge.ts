import qpdf from "file:@jspawn/qpdf-wasm/qpdf.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";
import type {
  Input as PickerInput,
  Output as PickerOutput,
} from "../picker/pdfPages/index.js";
import { simplifyPageSelection, parsePageSelection } from "./shared.js";

export type Input = {
  /**
   * A list of PDF files to combine.
   *
   * For each chunk, specify the `pages` to select from the PDF (leave blank for all pages).
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
   * {@picker pdfPages map_input=map_chunks_picker_input map_output=map_chunks_picker_output}
   */
  chunks: Chunk[];
};

export type Chunk = {
  pdf: File;
  /** {@picker pdfPages map_input=map_pages_picker_input map_output=map_pages_picker_output} */
  pages?: string;
};

/** Combine PDFs into one. */
export async function main(input: Input): Promise<File> {
  const { chunks } = input;
  if (chunks.length === 0) {
    throw "expected at least one chunk";
  }

  const { venv, paths } = await initVirtualEnv({
    ...chunks.reduce((acc: { [path: string]: File }, chunk, index) => {
      acc[`pdf${index}`] = chunk.pdf;
      return acc;
    }, {}),
  });
  const pdfs = Object.values(paths);

  const pages = [];
  for (const [index, chunk] of chunks.entries()) {
    const path = pdfs[index];
    const sel = await parsePageSelection(chunk.pages || "1..-1", path, venv);
    if (index === 0) {
      pages.push(path, "--pages", ".", sel);
    } else {
      pages.push(path, sel);
    }
  }

  const out = outPath(pdfs[0], { suffix: "-merged" });
  await venv.run(qpdf, ["--warning-exit-0", ...pages, "--", out]);

  return readFile(out, venv);
}

export async function map_chunks_picker_input(): Promise<PickerInput> {
  return {
    pdfs: [],
    allow_insert: true,
    allow_move: true,
    allow_remove: true,
  };
}

export async function map_chunks_picker_output(
  output: PickerOutput
): Promise<Chunk[]> {
  const chunks: { pdf: File; pages: number[] }[] = [];
  for (const page of output.pdfs[0].pages) {
    let last = chunks[chunks.length - 1];
    if (!last || page.pdf !== last.pdf) {
      last = {
        pdf: page.pdf,
        pages: [],
      };
      chunks.push(last);
    }
    last!.pages.push(page.page);
  }
  return chunks.map((x) => ({
    pdf: x.pdf,
    pages: simplifyPageSelection(x.pages),
  }));
}

export async function map_pages_picker_input(pdf: File): Promise<PickerInput> {
  return {
    pdfs: [pdf],
    allow_move: true,
    allow_remove: true,
  };
}

export async function map_pages_picker_output(
  output: PickerOutput
): Promise<string> {
  return simplifyPageSelection(output.pdfs[0].pages.map((x) => x.page));
}
