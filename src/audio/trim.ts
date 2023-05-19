import ffmpeg from "file:@jspawn/ffmpeg-wasm/ffmpeg.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";

export type Input = {
  /**
   * The audio file to trim.
   *
   * Duration/start/end time should have the following format: `[-][HH:]MM:SS[.m...]` or `[-]S+[.m...][s|ms|us]`.
   *
   * Examples:
   *
   * |  |  |
   * | --- | --- |
   * | `55` | 55-seconds |
   * | `0.2` | 0.2-seconds |
   * | `200ms` | 200-milliseconds |
   * | `00:04:15` | 4-minutes and 15-seconds |
   * | `02:04:05` | 2-hours, 4-minutes and 5-seconds |
   * | `00:00:05.500` | 5-seconds and 500-milliseconds (half-second) |
   */
  audio: File;
  /** Defauts to the start of the audio file. */
  start_time?: string;
  /** Defauts to the end of the audio file. */
  end_time?: string;
  /** Cannot be specified with `end_time` */
  duration?: string;
};

/** Trim an audio file. */
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
