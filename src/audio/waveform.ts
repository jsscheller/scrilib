/**
 * Generate a waveform image frmo an audio file.
 *
 * ### Examples
 *
 * Combine two audio files.
 *
 * ```
 * {
 *   "audio": { "$file": "/assets/sample.ogg" },
 *   "width": 600,
 *   "height": 100,
 *   "waveform_color": "#ff9933",
 *   "background_color": "#44582c"
 * }
 * ```
 *
 * @module
 */

import ffmpeg from "file:@jspawn/ffmpeg-wasm/ffmpeg.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";

export type Input = {
  audio: File;
  select?: AudioSelect;
  /** Width of the output image in pixels. */
  width: integer;
  /** Height of the output image in pixels. */
  height: integer;
  /**
   * The waveform color in hexadecimal format.
   * {@picker color}
   */
  waveform_color: string;
  /**
   * The background color in hexadecimal format.
   * {@picker color}
   */
  background_color: string;
};

export type AudioSelect = {
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

  let select = [];
  if (input.select) {
    if (input.select.start_time) {
      select.push("-ss", input.select.start_time);
    }
    if (input.select.end_time) {
      select.push("-to", input.select.end_time);
    } else if (input.select.duration) {
      select.push("-t", input.select.duration);
    }
  }
  const size = `${input.width}x${input.height}`;
  const filter = [
    `[0:a]aformat=channel_layouts=mono, compand, showwavespic=s=${size}:colors=${input.waveform_color}[fg]`,
    `color=s=${size}:color=${input.background_color}[bg]`,
    `[bg][fg]overlay=format=auto,drawbox=x=(iw-w)/2:y=(ih-h)/2:w=iw:h=1:color=${input.waveform_color}`,
  ];
  const args = [
    "-hide_banner",
    ...select,
    "-i",
    paths.audio,
    "-filter_complex",
    filter.join(";"),
    "-frames:v",
    "1",
  ];

  const out = outPath(input.audio, {
    ext: "png",
  });
  args.push(out);

  await venv.run(ffmpeg, args);

  return readFile(out, venv);
}
