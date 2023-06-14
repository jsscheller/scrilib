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
