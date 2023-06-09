/**
 * View and search PDFs.
 *
 * @module
 */

import "file:./index.html";
import "file:pdfjs-dist/build/pdf.js";
import "file:pdfjs-dist/build/pdf.worker.js";
import "dir:pdfjs-dist/standard_fonts";
import "dir:pdfjs-dist/cmaps";
import "file:./viewer.css";
import "file:./viewer.js";
import "dir:./images";
import "dir:./locale";
import "file:../../initListener.js";

export type Input = {
  pdf: File;
};

export async function init(input: Input) {
  const url = URL.createObjectURL(input.pdf);
  // @ts-ignore
  await globalThis["PDFViewerApplication"]["open"]({ url });
}
