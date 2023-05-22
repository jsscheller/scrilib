import { VirtualEnv } from "@jspawn/jspawn";
import qsv from "file:@jspawn/qsv-wasm/qsv.wasm";

export async function parseColumnSelection(
  s: string,
  path: string,
  venv: VirtualEnv,
  zeroIndex: boolean = true
): Promise<string> {
  try {
    return new ColumnSelectionParser(path, venv).parse(s, zeroIndex);
  } catch (err) {
    let msg = "invalid column-selection syntax";
    if (typeof err === "string") {
      msg += `: ${err}`;
    }
    throw msg;
  }
}

class ColumnSelectionParser {
  path: string;
  venv: VirtualEnv;
  cols?: string[];

  constructor(path: string, venv: VirtualEnv) {
    this.path = path;
    this.venv = venv;
  }

  async parse(s: string, zeroIndex: boolean): Promise<string> {
    const parsed = [];
    const dotdot = "..";
    let offset = 0;
    while (offset < s.length) {
      let segEnd, quoted;
      if (s[offset] === "'") {
        quoted = true;
        segEnd = indexOfUnescaped(s, "'", offset + 1) + 1;
      } else {
        segEnd = s.indexOf(",", offset);
        if (segEnd === -1) segEnd = s.length;
      }
      let seg = s.slice(offset, segEnd);
      if (quoted) seg = seg.slice(1, -1).replaceAll("\\'", "'");
      offset = segEnd + 1;

      const parsedLen = parsed.length;
      let negate;
      if (seg.startsWith("!")) {
        negate = true;
        seg = seg.slice(1);
      }

      if (seg.length === 0) {
        throw "expected a non-empty string";
      }

      if (seg.startsWith("/")) {
        const close = seg.lastIndexOf("/");
        if (close === -1) {
          throw "unable to find closing-slash for regular expression";
        }
        const regex = new RegExp(seg.slice(1, close), seg.slice(close + 1));
        const cols = await this.getColumns();
        for (const [index, col] of cols.entries()) {
          if (regex.test(col)) {
            parsed.push(index);
          }
        }
      } else {
        const split = seg.includes(dotdot)
          ? seg.split(dotdot).filter((x) => x !== "")
          : undefined;
        if (
          split &&
          split.length <= 2 &&
          split.every((x) => !isNaN(parseInt(x)))
        ) {
          const startRaw = seg.startsWith(dotdot) ? "1" : split[0];
          const start = await this.parseColumnIndex(startRaw);
          const endRaw = seg.endsWith(dotdot) ? "-1" : split.pop()!;
          const end = await this.parseColumnIndex(endRaw);
          if (start < end) {
            for (let i = start; i <= end; i++) {
              parsed.push(i - 1);
            }
          } else {
            for (let i = start; i >= end; i--) {
              parsed.push(i - 1);
            }
          }
        } else if (!isNaN(parseInt(seg))) {
          const n = await this.parseColumnIndex(seg);
          parsed.push(n - 1);
        } else {
          const cols = await this.getColumns();
          const index = cols.findIndex((x) => x === seg);
          if (index === -1) {
            throw `unable to find column named: ${seg}`;
          }
          parsed.push(index);
        }
      }

      if (negate) {
        const cols = await this.getColumns();
        const slice = parsed.slice(parsedLen);
        for (let i = 0; i < cols.length; i++) {
          if (!slice.includes(i)) {
            parsed.push(i);
          }
        }
        parsed.splice(parsedLen, slice.length);
      }
    }
    return parsed.map((x) => (zeroIndex ? x : x + 1)).join(",");
  }

  async parseColumnIndex(s: string): Promise<number> {
    let n = parseInt(s);
    if (isNaN(n)) throw "expected a number";
    if (n < 0) {
      const cols = await this.getColumns();
      n = cols.length + n + 1;
      if (n < 0) throw "negative numbers cannot exceed the number of columns";
    }
    return n;
  }

  async getColumns(): Promise<string[]> {
    if (this.cols) return this.cols;
    return (this.cols = await getColumns(this.path, this.venv));
  }
}

function indexOfUnescaped(s: string, needle: string, offset: number): number {
  while (true) {
    const index = s.indexOf(needle, offset);
    offset = index + 1;
    if (index === -1) throw `unable to find closing ${needle}`;
    if (s[index - 1] === "\\") continue;
    return index;
  }
}

export async function getColumns(
  path: string,
  venv: VirtualEnv
): Promise<string[]> {
  const output = await venv.run(qsv, [
    "headers",
    "--just-names",
    "--trim",
    path,
  ]);
  return output.stdout.split("\n");
}
