import { CodecU, FormatU, Format } from "./convert.js";

export function pushFormatArgs(
  input: {
    format?: FormatU;
    codec?: CodecU;
    sample_rate?: integer;
    bitrate?: integer;
  },
  args: string[]
) {
  const codec = input.codec
    ? input.codec.type.toLowerCase()
    : defaultCodec(input.format!);
  args.push("-c:a", codec);

  if (input.bitrate) {
    args.push("-b:a", `${input.bitrate}k`);
  }
  if (input.sample_rate) {
    args.push("-ar", input.sample_rate.toString());
  }

  const codecOpts = input.codec as any;
  if (codecOpts) {
    if (codecOpts.quality) {
      args.push("-q:a", codecOpts.quality.toString());
    }
    if (codecOpts.compression) {
      args.push("-compression_level", codecOpts.compression.toString());
    }
    if (codecOpts.vbr) {
      args.push("-vbr", codecOpts.vbr);
    }
    if (codecOpts.frame_duration) {
      args.push("-frame_duration", codecOpts.frame_duration.toString());
    }
  }
}

function defaultCodec(format: FormatU): string {
  switch (format.type) {
    case Format.AAC:
      return "aac";
    case Format.AIFF:
      return "pcm_s16be";
    case Format.FLAC:
      return "flac";
    case Format.M4A:
      return "aac";
    case Format.MMF:
      return "adpcm_yamaha";
    case Format.MP3:
      return "libmp3lame";
    case Format.OGG:
      return "libvorbis";
    case Format.OPUS:
      return "libopus";
    case Format.WAV:
      return "pcm_s16le";
    case Format.WMA:
      return "wmav2";
  }
}
