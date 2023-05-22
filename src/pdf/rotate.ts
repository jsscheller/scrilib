import qpdf from "file:@jspawn/qpdf-wasm/qpdf.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";
import type {
  Input as PickerInput,
  Output as PickerOutput,
} from "../picker/pdfPages/index.js";
import { simplifyPageSelection, parsePageSelection } from "./shared.js";

export type Input = {
  /** The PDF to rotate. */
  pdf: File;
  rotate: RotateU;
};

export type RotateU = RelativeRotate | FixedRotate | CustomRotate;

export const enum Rotate {
  Relative = "Relative",
  Fixed = "Fixed",
  Custom = "Custom",
}

/** Update the rotation of each page relative to its current rotation. */
export type RelativeRotate = {
  type: Rotate.Relative;
  /** Rotation angle in degrees. */
  angle: integer;
};

/** Set the rotation of each page to a fixed angle - disregarding its current rotation. */
export type FixedRotate = {
  type: Rotate.Fixed;
  /** Rotation angle in degrees. */
  angle: integer;
};

/** Specify the rotation for each page/page-range. */
export type CustomRotate = {
  type: Rotate.Custom;
  /**
   * `pages` should be specified using the following syntax:
   *
   * Examples:
   *
   * |  |  |
   * | --- | --- |
   * | `1,6,4` | pages 1, 6, and 4 |
   * | `3..7` | pages 3 through 7 inclusive |
   * | `7..3` | pages 7, 6, 5, 4, and 3 |
   * | `1..-1` | all pages |
   * | `1,3,5..9,15..12` | pages 1, 3, 5, 6, 7, 8, 9, 15, 14, 13, and 12 |
   * | `-1` | the last page |
   * | `-1..-3` | the last three pages |
   * | `5,7..9,12` | pages 5, 7, 8, 9, and 12 |
   *
   * {@picker pdfPages map_input=map_picker_input map_output=map_picker_output}
   */
  rotations: PageRotation[];
};

export type PageRotation = {
  pages: string;
  /** Rotation angle in degrees. */
  angle: integer;
  /** Rotate the page relative to its current rotation. */
  relative?: boolean;
};

/** Rotate pages in a PDF. */
export async function main(input: Input): Promise<File> {
  const { venv, paths } = await initVirtualEnv({ pdf: input.pdf });

  const { rotate } = input;
  let rotateArgs = [];
  switch (rotate.type) {
    case Rotate.Custom:
      for (const rot of rotate.rotations) {
        const relative = rot.relative ? "+" : "";
        const sel = await parsePageSelection(rot.pages, paths.pdf, venv);
        rotateArgs.push(`--rotate=${relative}${normAngle(rot.angle)}:${sel}`);
      }
      break;
    case Rotate.Relative:
      rotateArgs = [`--rotate=+${normAngle(rotate.angle)}:1-z`];
      break;
    case Rotate.Fixed:
      rotateArgs = [`--rotate=${normAngle(rotate.angle)}:1-z`];
      break;
  }

  const out = outPath(paths.pdf, { suffix: "-rotated" });

  await venv.run(qpdf, [
    paths.pdf,
    "--pages",
    ".",
    "1-z",
    "--",
    out,
    ...rotateArgs,
  ]);

  return readFile(out, venv);
}

function normAngle(deg: number): number {
  deg = deg % 360;
  if (deg < 0) deg += 360;
  return deg;
}

export async function map_picker_input({
  pdf,
}: {
  pdf: File;
}): Promise<PickerInput> {
  return {
    pdfs: [pdf],
    allow_rotate: true,
  };
}

export async function map_picker_output({
  output,
}: {
  output: PickerOutput;
}): Promise<PageRotation[]> {
  const grouped: { [key: string]: number[] } = {};
  for (const page of output.pdfs[0].pages) {
    if (page.rotate != null) {
      let group = grouped[page.rotate];
      if (!group) {
        group = grouped[page.rotate.toString()] = [];
      }
      group.push(page.page);
    }
  }
  const rotations = [];
  for (const [angle, pages] of Object.entries(grouped)) {
    rotations.push({
      pages: simplifyPageSelection(pages),
      angle: parseInt(angle),
      relative: false,
    });
  }
  return rotations;
}
