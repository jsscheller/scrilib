/**
 * Remove PDF encryption.
 *
 * Note: encrypting a PDF and password-protecting a PDF are two different things. Learn more [here](./#pdf-encryption-vs-password-protecting).
 *
 * ### Examples
 *
 * Unlock a password-protected PDF.
 *
 * ```
 * {
 *   "pdf": { "$file": "/assets/locked.pdf" },
 *   "password": "password123"
 * }
 * ```
 *
 * @module
 */

import qpdf from "file:@jspawn/qpdf-wasm/qpdf.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";

export type Input = {
  /** The PDF to unlock. */
  pdf: File;
  /** Only required if your PDF is password-protected. */
  password?: string;
};

export async function main(input: Input): Promise<File> {
  const { venv, paths } = await initVirtualEnv({ pdf: input.pdf });

  const out = outPath(paths.pdf, { suffix: "-unlocked" });
  try {
    await venv.run(qpdf, [
      "--warning-exit-0",
      paths.pdf,
      ...(input.password ? [`--password=${input.password}`] : []),
      "--decrypt",
      out,
    ]);
  } catch (err_) {
    const err = err_ as any;
    if (err.stderr && err.stderr.includes("invalid password")) {
      throw "This PDF is password-protected - the correct password is required.";
    }
    throw err;
  }

  return readFile(out, venv);
}
