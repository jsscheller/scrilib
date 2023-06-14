/**
 * Convert between audio formats.
 *
 * ### Examples
 *
 * Convert an audio file to MP3.
 *
 * ```
 * {
 *   "audio": { "$file": "/assets/sample.ogg" },
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
import { pushFormatArgs } from "./shared.js";

export type Input = {
  /** The audio file to convert. */
  audio: File;
  /** Each format is compatible with one or more codecs and an acceptable bitrate/sample-rate range - see [here](./#codecs-bitrate-sample-rate) for more details. Leave these options blank to use default values which should produce acceptable output. */
  format: FormatU;
  codec?: CodecU;
  bitrate?: integer;
  sample_rate?: integer;
};

export type FormatU =
  | AACFormat
  | AIFFFormat
  | FLACFormat
  | M4AFormat
  | MMFFormat
  | MP3Format
  | OGGFormat
  | OPUSFormat
  | WAVFormat
  | WMAFormat;

export const enum Format {
  AAC = "AAC",
  AIFF = "AIFF",
  FLAC = "FLAC",
  M4A = "M4A",
  MMF = "MMF",
  MP3 = "MP3",
  OGG = "OGG",
  OPUS = "OPUS",
  WAV = "WAV",
  WMA = "WMA",
}

export type AACFormat = {
  type: Format.AAC;
};

export type AIFFFormat = {
  type: Format.AIFF;
};

export type FLACFormat = {
  type: Format.FLAC;
};

export type M4AFormat = {
  type: Format.M4A;
};

export type MMFFormat = {
  type: Format.MMF;
};

export type MP3Format = {
  type: Format.MP3;
};

export type OGGFormat = {
  type: Format.OGG;
};

export type OPUSFormat = {
  type: Format.OPUS;
};

export type WAVFormat = {
  type: Format.WAV;
};

export type WMAFormat = {
  type: Format.WMA;
};

export const enum Codec {
  AAC = "AAC",
  PCM_S16BE = "PCM_S16BE",
  PCM_S24BE = "PCM_S24BE",
  PCM_S32BE = "PCM_S32BE",
  FLAC = "FLAC",
  ALAC = "ALAC",
  ADPCM_YAMAHA = "ADPCM_YAMAHA",
  LIBMP3LAME = "LIBMP3LAME",
  LIBVORBIS = "LIBVORBIS",
  LIBOPUS = "LIBOPUS",
  PCM_S16LE = "PCM_S16LE",
  PCM_S24LE = "PCM_S24LE",
  PCM_S32LE = "PCM_S32LE",
  WMAV2 = "WMAV2",
}

export type CodecU =
  | AACCodec
  | PCM_S16BECodec
  | PCM_S24BECodec
  | PCM_S32BECodec
  | PCM_S16LECodec
  | PCM_S24LECodec
  | PCM_S32LECodec
  | FLACCodec
  | ALACCodec
  | ADPCM_YAMAHACodec
  | LIBMP3LAMECodec
  | LIBVORBISCodec
  | LIBOPUSCodec
  | WMAV2Codec;

export type AACCodec = {
  type: Codec.AAC;
  /** Quality level (0.1-2). Default: 0.5. Higher values result in better quality and larger files. */
  quality?: number;
};

export type PCM_S16BECodec = {
  type: Codec.PCM_S16BE;
};

export type PCM_S24BECodec = {
  type: Codec.PCM_S24BE;
};

export type PCM_S32BECodec = {
  type: Codec.PCM_S32BE;
};

export type PCM_S16LECodec = {
  type: Codec.PCM_S16LE;
};

export type PCM_S24LECodec = {
  type: Codec.PCM_S24LE;
};

export type PCM_S32LECodec = {
  type: Codec.PCM_S32LE;
};

export type FLACCodec = {
  type: Codec.FLAC;
  /** Compression level (0-12). Default: 5. Higher values result in better compression and slower encoding. */
  compression?: integer;
};

export type ALACCodec = {
  type: Codec.ALAC;
};

export type ADPCM_YAMAHACodec = {
  type: Codec.ADPCM_YAMAHA;
};

export type LIBMP3LAMECodec = {
  type: Codec.LIBMP3LAME;
  /** Quality level (0-9). Default: 4. Lower values result in better quality and larger files. */
  quality?: integer;
  /** Compression level (0-9). Default: 5. Higher values result in slower encoding. */
  compression?: integer;
};

export type LIBVORBISCodec = {
  type: Codec.LIBVORBIS;
  /** Quality level (-1-10). Default: 3. Higher values result in better quality and larger files. */
  quality?: integer;
};

export type LIBOPUSCodec = {
  type: Codec.LIBOPUS;
  /** Enable/disable Variable Bit Rate encoding. Default: `On`. */
  vbr?: VariableBitRate;
  /** Compression level (0-10). Default: 10. Higher values result in better compression and slower encoding. */
  compression?: integer;
  /** Frame duration in ms. Default: 20. Choices: 2.5, 5, 10, 20, 40, 60. */
  frame_duration?: integer;
};

export const enum VariableBitRate {
  On = "On",
  Off = "Off",
  Constrained = "Constrained",
}

export type WMAV2Codec = {
  type: Codec.WMAV2;
  /** Quality level (0-100). Default: 50. Higher values result in better quality and larger files. */
  quality?: integer;
};

export async function main(input: Input): Promise<File> {
  const { venv, paths } = await initVirtualEnv({ audio: input.audio });

  const args = ["-hide_banner", "-i", paths.audio];
  pushFormatArgs(input, args);

  const out = outPath(input.audio, {
    ext: input.format.type.toLowerCase(),
  });
  args.push(out);

  await venv.run(ffmpeg, args);

  return readFile(out, venv);
}
