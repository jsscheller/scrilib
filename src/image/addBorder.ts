import magick from "file:@jspawn/imagemagick-wasm/magick.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";

export type Input = {
  /** The image to add a border to. */
  image: File;
  /**
   * The border color in hexadecimal format or `transparent`.
   * {@picker color}
   */
  color: string;
  /** The width of the border in pixels. */
  width: integer;
  /**
   * Choose where the border will be drawn:
   * - **Outside**: draw the border around the image - increasing the dimensions of the resulting image
   * - **Inside**: draw the border so that the dimensions stay the same - results in part of the
   * image being covered by the border
   * - **Center**: the dimensions will increase by half the border width - the other half of the border
   * covers the image
   */
  placement: Placement;
};

export const enum Placement {
  Outside = "Outside",
  Inside = "Inside",
  Center = "Center",
}

/** Add a solid border around an image. */
export async function main(input: Input): Promise<File> {
  const { venv, paths } = await initVirtualEnv({ image: input.image });

  const output = await venv.run(magick, [
    "identify",
    "-format",
    "%wx%h\n",
    paths.image,
  ]);
  const wxh = output
    .stdout!.split("\n")
    .pop()!
    .split("x")
    .map((n: string) => parseInt(n));

  const args = ["convert"];

  const centerOffset = ["0", "0"];
  const size = wxh.slice();
  const bw = input.width;
  if (input.placement === Placement.Outside) {
    size[0] += bw * 2;
    size[1] += bw * 2;
    centerOffset[0] = centerOffset[1] = bw.toString();
  } else if (input.placement === Placement.Center) {
    size[0] += bw;
    size[1] += bw;
    centerOffset[0] = centerOffset[1] = Math.round(bw / 2).toFixed(3);
  }
  const centerOffsetStr = "+" + centerOffset.join("+");
  const sizeStr = size.join("x");

  // set size of image with first page
  args.push("-page", sizeStr + "+0+0", "-size", sizeStr, "xc:none");

  // now, other pages just need offset
  const offset = Math.round((bw * 1000) / 2) / 1000;
  const drawTo = size.map((n: number) => {
    return n - offset;
  });
  args.push(
    "-page",
    "+0+0",
    "(",
    "-size",
    sizeStr,
    "xc:none",
    "-fill",
    "none",
    "-stroke",
    input.color,
    "-strokewidth",
    bw.toString(),
    "-draw",
    "rectangle " + offset + "," + offset + " " + drawTo.join(),
    ")"
  );

  args.push("-page", centerOffsetStr, paths.image);

  const out = outPath(input.image, { suffix: "-border" });
  args.push("-background", "none", "-compose", "DstOver", "-flatten", out);

  await venv.run(magick, args);

  return readFile(out, venv);
}
