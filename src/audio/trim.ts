/**
 * Trim an audio file.
 *
 * ### Examples
 *
 * Combine two audio files.
 *
 * ```
 * {
 *   "audio": { "$file": "/assets/sample.ogg" },
 *   "end_time": 2
 * }
 * ```
 *
 * @module
 */

import ffmpeg from "file:@jspawn/ffmpeg-wasm/ffmpeg.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";

export type Input = {
  /** The audio file to trim. */
  audio: File;
  /** The start time in [time-duration syntax](./#time-duration-syntax). Defauts to the start of the audio file. */
  start_time?: string;
  /** The end time in [time-duration syntax](./#time-duration-syntax). Defauts to the end of the audio file. */
  end_time?: string;
  /** Instead of specifying an `end_time`, specify the `duration` in [time-duration syntax](./#time-duration-syntax). */
  duration?: string;
};

export async function main(input: Input): Promise<File> {
  const { venv, paths } = await initVirtualEnv({
    audio: input.audio,
  });

  const args = ["-hide_banner"];

  if (input.start_time) {
    args.push("-ss", input.start_time);
  }
  if (input.end_time) {
    args.push("-to", input.end_time);
  } else if (input.duration) {
    args.push("-t", input.duration);
  }
  args.push("-i", paths.audio);

  const out = outPath(input.audio, {
    suffix: "-trimmed",
  });
  args.push(out);

  await venv.run(ffmpeg, args);

  return readFile(out, venv);
}
