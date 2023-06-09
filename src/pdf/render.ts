/**
 * Convert PDF to image - only JPEG supported at this time.
 *
 * ### Examples
 *
 * Render each page of a PDF to an image.
 *
 * ```
 * {
 *   "pdf": { "$file": "/assets/sample.pdf" }
 * }
 * ```
 *
 * @module
 */

import pdfr from "file:@jspawn/pdfr-wasm/pdfr.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";
import type {
  Input as PickerInput,
  Output as PickerOutput,
} from "../picker/pdfPages/index.js";
import { simplifyPageSelection, parsePageSelection } from "./shared.js";

export type Input = {
  /** The PDF to convert. */
  pdf: File;
  /**
   * Optionally specify the pages to render using [page-selection syntax](./#page-selection-syntax) - all pages are rendered by default.
   *
   * {@picker pdfPages map_input=map_picker_input map_output=map_picker_output}
   */
  pages?: string;
  /** Render-quality for the extracted images. A value from 0 (worst quality/smallest size) to 100 (best quality/largest size). Defaults to `92`. */
  quality?: integer;
  width?: integer;
  /**
   * The width/height of the resulting image(s) in pixels. By default, the pages are rendered at a DPI of 300. Specifying just one of `width/height` will maintain the aspect ratio of the page.
   * **Note**: Values are automatically rounded-down to a multiple of 4.
   */
  height?: integer;
};

export async function main(input: Input): Promise<File[]> {
  const { venv, paths } = await initVirtualEnv({ pdf: input.pdf });

  const outDir = outPath("out");
  const opts = [`--quality=${input.quality || 92}`];
  if (input.width || input.height) {
    const size = [mul4(input.width), "x", mul4(input.height)]
      .filter((x) => !!x)
      .join("");
    opts.push(`--size=${size}`);
  }
  if (input.pages) {
    const sel = await parsePageSelection(input.pages, paths.pdf, venv);
    opts.push(`--pages=${sel}`);
  }

  await venv.run(pdfr, ["render", ...opts, paths.pdf, outDir]);

  const images = [];
  for (const name of await venv.fs.readdir(outDir)) {
    images.push(await readFile(`${outDir}/${name}`, venv));
  }
  return images;
}

function mul4(n: any) {
  if (isNaN(n)) return;
  return Math.floor(n / 4) * 4;
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
