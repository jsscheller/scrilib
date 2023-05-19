import magick from "file:@jspawn/imagemagick-wasm/magick.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";

export type Input = {
  /** The image to resize. */
  image: File;
  /** How your image will be resized. */
  resize: ResizeU;
};

export type ResizeU =
  | WidthResize
  | HeightResize
  | WidthAndHeightResize
  | AreaResize
  | PercentageResize;

export const enum Resize {
  Width = "Width",
  Height = "Height",
  WidthAndHeight = "WidthAndHeight",
  Area = "Area",
  Percentage = "Percentage",
}

/** Resize by width, preserving the aspect ratio. */
export type WidthResize = {
  type: Resize.Width;
  /** The width in pixels. */
  width: integer;
};

/** Resize by height, preserving the aspect ratio. */
export type HeightResize = {
  type: Resize.Height;
  /** The height in pixels. */
  height: integer;
};

/** Resize by the given dimensions, using a specified method of resizing: fill, crop, pad, etc. */
export type WidthAndHeightResize = {
  type: Resize.WidthAndHeight;
  /** The width in pixels. */
  width: integer;
  /** The height in pixels. */
  height: integer;
  method: ResizeMethodU;
};

export type ResizeMethodU =
  | ResizeMethodBestFit
  | ResizeMethodIgnoreAspectRatio
  | ResizeMethodFill
  | ResizeMethodPad
  | ResizeMethodCrop;

export const enum ResizeMethod {
  BestFit = "BestFit",
  IgnoreAspectRatio = "IgnoreAspectRatio",
  Fill = "Fill",
  Pad = "Pad",
  Crop = "Crop",
}

/** Resize by enlarging or reducing - just enough to best fit the given size while preserving the aspect ratio. */
export type ResizeMethodBestFit = {
  type: ResizeMethod.BestFit;
};

/** This option forces the ratio to be ignored so the given size is matched exactly. */
export type ResizeMethodIgnoreAspectRatio = {
  type: ResizeMethod.IgnoreAspectRatio;
};

/** Resize based on the smallest fitting dimension. The resized image will completely fill (and even overflow) the given size. */
export type ResizeMethodFill = {
  type: ResizeMethod.Fill;
};

/** Resize to fit within the given size and then add a border around the image to exactly match the given size. */
export type ResizeMethodPad = {
  type: ResizeMethod.Pad;
  /**
   * The color of the padding (border) in hexadecimal format.
   * {@picker color}
   */
  pad_color: string;
};

/** Crop (cut out parts of the image) to exactly match the given size. */
export type ResizeMethodCrop = {
  type: ResizeMethod.Crop;
};

/** Resize the image so that its area is less than or equal to the specified area. */
export type AreaResize = {
  type: Resize.Area;
  /** The area in pixels. */
  area: integer;
  /** Force the area of the resized image to exactly match the given area by cutting and/or padding. */
  exact_match: boolean;
  /**
   * The color of the padding (border) in hexadecimal format.
   * {@picker color}
   */
  pad_color: string;
  /** Specify width or height. */
  dimension: WidthOrHeightU;
};

export type WidthOrHeightU = Width | Height;

export const enum WidthOrHeight {
  Width = "Width",
  Height = "Heigt",
}

export type Width = {
  type: WidthOrHeight.Width;
  /** The width in pixels. */
  width: integer;
};

export type Height = {
  type: WidthOrHeight.Height;
  /** The height in pixels. */
  height: integer;
};

/** Scale the image by a percentage. */
export type PercentageResize = {
  type: Resize.Percentage;
  /** An integer between 0 and 100. */
  percentage: integer;
};

/** Resize an image by width, height, area, or a percentage. */
export async function main(input: Input): Promise<File> {
  const { venv, paths } = await initVirtualEnv({ image: input.image });
  const args = [paths.image, "-resize"];

  const { resize } = input;
  switch (resize.type) {
    case Resize.Width:
      args.push(`${resize.width}x`);
      break;
    case Resize.Height:
      args.push(`x${resize.height}`);
      break;
    case Resize.WidthAndHeight:
      args.push(`${resize.width}x${resize.height}`);
      switch (resize.method.type) {
        case ResizeMethod.BestFit:
          // Default
          break;
        case ResizeMethod.IgnoreAspectRatio:
          args[args.length - 1] += "!";
          break;
        case ResizeMethod.Fill:
          args[args.length - 1] += "^";
          break;
        case ResizeMethod.Pad:
          // Don't stretch the image
          args[args.length - 1] += ">";
          args.push(
            "-background",
            resize.method.pad_color,
            "-gravity",
            "center",
            "-extent",
            `${resize.width}x${resize.height}`
          );
          break;
        case ResizeMethod.Crop:
          args[args.length - 1] += "^";
          args.push(
            "-gravity",
            "center",
            "-extent",
            `${resize.width}x${resize.height}`
          );
          break;
      }
      break;
    case Resize.Area: {
      args.push(`${resize.area}@`);
      if (resize.exact_match) {
        let size;
        switch (resize.dimension.type) {
          case WidthOrHeight.Width:
            const width = resize.dimension.width;
            size = `${width}x${resize.area / width}`;
            break;
          case WidthOrHeight.Height:
            const height = resize.dimension.height;
            size = `${resize.area / height}x${height}`;
            break;
        }
        args.push(
          "-gravity",
          "center",
          "-background",
          resize.pad_color,
          "-extent",
          size
        );
      }
      break;
    }
    case Resize.Percentage:
      args.push(`${resize.percentage}%`);
      break;
  }

  const out = outPath(input.image, { suffix: "-resized" });
  args.push(out);

  await venv.run(magick, args);

  return readFile(out, venv);
}
