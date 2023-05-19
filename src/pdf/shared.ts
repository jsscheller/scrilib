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

export const enum Filter {
  Even,
  Odd,
}

export async function parsePageSelection(
  s: string,
  path: string,
  venv: VirtualEnv,
  filter?: Filter
): Promise<string> {
  const dotdot = "..";
  let pageCount: number;
  const getCachedPageCount = async () => {
    if (pageCount) return pageCount;
    return (pageCount = await getPageCount(path, venv));
  };
  try {
    const items = s.split(",");
    let parsed = [];
    for (const item of items) {
      if (item.includes(dotdot)) {
        const [startS, endS] = item.split(dotdot);
        const start = await parsePageNumber(startS, getCachedPageCount);
        const end = await parsePageNumber(endS, getCachedPageCount);
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
        const n = await parsePageNumber(s, getCachedPageCount);
        parsed.push(n);
      }
    }
    if (filter) {
      parsed = parsed.filter((n) => {
        const even = n % 2 === 0;
        if (filter === Filter.Odd) {
          return !even;
        }
        return even;
      });
    }
    return parsed.join(",");
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
