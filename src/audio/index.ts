/**
 * ### [Time duration syntax](#time-duration-syntax)
 *
 * Time-duration syntax takes two forms:
 *
 * - Specify a timestamp - eg. `00:04:15`.
 * - Specify the number of seconds (with optional unit) - eg. `55` or `200ms`.
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
 *
 * ### [Codecs, bitrate and sample-rate for audio formats](#codecs-bitrate-sample-rate)
 *
 * | Format | Codecs | Bitrate | Sample-rate |
 * | --- | --- | --- | --- |
 * | AAC | AAC | 32-320 kbps | 8000-48000 Hz |
 * | AIFF | PCM_S16BE (default), PCM_S24BE, PCM_S32BE | N/A | 8000-192000 Hz |
 * | FLAC | FLAC | N/A | 8000-192000 Hz |
 * | M4A | AAC (default), ALAC | 32-320 kbps (AAC), N/A (ALAC) | 8000-48000 Hz |
 * | MMF | ADPCM_YAMAHA | N/A | 8000-48000 Hz |
 * | MP3 | LIBMP3LAME | 32-320 kbps | 8000-48000 Hz |
 * | OGG | LIBVORBIS | 64-500 kbps | 8000-192000 Hz |
 * | OPUS | LIBOPUS | 6-510 kbps | 8000-48000 Hz |
 * | WAV | PCM_S16LE (default), PCM_S24LE, PCM_S32LE | N/A | 8000-192000 Hz |
 * | WMA | WMAV2 | 48-192 kbps | 8000-48000 Hz |
 *
 * @module
 */

export { main as convert } from "./convert.js";
export * as _convert from "./convert.js";
export { main as merge } from "./merge.js";
export * as _merge from "./merge.js";
export { main as trim } from "./trim.js";
export * as _trim from "./trim.js";
export { main as waveform } from "./waveform.js";
export * as _waveform from "./waveform.js";
