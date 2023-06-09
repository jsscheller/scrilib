/**
 * ### [Column-selection syntax](#column-selection-syntax)
 *
 * Examples:
 *
 * |  |  |
 * | --- | --- |
 * | `1,4` | first and fourth column |
 * | `1..4` | columns 1 through 4 |
 * | `4..1` | columns 4 through 1 |
 * | `!1..2` | all columns expect the first two |
 * | `Foo` | columns named `Foo` |
 * | `/foo/i` | columns containing `foo` (ignoring case) |
 *
 * @module
 */

export { main as behead } from "./behead.js";
export * as _behead from "./behead.js";
export { main as merge } from "./merge.js";
export * as _merge from "./merge.js";
export { main as count } from "./count.js";
export * as _count from "./count.js";
export { main as dedup } from "./dedup.js";
export * as _dedup from "./dedup.js";
export { main as diff } from "./diff.js";
export * as _diff from "./diff.js";
export { main as sort } from "./sort.js";
export * as _sort from "./sort.js";
export { main as pad } from "./pad.js";
export * as _pad from "./pad.js";
export { main as freq } from "./freq.js";
export * as _freq from "./freq.js";
export { main as fill } from "./fill.js";
export * as _fill from "./fill.js";

export * as shared from "./shared.js";
