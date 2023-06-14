/**
 * Preview audio files - uses your browser's audio player, so it only works with audio formats supported by your browser.
 *
 * ### Examples
 *
 * sample.mpg
 *
 * ```
 * {
 *   "audio": { "$file": "/assets/sample.mpg" }
 * }
 * ```
 *
 * @module
 */

import "file:../../picker/colors.css";
import "file:../../picker/normalize.css";
import "file:./index.html";
import "file:../../initListener.js";

export type Input = {
  audio: File;
};

export async function init(input: Input) {
  const audioEl = document.getElementById("audio")! as HTMLAudioElement;
  audioEl.src = URL.createObjectURL(input.audio);
}
