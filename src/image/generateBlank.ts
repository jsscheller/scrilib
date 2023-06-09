/**
 * Create a blank image of a solid color.
 *
 * ### Examples
 *
 * Generate a blank JPG with an orange background.
 *
 * ```
 * {
 *   "width": 100,
 *   "height": 100,
 *   "color": "#ff9933",
 *   "format": "JPG"
 * }
 * ```
 *
 * Generate a transparent PNG.
 *
 * ```
 * {
 *   "width": 100,
 *   "height": 100,
 *   "color": "transparent",
 *   "format": "PNG"
 * }
 * ```
 *
 * @module
 */

import magick from "file:@jspawn/imagemagick-wasm/magick.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";

export type Input = {
  /** The width in pixels. */
  width: integer;
  /** The height in pixels. */
  height: integer;
  /**
   * The background color in hexadecimal format or `transparent`.
   * {@picker color}
   */
  color: string;
  /** The format of the generated image. */
  format: Format;
};

export const enum Format {
  PNG = "PNG",
  JPG = "JPG",
  WEBP = "WEBP",
  GIF = "GIF",
}

export async function main(input: Input): Promise<File> {
  const { venv } = await initVirtualEnv({});

  const out = outPath(`blank.${input.format.toLowerCase()}`);

  await venv.run(magick, [
    "-size",
    `${input.width}x${input.height}`,
    `xc:${input.color}`,
    out,
  ]);

  return readFile(out, venv);
}
