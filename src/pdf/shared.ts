import { VirtualEnv } from "@jspawn/jspawn";
import qpdf from "file:@jspawn/qpdf-wasm/qpdf.wasm";

export function simplifyPageSelection(pages: number[]): string {
  const simplified = [];
  for (let i = 0; i < pages.length; i++) {
    const start = pages[i];
    let end = start;
    while (pages[i + 1] === end + 1) {
      end += 1;
      i += 1;
    }
    if (start === end) {
      while (pages[i + 1] === end - 1) {
        end -= 1;
        i += 1;
      }
    }
    if (start !== end) {
      simplified.push(`${start}..${end}`);
    } else {
      simplified.push(start);
    }
  }
  return simplified.join(",");
}

export async function getPageCount(
  path: string,
  venv: VirtualEnv
): Promise<number> {
  const output = await venv.run(qpdf, [
    "--warning-exit-0",
    "--show-npages",
    path,
  ]);
  return parseInt(output.stdout);
}

export async function parsePageSelection(
  s: string,
  path: string,
  venv: VirtualEnv
): Promise<string> {
  const sel = await parsePageSelectionArray(s, path, venv);
  return sel.join(",");
}

export async function parsePageSelectionArray(
  s: string,
  path: string,
  venv: VirtualEnv
): Promise<number[]> {
  const dotdot = "..";
  let pageCount: number;
  const getCachedPageCount = async () => {
    if (pageCount) return pageCount;
    return (pageCount = await getPageCount(path, venv));
  };
  try {
    const segs = s.split(",").map((x) => x.trim());
    let parsed = [];
    for (const seg of segs) {
      if (seg.includes(dotdot)) {
        const split = seg.split(dotdot);
        const startRaw = seg.startsWith(dotdot) ? "1" : split[0];
        const start = await parsePageNumber(startRaw, getCachedPageCount);
        const endRaw = seg.endsWith(dotdot) ? "-1" : split.pop()!;
        const end = await parsePageNumber(endRaw, getCachedPageCount);
        if (start < end) {
          for (let i = start; i <= end; i++) {
            parsed.push(i);
          }
        } else {
          for (let i = start; i >= end; i--) {
            parsed.push(i);
          }
        }
      } else {
        const n = await parsePageNumber(seg, getCachedPageCount);
        parsed.push(n);
      }
    }
    return parsed;
  } catch (_) {
    throw "Invalid page-selection syntax.";
  }
}

async function parsePageNumber(
  s: string,
  getCachedPageCount: () => Promise<number>
): Promise<number> {
  let n = parseInt(s);
  if (isNaN(n)) throw 1;
  if (n < 0) {
    const pageCount = await getCachedPageCount();
    n = pageCount + n + 1;
    if (n < 0) throw 2;
  }
  return n;
}
