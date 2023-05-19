import pdfr from "file:@jspawn/pdfr-wasm/pdfr.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";

export type Input = {
  /** A PDF file with images. */
  pdf: File;
  /** Render-quality for the extracted images. A value from 0 (worst quality/smallest size) to 100 (best quality/largest size). Defaults to `92`. */
  quality?: integer;
  /** Only extract images with a width greater than or equal to `min_width` (in pixels). */
  min_width?: integer;
  /** Only extract images with a height greater than or equal to `min_height` (in pixels). */
  min_height?: integer;
  /** Only extract images with an area greater than or equal to `min_area` (in pixels). */
  min_area?: integer;
};

/** Extract images from a PDF. */
export async function main(input: Input): Promise<File[]> {
  const { venv, paths } = await initVirtualEnv({ pdf: input.pdf });

  const outDir = outPath("out");
  const opts = [
    `--quality=${input.quality || 92}`,
    `--min-width=${input.min_width || 1}`,
    `--min-height=${input.min_height || 1}`,
    `--min-area=${input.min_area || 1}`,
  ];

  await venv.run(pdfr, ["extract-images", ...opts, paths.pdf, outDir]);

  const images = [];
  for (const name of await venv.fs.readdir(outDir)) {
    images.push(await readFile(`${outDir}/${name}`, venv));
  }
  return images;
}
