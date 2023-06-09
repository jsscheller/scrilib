/**
 * Convert images to PDFs.
 *
 * ### Examples
 *
 * Convert an image to a PDF.
 *
 * ```
 * {
 *   "images": [{ "$file": "/assets/tree.jpg" }]
 * }
 * ```
 *
 * Convert an image to a searchable PDF.
 *
 * ```
 * {
 *   "images": [{ "$file": "/assets/tree.jpg" }],
 *   "searchable": true
 * }
 * ```
 *
 * Convert multiple images to a single PDF.
 *
 * ```
 * {
 *   "images": [
 *     { "$file": "/assets/tree.jpg" },
 *     { "$file": "/assets/cat.png" }
 *   ],
 *   "single_pdf": true
 * }
 * ```
 *
 * @module
 */

import tesseract from "file:@jspawn/tesseract-wasm/tesseract.wasm";
import qpdf from "file:@jspawn/qpdf-wasm/qpdf.wasm";
import pdfr from "file:@jspawn/pdfr-wasm/pdfr.wasm";
import { initVirtualEnv, outPath, readFile } from "../util.js";
import traineddata from "file:../../assets/eng.traineddata";
import tessdata from "dir:@jspawn/tesseract-wasm/tessdata";

export type Input = {
  /** The image(s) to convert. Supported image formats: `PNG`, `JPG`. */
  images: File[];
  /**
   * Dots-per-inch - really only relevant if you intend to print the PDF file.
   */
  dpi?: integer;
  /**
   * Use OCR (optical character recognition) to overlay a text layer on your image(s) which allows
   * the resulting PDF to be searchable. Only english is supported at this time.
   */
  searchable?: boolean;
  /**
   * Combine images into a single PDF with multiple pages. By default, a single-page PDF is created
   * for each image.
   */
  single_pdf?: boolean;
};

export async function main(input: Input): Promise<File[]> {
  const { images } = input;
  if (images.length === 0) {
    return [];
  }

  const dpi = input.dpi || 72;

  const { venv, paths } = await initVirtualEnv({
    tessdata: {
      ...tessdata,
      "eng.traineddata": traineddata,
    },
    ...images.reduce((acc: { [path: string]: File }, image, index) => {
      acc[`image${index}`] = image;
      return acc;
    }, {}),
  });

  let pdfs = [];

  const singleOut = outPath(images[0], {
    ext: "pdf",
    suffix: "-single",
  });

  if (input.searchable) {
    for (const [pos, file] of images.entries()) {
      const out = outPath(file, {
        suffix: `-${pos}`,
        ext: "pdf",
      });
      await venv.run(tesseract, [
        "--tessdata-dir",
        "./tessdata",
        paths[`image${pos}`],
        out.replace(/.pdf$/, ""),
        "-l",
        "eng",
        "--dpi",
        dpi.toString(),
        "pdf",
      ]);
      pdfs.push(out);
    }
    if (input.single_pdf && pdfs.length > 1) {
      const pages = [];
      pages.push(pdfs[0], "--pages", ".", "1-z");
      for (const path of pdfs.slice(1)) {
        pages.push(path, "1-z");
      }
      await venv.run(qpdf, ["--warning-exit-0", ...pages, "--", singleOut]);
      pdfs = [singleOut];
    }
  } else {
    if (input.single_pdf) {
      await venv.run(pdfr, [
        "create",
        `--dpi=${dpi}`,
        ...images.map((_, index) => `--image=${paths["image" + index]}`),
        singleOut,
      ]);
      pdfs = [singleOut];
    } else {
      for (const [pos, _] of images.entries()) {
        const filePath = paths[`image${pos}`];
        const out = outPath(filePath, {
          suffix: `-${pos}`,
          ext: "pdf",
        });
        await venv.run(pdfr, [
          "create",
          `--dpi=${dpi}`,
          `--image=${filePath}`,
          out,
        ]);
        pdfs.push(out);
      }
    }
  }

  const files = [];
  for (const pdf of pdfs) {
    files.push(await readFile(pdf, venv));
  }
  return files;
}
