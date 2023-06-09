/**
 * Round the corners of an image.
 *
 * ### Examples
 *
 * Round the corners of an image.
 *
 * ```
 * {
 *   "image": { "$file": "/assets/tree.jpg" },
 *   "border_radius": 50,
 *   "format": "PNG"
 * }
 * ```
 *
 * @module
 */

import magick from "file:@jspawn/imagemagick-wasm/magick.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";

export type Input = {
  /** The image to round. */
  image: File;
  /** Border radius in pixels. */
  border_radius: integer;
  /** Optionally change the output format. Defaults to the input format. */
  format?: Format;
};

export const enum Format {
  PNG = "PNG",
  WEBP = "WEBP",
}

export async function main(input: Input): Promise<File> {
  const { venv, paths } = await initVirtualEnv({ image: input.image });

  const { stdout } = await venv.run(magick, [
    "identify",
    "-format",
    "%wx%h\n",
    paths.image,
  ]);
  const wxh = stdout
    .split("\n")
    .pop()!
    .split("x")
    .map((n: string) => parseInt(n));

  const mask = outPath("__mask__.png");
  await venv.run(magick, [
    "-size",
    wxh.join("x"),
    "xc:none",
    "-draw",
    "roundrectangle 0,0," +
      wxh.concat(input.border_radius, input.border_radius).join(),
    mask,
  ]);

  const out = outPath(paths.image, {
    suffix: "-rounded",
    ext: input.format ? input.format.toLowerCase() : undefined,
  });

  await venv.run(magick, [
    paths.image,
    "-matte",
    mask,
    "-compose",
    "DstIn",
    "-composite",
    out,
  ]);

  return readFile(out, venv);
}
