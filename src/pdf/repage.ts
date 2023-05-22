import { VirtualEnv } from "@jspawn/jspawn";
import qpdf from "file:@jspawn/qpdf-wasm/qpdf.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";
import type {
  Input as PickerInput,
  Output as PickerOutput,
} from "../picker/pdfPages/index.js";
import {
  simplifyPageSelection,
  parsePageSelection,
  Filter,
  getPageCount,
} from "./shared.js";

export type Input = {
  /** The PDF to update. */
  pdf: File;
  repage: RepageU;
};

export type RepageU = RepageKeep | RepageRemove | RepageReverse | RepageCustom;

export const enum Repage {
  Keep = "Keep",
  Remove = "Remove",
  Reverse = "Reverse",
  Custom = "Custom",
}

/** Specify the pages to keep. */
export type RepageKeep = {
  type: Repage.Keep;
  pages: PagesU;
};

/** Specify the pages to remove. */
export type RepageRemove = {
  type: Repage.Remove;
  pages: PagesU;
};

/** Reverse page order. */
export type RepageReverse = {
  type: Repage.Reverse;
};

/** Specify a custom order/selection. */
export type RepageCustom = {
  type: Repage.Custom;
  /**
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
  pages: string;
};

export type PagesU = PagesEven | PagesOdd | PagesFirst | PagesLast;

export const enum Pages {
  Even = "Even",
  Odd = "Odd",
  First = "First",
  Last = "Last",
}

/** Select even pages. */
export type PagesEven = {
  type: Pages.Even;
};

/** Select odd pages. */
export type PagesOdd = {
  type: Pages.Odd;
};

/** Select the first `page_count` page(s). */
export type PagesFirst = {
  type: Pages.First;
  page_count: integer;
};

/** Select the last `page_count` page(s). */
export type PagesLast = {
  type: Pages.Last;
  page_count: integer;
};

/** Remove and reorder pages in a PDF. */
export async function main(input: Input): Promise<File> {
  const { venv, paths } = await initVirtualEnv({ pdf: input.pdf });

  const { repage } = input;
  let pages;
  switch (repage.type) {
    case Repage.Keep:
      pages = await parsePages(repage.pages, paths.pdf, true, venv);
      break;
    case Repage.Remove:
      pages = await parsePages(repage.pages, paths.pdf, false, venv);
      break;
    case Repage.Reverse:
      pages = "z-1";
      break;
    case Repage.Custom:
      pages = await parsePageSelection(repage.pages, paths.pdf, venv);
      break;
  }

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

async function parsePages(
  pages: PagesU,
  path: string,
  keep: boolean,
  venv: VirtualEnv
): Promise<string> {
  let sel, filter;
  if (keep) {
    switch (pages.type) {
      case Pages.Even:
        sel = "1..-1";
        filter = Filter.Even;
        break;
      case Pages.Odd:
        sel = "1..-1";
        filter = Filter.Odd;
        break;
      case Pages.First:
        sel = `1..${pages.page_count}`;
        break;
      case Pages.Last:
        sel = `-${pages.page_count}..-1`;
        break;
    }
  } else {
    let pageCount;
    switch (pages.type) {
      case Pages.Even:
        sel = "1..-1";
        filter = Filter.Odd;
        break;
      case Pages.Odd:
        sel = "1..-1";
        filter = Filter.Even;
        break;
      case Pages.First:
        pageCount = await getPageCount(path, venv);
        sel = `${pageCount - pages.page_count}..-1`;
        break;
      case Pages.Last:
        pageCount = await getPageCount(path, venv);
        sel = `1..${pageCount - pages.page_count}`;
        break;
    }
  }

  return parsePageSelection(sel, path, venv, filter);
}

export async function map_picker_input({
  pdf,
}: {
  pdf: File;
}): Promise<PickerInput> {
  return {
    pdfs: [pdf],
    allow_move: true,
    allow_remove: true,
  };
}

export async function map_picker_output({
  output,
}: {
  output: PickerOutput;
}): Promise<string> {
  return simplifyPageSelection(output.pdfs[0]!.pages.map((x) => x.page));
}
