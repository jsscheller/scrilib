/**
 * ### [Page-selection syntax](#page-selection-syntax)
 *
 * - Specify a single page using its number - eg. `3` for the third page.
 * - Specify a page range using range notation - eg. `1..3` for the first, second and third page.
 * - Combine multiple single-pages/ranges using a comma - eg. `1,3..4` for the first, third and fourth page.
 * - Negative numbers count from the end - eg. `-1` refers to the last page.
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
 * | `-3..-1` | the third to last, second to last and last page |
 * | `-1..-3` | the last, second to last and third to last page |
 * | `5,7..9,12` | pages 5, 7, 8, 9, and 12 |
 *
 * ### [PDF encryption VS password-protection](#pdf-encryption-vs-password-protecting)
 *
 * The terms "PDF encryption" and "password-protecting a PDF" are often used interchangeably, but
 * they're not precisely the same thing. Both are mechanisms to protect the content of a PDF file, but
 * they work in slightly different ways.
 *
 * - PDF Encryption: This is a method to secure the data inside a PDF file using various encryption
 * algorithms, such as RC4, AES (varying key lengths: 128, 256 bits), etc. The purpose of PDF
 * encryption is to protect the content of the PDF from being accessed or modified by unauthorized
 * users. When a PDF file is encrypted, its contents are converted into unreadable format which can
 * only be decrypted using the appropriate key.
 *
 * There are two kinds of passwords in the context of PDF encryption:
 *
 *   - The owner password: When a PDF is encrypted with an owner password, restrictions can be placed on
 * the document such as preventing printing, copying, editing, etc. The owner password is required to
 * change these permission settings.
 *   - The user (or document open) password: If a PDF is encrypted with a user password, that password is
 * required to open the document.
 *
 * - Password-protecting a PDF: This generally refers to the practice of applying a password to a PDF so
 * that users must enter the password before they can open and view the PDF. This is essentially using
 * the user password aspect of the PDF encryption. It doesn't necessarily specify the encryption level
 * or permissions applied to the document, which are more in the realm of PDF encryption.
 *
 * So while there is significant overlap between these two concepts, it's not 100% accurate to use
 * them interchangeably. The key takeaway here is that password protection is a feature of PDF
 * encryption, but PDF encryption can also include additional security measures beyond just password
 * protection.
 *
 * @module
 */

export { main as annotate } from "./annotate.js";
export * as _annotate from "./annotate.js";
export { main as compress } from "./compress.js";
export * as _compress from "./compress.js";
export { main as decrypt } from "./decrypt.js";
export * as _decrypt from "./decrypt.js";
export { main as encrypt } from "./encrypt.js";
export * as _encrypt from "./encrypt.js";
export { main as extractImages } from "./extractImages.js";
export * as _extractImages from "./extractImages.js";
export { main as fromImages } from "./fromImages.js";
export * as _fromImages from "./fromImages.js";
export { main as merge } from "./merge.js";
export * as _merge from "./merge.js";
export { main as render } from "./render.js";
export * as _render from "./render.js";
export { main as repage } from "./repage.js";
export * as _repage from "./repage.js";
export { main as rotate } from "./rotate.js";
export * as _rotate from "./rotate.js";
export { main as split } from "./split.js";
export * as _split from "./split.js";

export * as shared from "./shared.js";
