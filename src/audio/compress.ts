/**
 * Compress an audio file by adjusting its bitrate.
 *
 * ### Examples
 *
 * Compress an MP3 file.
 *
 * ```
 * {
 *   "audio": { "$file": "/assets/sample.mp3" },
 *   "compress": {
 *     "type": "Auto",
 *     "level": "Medium"
 *   }
 * }
 * ```
 *
 * @module
 */

import ffmpeg from "file:@jspawn/ffmpeg-wasm/ffmpeg.wasm";
import { initVirtualEnv, readFile, outPath, extname } from "../util.js";

export type Input = {
  /** The audio file to compress. */
  audio: File;
  compress: CompressU;
};

export type CompressU = AutoCompress | ManualCompress;

export const enum Compress {
  Auto = "Auto",
  Manual = "Manual",
}

/** Compress automatically by specifying a compression level. */
export type AutoCompress = {
  type: Compress.Auto;
  /** Select a compression level. `High`:  smallest file size and lowest quality. `Low`: largest file size and highest quality. */
  level: Level;
};

export const enum Level {
  High = "High",
  Medium = "Medium",
  Low = "Low",
}

/** Specify a bitrate manually. */
export type ManualCompress = {
  type: Compress.Manual;
  /** The bitrate in kbit/s. */
  bitrate: integer;
};

export async function main(input: Input): Promise<File> {
  const { venv, paths } = await initVirtualEnv({
    audio: input.audio,
  });

  const compress = parseCompress(input.compress, paths.audio);
  const out = outPath(input.audio, {
    suffix: "-compressed",
  });
  const args = ["-hide_banner", "-i", paths.audio, ...compress, out];

  await venv.run(ffmpeg, args);

  return readFile(out, venv);
}

function parseCompress(compress: CompressU, audioPath: string): string[] {
  switch (compress.type) {
    case Compress.Auto:
      const ext = extname(audioPath).toLowerCase().slice(1);
      switch (ext) {
        case "aac":
        case "m4a":
          return ["-vbr", vbrForAAC(compress.level)];
        case "ogg":
          return ["-q:a", qualityForOGG(compress.level)];
        case "mp3":
          return ["-q:a", qualityForMP3(compress.level)];
        default:
          return ["-b:a", bitrateForExt(ext, compress.level)];
      }
    case Compress.Manual:
      return ["-b:a", `${compress.bitrate}k`];
  }
}

function vbrForAAC(level: Level): string {
  switch (level) {
    case Level.High:
      return "1";
    case Level.Medium:
      return "4";
    case Level.Low:
      return "5";
  }
}

function qualityForOGG(level: Level): string {
  switch (level) {
    case Level.High:
      return "0";
    case Level.Medium:
      return "4";
    case Level.Low:
      return "10";
  }
}

function qualityForMP3(level: Level): string {
  switch (level) {
    case Level.High:
      return "9";
    case Level.Medium:
      return "2";
    case Level.Low:
      return "0";
  }
}

function bitrateForExt(ext: string, level: Level): string {
  switch (ext) {
    case "opus":
      switch (level) {
        case Level.High:
          return "48k";
        case Level.Medium:
          return "96k";
        case Level.Low:
          return "160k";
      }
    case "mmf":
      switch (level) {
        case Level.High:
          return "32k";
        case Level.Medium:
          return "48k";
        case Level.Low:
          return "64k";
      }
    default:
      switch (level) {
        case Level.High:
          return "64k";
        case Level.Medium:
          return "128k";
        case Level.Low:
          return "192k";
      }
  }
}
