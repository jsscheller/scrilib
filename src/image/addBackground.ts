import magick from "file:@jspawn/imagemagick-wasm/magick.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";

export type Input = {
  /** The image to add a background to. */
  image: File;
  /**
   * The background color in hexadecimal format.
   * {@picker color}
   */
  color: string;
};

/** Add a solid background to an image. */
export async function main(input: Input): Promise<File> {
  const { venv, paths } = await initVirtualEnv({ image: input.image });

  const out = outPath(input.image, { suffix: "-bg" });

  await venv.run(magick, [
    paths.image,
    "-background",
    input.color,
    "-alpha",
    "remove",
    "-alpha",
    "off",
    out,
  ]);

  return readFile(out, venv);
}
