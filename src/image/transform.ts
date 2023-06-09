/**
 * Apply transformations to an image file.
 *
 * ### Examples
 *
 * Rotate an image by 90 degrees clockwise.
 *
 * ```
 * {
 *   "image": { "$file": "/assets/tree.jpg" },
 *   "rotate": 90
 * }
 * ```
 *
 * @module
 */

import magick from "file:@jspawn/imagemagick-wasm/magick.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";

export type Input = {
  /** The image to transform. */
  image: File;
  /** Rotate by an angle specified in degrees. */
  rotate?: integer;
  /** Flip the image upside-down (reflect across its horizontal axis). */
  flip?: boolean;
  /** Mirror the image (reflect across its vertical axis). */
  flop?: boolean;
  /** Mirror the image along the image's top-left to bottom-right diagonal. */
  transpose?: boolean;
  /** Mirror the image along the image's bottom-left to top-right diagonal. */
  transverse?: boolean;
};

export async function main(input: Input): Promise<File> {
  const { venv, paths } = await initVirtualEnv({ image: input.image });
  const args = [paths.image];

  if (input.rotate) {
    args.push("-rotate", input.rotate.toString());
  }
  if (input.flip) {
    args.push("-flip");
  }
  if (input.flop) {
    args.push("-flop");
  }
  if (input.transpose) {
    args.push("-transpose");
  }
  if (input.transverse) {
    args.push("-transverse");
  }

  const out = outPath(input.image, { suffix: "-transformed" });
  args.push(out);

  await venv.run(magick, args);

  return readFile(out, venv);
}
