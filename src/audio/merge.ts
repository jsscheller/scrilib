/**
 * Combine audio files.
 *
 * ### Examples
 *
 * Combine two audio files.
 *
 * ```
 * {
 *   "chunks": [
 *     {
 *       "audio": { "$file": "/assets/sample.ogg" },
 *       "end_time": "2"
 *     },
 *     {
 *       "audio": { "$file": "/assets/sample.ogg" },
 *       "start_time": "2",
 *       "end_time": "8"
 *     }
 *   ],
 *   "format": {
 *     "type": "MP3"
 *   }
 * }
 * ```
 *
 * @module
 */

import ffmpeg from "file:@jspawn/ffmpeg-wasm/ffmpeg.wasm";
import { initVirtualEnv, readFile, outPath } from "../util.js";
import type { FormatU, CodecU } from "./convert.js";
import { pushFormatArgs } from "./shared.js";

export type Input = {
  /** A list of audio files to combine */
  chunks: Chunk[];
  /**
   * Defaults to the format of the first chunk.
   *
   * Each format is compatible with one or more codecs and an acceptable bitrate/sample-rate range. Leave these options blank to use default values which should produce acceptable output.
   */
  format?: FormatU;
  codec?: CodecU;
  bitrate?: integer;
  sample_rate?: integer;
};

export type Chunk = {
  audio: File;
  /** The start time for this chunk in [time-duration syntax](./#time-duration-syntax). Defauts to the start of the audio file. */
  start_time?: string;
  /** The end time for this chunk in [time-duration syntax](./#time-duration-syntax). Defauts to the end of the audio file. */
  end_time?: string;
  /** Instead of specifying an `end_time`, specify the `duration` in [time-duration syntax](./#time-duration-syntax). */
  duration?: string;
};

export async function main(input: Input): Promise<File> {
  if (input.chunks.length === 0) {
    throw "expected at least one chunk";
  }

  const { venv, paths } = await initVirtualEnv({
    ...input.chunks.reduce((acc: { [path: string]: File }, chunk, index) => {
      acc[`audio${index}`] = chunk.audio;
      return acc;
    }, {}),
  });
  const audios = Object.values(paths);

  const args = [];
  const filter = [];
  const concat = [];
  for (const [index, chunk] of input.chunks.entries()) {
    args.push("-i", audios[index]);
    let filterItem = "";
    if (chunk.start_time || chunk.end_time) {
      const atrim = [];
      if (chunk.start_time) {
        atrim.push(`start=${chunk.start_time}`);
      }
      if (chunk.end_time) {
        atrim.push(`end=${chunk.end_time}`);
      } else if (chunk.duration) {
        atrim.push(`duration=${chunk.duration}`);
      }
      filterItem += `atrim=${atrim.join(":")},`;
    }
    const id = "x".repeat(index + 1);
    filterItem += `asetpts=PTS-STARTPTS[${id}]`;
    filter.push(filterItem);
    concat.push(`[${id}]`);
  }
  filter.push(`${concat.join("")}concat=n=${concat.length}:v=0:a=1[out]`);
  args.push("-filter_complex", filter.join(";"), "-map", "[out]");

  let ext;
  if (input.format) {
    pushFormatArgs(input, args);
    ext = input.format.type.toLowerCase();
  }

  const out = outPath(input.chunks[0].audio, {
    suffix: "-merged",
    ext,
  });
  args.push(out);

  await venv.run(ffmpeg, args);

  return readFile(out, venv);
}
