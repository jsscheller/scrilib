/**
 * Encrypt a PDF.
 *
 * Note: encrypting a PDF and password-protecting a PDF are two different things. Learn more [here](./#pdf-encryption-vs-password-protecting).
 *
 * ### Examples
 *
 * Lock a PDF using a password.
 *
 * ```
 * {
 *   "pdf": { "$file": "/assets/sample.pdf" },
 *   "password": "password123"
 * }
 * ```
 *
 * @module
 */

import qpdf from "file:@jspawn/qpdf-wasm/qpdf.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";

export type Input = {
  /** The PDF file to lock. */
  pdf: File;
  /**
   * At the time of this writing, both `256-bit AES` and `128-bit AES` encryption are considered secure.
   * `256-bit AES` is stronger and should be preferred. However, `256-bit AES` requires PDF version 1.7 whereas `128-bit AES` requires just 1.6.
   * Learn more about PDF encryption [here](https://qpdf.readthedocs.io/en/latest/encryption.html).
   */
  encryption?: Encryption;
  /** Optionally encrypt using a password. */
  password?: string;
};

export const enum Encryption {
  AES256 = "AES256",
  AES128 = "AES128",
}

export async function main(input: Input): Promise<File> {
  const { venv, paths } = await initVirtualEnv({ pdf: input.pdf });

  const out = outPath(paths.pdf, { suffix: "-encrypted" });
  const password = input.password || "";
  await venv.run(qpdf, [
    "--warning-exit-0",
    paths.pdf,
    "--encrypt",
    password,
    password,
    input.encryption === Encryption.AES128 ? "128" : "256",
    "--",
    out,
  ]);

  return readFile(out, venv);
}
