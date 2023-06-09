/**
 * Remove and reorder pages in a PDF.
 *
 * ### Examples
 *
 * Remove the first 2 pages from a PDF.
 *
 * ```
 * {
 *   "pdf": { "$file": "/assets/sample.pdf" },
 *   "select": {
 *     "pages": "1..2"
 *   },
 *   "remove": true
 * }
 * ```
 *
 * Extract the first 2 pages of a PDF.
 *
 * ```
 * {
 *   "pdf": { "$file": "/assets/sample.pdf" },
 *   "select": {
 *     "pages": "1..2"
 *   }
 * }
 * ```
 *
 * Extract the last 2 pages of a PDF.
 *
 * ```
 * {
 *   "pdf": { "$file": "/assets/sample.pdf" },
 *   "select": {
 *     "pages": "-2..-1"
 *   }
 * }
 * ```
 *
 * Remove the last page from a PDF.
 *
 * ```
 * {
 *   "pdf": { "$file": "/assets/sample.pdf" },
 *   "select": {
 *     "pages": "-1"
 *   },
 *   "remove": true
 * }
 * ```
 *
 * Reverse the order of pages in a PDF.
 *
 * ```
 * {
 *   "pdf": { "$file": "/assets/sample.pdf" },
 *   "reverse": true
 * }
 * ```
 *
 * @module
 */

import { VirtualEnv } from "@jspawn/jspawn";
import qpdf from "file:@jspawn/qpdf-wasm/qpdf.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";
import type {
  Input as PickerInput,
  Output as PickerOutput,
} from "../picker/pdfPages/index.js";
import { simplifyPageSelection, parsePageSelectionArray } from "./shared.js";

export type Input = {
  /** The PDF to update. */
  pdf: File;
  select?: PageSelection;
  /** Set to `true` to remove the selected pages instead of keeping them. */
  remove?: boolean;
  /** Set to `true` to reverse the final page order. */
  reverse?: boolean;
};

export type PageSelection = {
  /**
   * Specify page(s) to select and the order in which they will appear using [page-selection syntax](./#page-selection-syntax) - leave blank to select all pages.
   *
   * {@picker pdfPages map_input=map_picker_input map_output=map_picker_output}
   */
  pages?: string;
  /** Set to `true` to select just the even pages. */
  even?: boolean;
  /** Set to `true` to select just the odd pages. */
  odd?: boolean;
};

export async function main(input: Input): Promise<File> {
  const { venv, paths } = await initVirtualEnv({ pdf: input.pdf });

  const pages = await parseSelection(
    input.select,
    paths.pdf,
    !!input.remove,
    !!input.reverse,
    venv
  );
  const out = outPath(paths.pdf, { suffix: "-repaged" });

  await venv.run(qpdf, [
    "--warning-exit-0",
    paths.pdf,
    "--pages",
    ".",
    pages,
    "--",
    out,
  ]);

  return readFile(out, venv);
}

async function parseSelection(
  sel: PageSelection = {},
  path: string,
  remove: boolean,
  reverse: boolean,
  venv: VirtualEnv
): Promise<string> {
  let pages = await parsePageSelectionArray(sel.pages || "1..-1", path, venv);

  if (sel.even) {
    pages = pages.filter((x) => x % 2 === 0);
  } else if (sel.odd) {
    pages = pages.filter((x) => x % 2 !== 0);
  }

  if (remove) {
    const allPages = await parsePageSelectionArray("1..-1", path, venv);
    for (const removePage of pages) {
      const index = allPages.indexOf(removePage);
      allPages.splice(index, 1);
    }
    pages = allPages;
  }

  if (reverse) {
    pages.reverse();
  }

  return pages.join(",");
}

export async function map_picker_input({
  pdf,
}: {
  pdf: File;
}): Promise<PickerInput> {
  return {
    pdfs: [pdf],
    allow_move: true,
    allow_select: true,
  };
}

export async function map_picker_output({
  output,
}: {
  output: PickerOutput;
}): Promise<string> {
  return simplifyPageSelection(output.pdfs[0]!.pages.map((x) => x.page));
}
