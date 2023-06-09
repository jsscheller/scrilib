/**
 * Reduce the size of a PDF.
 *
 * ### Examples
 *
 * Compress a PDF.
 *
 * ```
 * {
 *   "pdf": { "$file": "/assets/sample.pdf" }
 * }
 * ```
 *
 * @module
 */

import qpdf from "file:@jspawn/qpdf-wasm/qpdf.wasm";
import gs from "file:@jspawn/ghostscript-wasm/gs.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";

export type Input = {
  /** PDF file to compress. */
  pdf: File;
};

export async function main(input: Input): Promise<File> {
  const { venv, paths } = await initVirtualEnv({ pdf: input.pdf });

  const gsOut = outPath(paths.pdf, { suffix: "-gs" });
  await venv.run(gs, [
    // https://ghostscript.com/doc/current/VectorDevices.htm
    "-o",
    gsOut,
    "-sDEVICE=pdfwrite",
    "-dPDFSETTINGS=/screen",
    "-dColorImageResolution=100",
    "-dGrayImageResolution=100",
    "-dMonoImageResolution=100",
    "-dCompatibilityLevel=1.4",
    "-dConvertCMYKImagesToRGB=true",
    "-c",
    "<</AlwaysEmbed [ ]>> setdistillerparams",
    "-c",
    "<</NeverEmbed [ /Courier /Courier-Bold /Courier-Oblique /Courier-BoldOblique /Helvetica /Helvetica-Bold /Helvetica-Oblique /Helvetica-BoldOblique /Times-Roman /Times-Bold /Times-Italic /Times-BoldItalic /Symbol /ZapfDingbats /Arial ]>> setdistillerparams",
    "-f",
    paths.pdf,
  ]);

  const out = outPath(paths.pdf, { suffix: "-compressed" });
  await venv.run(qpdf, [
    // https://qpdf.readthedocs.io/en/latest/cli.html
    gsOut,
    "--object-streams=generate",
    "--compression-level=9",
    "--recompress-flate",
    "--optimize-images",
    out,
  ]);

  return readFile(out, venv);
}
