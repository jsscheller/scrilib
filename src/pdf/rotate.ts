/**
 * Rotate pages in a PDF.
 *
 * ### Examples
 *
 * Rotate all pages in a PDF by 90 degrees.
 *
 * ```
 * {
 *   "pdf": { "$file": "/assets/sample.pdf" },
 *   "rotations": [{
 *     "angle": 90,
 *     "relative": true
 *   }]
 * }
 * ```
 *
 * Set the rotation of the last page to 180 degrees.
 *
 * ```
 * {
 *   "pdf": { "$file": "/assets/sample.pdf" },
 *   "rotations": [{
 *     "select": { "pages": "-1" },
 *     "angle": 180
 *   }]
 * }
 * ```
 *
 * Rotate the even pages of a PDF by 90 degrees.
 *
 * ```
 * {
 *   "pdf": { "$file": "/assets/sample.pdf" },
 *   "rotations": [{
 *     "select": { "even": true },
 *     "angle": 90,
 *     "relative": true
 *   }]
 * }
 * ```
 *
 * @module
 */

import qpdf from "file:@jspawn/qpdf-wasm/qpdf.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";
import type {
  Input as PickerInput,
  Output as PickerOutput,
} from "../picker/pdfPages/index.js";
import { simplifyPageSelection, parsePageSelectionArray } from "./shared.js";
import { VirtualEnv } from "@jspawn/jspawn";

export type Input = {
  /** The PDF to rotate. */
  pdf: File;
  /** {@picker pdfPages map_input=map_rotations_picker_input map_output=map_rotations_picker_output} */
  rotations: PageRotation[];
};

export type PageRotation = {
  select?: PageSelection;
  /** Rotation angle in degrees. */
  angle: integer;
  /** Rotate the page relative to its current rotation. */
  relative?: boolean;
};

export type PageSelection = {
  /**
   * Specify page(s) to rotate using [page-selection syntax](./#page-selection-syntax) - leave blank to select all pages.
   *
   * {@picker pdfPages map_input=map_pages_picker_input map_output=map_pages_picker_output}
   */
  pages?: string;
  /** Set to `true` to select just the even pages. */
  even?: boolean;
  /** Set to `true` to select just the odd pages. */
  odd?: boolean;
};

export async function main(input: Input): Promise<File> {
  const { venv, paths } = await initVirtualEnv({ pdf: input.pdf });

  const rotateArgs = [];
  for (const rot of input.rotations) {
    const relative = rot.relative ? "+" : "";
    const sel = await parseSelection(rot.select, paths.pdf, venv);
    rotateArgs.push(`--rotate=${relative}${normAngle(rot.angle)}:${sel}`);
  }

  const out = outPath(paths.pdf, { suffix: "-rotated" });

  await venv.run(qpdf, [
    paths.pdf,
    "--pages",
    ".",
    "1-z",
    "--",
    out,
    ...rotateArgs,
  ]);

  return readFile(out, venv);
}

async function parseSelection(
  sel: PageSelection = {},
  path: string,
  venv: VirtualEnv
): Promise<string> {
  let pages = await parsePageSelectionArray(sel.pages || "1..-1", path, venv);

  if (sel.even) {
    pages = pages.filter((x) => x % 2 === 0);
  } else if (sel.odd) {
    pages = pages.filter((x) => x % 2 !== 0);
  }

  return pages.join(",");
}

function normAngle(deg: number): number {
  deg = deg % 360;
  if (deg < 0) deg += 360;
  return deg;
}

export async function map_rotations_picker_input({
  pdf,
}: {
  pdf: File;
}): Promise<PickerInput> {
  return {
    pdfs: [pdf],
    allow_rotate: true,
  };
}

export async function map_rotations_picker_output({
  output,
}: {
  output: PickerOutput;
}): Promise<PageRotation[]> {
  const grouped: { [key: string]: number[] } = {};
  for (const page of output.pdfs[0].pages) {
    if (page.rotate != null) {
      let group = grouped[page.rotate];
      if (!group) {
        group = grouped[page.rotate.toString()] = [];
      }
      group.push(page.page);
    }
  }
  const rotations = [];
  for (const [angle, pages] of Object.entries(grouped)) {
    rotations.push({
      pages: simplifyPageSelection(pages),
      angle: parseInt(angle),
      relative: false,
    });
  }
  return rotations;
}

export async function map_pages_picker_input({
  pdf,
}: {
  pdf: File;
}): Promise<PickerInput> {
  return {
    pdfs: [pdf],
    allow_select: true,
  };
}

export async function map_pages_picker_output({
  output,
}: {
  output: PickerOutput;
}): Promise<string> {
  return simplifyPageSelection(output.pdfs[0]!.pages.map((x) => x.page));
}
