import magick from "file:@jspawn/imagemagick-wasm/magick.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";

export type Input = {
  /** The image to convert. */
  image: File;
  /** **Note**: vector formats such as `.ai`, `.eps`, `.svg` are not supported at this time. */
  format: FormatU;
};

export type FormatU =
  | GIFFormat
  | ICOFormat
  | PNGFormat
  | TIFFFormat
  | WEBPFormat
  | JPGFormat;

export const enum Format {
  GIF = "GIF",
  ICO = "ICO",
  PNG = "PNG",
  TIFF = "TIFF",
  WEBP = "WEBP",
  JPG = "JPG",
}

/** Graphics Interchange Format */
export type GIFFormat = {
  type: Format.GIF;
};

/** Microsoft Icon  */
export type ICOFormat = {
  type: Format.ICO;
  /** Define one or more sizes. **Note**: defining multiple sizes still results in a single `.ico` file. */
  sizes: integer[];
};

/** Portable Network Graphics */
export type PNGFormat = {
  type: Format.PNG;
  /**
   * `zlib` compression level from `1-9` (higher means smaller file size). Setting to `0` uses `Huffman`
   * compression which often results in even smaller file size.
   */
  compression?: integer;
  /**
   * Data encoding filtering (can reduce file size) - a number between `1` and `5`. 1 is *sub*, 2
   * is *up*, 3 is *average*, 4 is *Paeth*, and 5 is *adaptive*.
   *
   * Mostly useful for images of natural landscapes (images without sequences of solid colors).
   */
  encoding_filter?: integer;
  /** Define the number of colors. Useful for small/thumbnail images to reduce file size. */
  colors?: integer;
};

/** Tagged Image File Format */
export type TIFFFormat = {
  type: Format.TIFF;
};

/** Weppy Image Format */
export type WEBPFormat = {
  type: Format.WEBP;
  /**
   * A number between `1` (lowest quality and smallest file size) and `100` (best quality but
   * larger file size).
   */
  quality?: integer;
};

/** Joint Photographic Experts Group */
export type JPGFormat = {
  type: Format.JPG;
  /**
   * A number between `1` (lowest quality and smallest file size) and `100` (best quality but
   * larger file size).
   */
  quality?: integer;
};

/** Convert between image formats. */
export async function main(input: Input): Promise<File> {
  const { venv, paths } = await initVirtualEnv({ image: input.image });
  const args = [paths.image];

  const { format } = input;
  switch (format.type) {
    case Format.ICO:
      args.push("-define", `icon:auto-resize="${format.sizes.join(",")}"`);
      break;
    case Format.PNG:
      if (format.colors) {
        args.push("-colors", format.colors.toString());
      }
      if (format.compression || format.encoding_filter) {
        args.push(
          "-quality",
          `${format.compression || 0}${format.encoding_filter || 0}`
        );
      }
      break;
    case Format.WEBP:
    case Format.JPG:
      if (format.quality) {
        args.push("-quality", format.quality.toString());
      }
      break;
  }

  const out = outPath(input.image, {
    ext: format.type.toLowerCase(),
  });
  args.push(out);

  await venv.run(magick, args);

  return readFile(out, venv);
}
