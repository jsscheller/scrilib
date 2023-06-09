/**
 * Tile images together.
 *
 * ### Examples
 *
 * Layout images in a tile pattern.
 *
 * ```
 * {
 *   "images": [
 *     { "$file": "/assets/tree.jpg" },
 *     { "$file": "/assets/cat.png" },
 *     { "$file": "/assets/tree.jpg" },
 *     { "$file": "/assets/cat.png" }
 *   ],
 *   "rows": 2,
 *   "columns": 2
 * }
 * ```
 *
 * @module
 */

import magick from "file:@jspawn/imagemagick-wasm/magick.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";

export type Input = {
  /** The image to add a background to. */
  images: File[];
  /** Number of horizontal rows. */
  rows?: integer;
  /** Number of vertical columns. */
  columns?: integer;
  /** Spacing between the images in pixels. */
  spacing?: integer;
  /**
   * Background color in hexadecimal format (eg. `#ff9933`). Only useful if your images have transparency.
   * {@picker color}
   */
  background_color?: string;
  /** Output image format. Defaults to JPG. */
  format?: Format;
};

export const enum Format {
  PNG = "PNG",
  WEBP = "WEBP",
  JPG = "JPG",
}

export async function main(input: Input): Promise<File> {
  if (input.images.length === 0) {
    throw "expected at least one image";
  }

  const { venv, paths } = await initVirtualEnv({
    ...input.images.reduce((acc: { [path: string]: File }, image, index) => {
      acc[`image${index}`] = image;
      return acc;
    }, {}),
  });

  const args = ["montage"];
  for (let index = 0; index < input.images.length; index++) {
    args.push(paths[`image${index}`]);
  }

  let tile;
  if (input.columns && input.rows) {
    tile = `${input.columns}x${input.rows}`;
  } else if (input.columns) {
    tile = `${input.columns}x`;
  } else {
    tile = `x${input.rows || 1}`;
  }

  const spacing = input.spacing || 0;
  args.push("-tile", tile, "-geometry", `+${spacing}+${spacing}`);

  if (input.background_color) {
    args.push(
      "-background",
      input.background_color,
      "-alpha",
      "remove",
      "-alpha",
      "off"
    );
  }

  const out = outPath(input.images[0], {
    suffix: "-tile",
    ext: (input.format || Format.JPG).toLowerCase(),
  });
  args.push(out);

  await venv.run(magick, args);

  return readFile(out, venv);
}
