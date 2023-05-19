import pdfr from "file:@jspawn/pdfr-wasm/pdfr.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";
import type { AnnotationU } from "../picker/pdfAnnotations/index.js";
import { Annotation } from "../picker/pdfAnnotations/index.js";

export type Input = {
  /** The PDF to annotate. */
  pdf: File;
  /**
   * A list of annotations to add to your PDF.
   *
   * {@picker pdfAnnotations}
   */
  annotations: AnnotationU[];
};

/** Annotate a PDF. */
export async function main(input: Input): Promise<File> {
  const { venv, paths } = await initVirtualEnv({
    pdf: input.pdf,
    ...input.annotations.reduce(
      (acc: { [path: string]: File }, annot, index) => {
        if (annot.type === Annotation.Image) {
          acc[`annot${index}`] = annot.file;
        }
        return acc;
      },
      {}
    ),
  });

  let edits = input.annotations.map((annot, index) => {
    switch (annot.type) {
      case Annotation.Image:
        return {
          op: "add_image",
          page: annot.page,
          placement: {
            x: annot.x,
            y: annot.y,
            width: annot.width,
            height: annot.height,
          },
          image: paths[`annot${index}`],
        };
      case Annotation.Text:
        return {
          op: "add_text",
          page: annot.page,
          placement: {
            x: annot.x,
            y: annot.y,
          },
          text: annot.text,
          font: annot.font,
          font_size: annot.font_size,
        };
    }
  });
  await venv.fs.writeFile("edits.json", JSON.stringify(edits));

  const out = outPath(paths.pdf, { suffix: "-annotated" });

  await venv.run(pdfr, ["edit", "edits.json", paths.pdf, out]);

  return readFile(out, venv);
}
