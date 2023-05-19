import { VirtualEnv, setWorkerURL } from "@jspawn/jspawn";

export async function initVirtualEnv(files: {
  [path: string]: FileSource | string | any;
}): Promise<{
  venv: VirtualEnv;
  paths: { [path: string]: string | any };
}> {
  // Fixes an issue (encountered in Firefox) where BLOB-workers aren't controlled by the service worker.
  // This only takes effect in the browser.
  setWorkerURL("/jspawnWorker.js");

  const work: { [path: string]: FileSource | any } = {};
  const paths = accPaths(files, "~/work/", work);
  const venv = await VirtualEnv.instantiate({
    fs: {
      work,
      out: {},
    },
  });
  await venv.chdir("work");
  return { venv, paths };
}

function accPaths(
  files: { [path: string]: FileSource | string | any },
  prefix: string,
  dir: { [path: string]: FileSource | any }
): { [path: string]: string | any } {
  const paths: { [path: string]: string | any } = {};
  for (const [key, file] of Object.entries(files)) {
    if (isPlainObject(file) && !file.name) {
      dir[key] = {};
      const childPaths = accPaths(file, `${prefix}${key}/`, dir[key]);
      paths[key] = childPaths;
    } else {
      const name = basename(file);
      dir[name] = file;
      paths[key] = `${prefix}${name}`;
    }
  }
  return paths;
}

function isPlainObject(x: any): boolean {
  try {
    return Object.getPrototypeOf(x) === Object.prototype;
  } catch (_) {
    return false;
  }
}

type OutPathOptions = {
  ext?: string;
  suffix?: string;
};

export function outPath(file: FileSource, opts: OutPathOptions = {}): string {
  let name = basename(file);
  if (opts.ext) {
    name = replaceExt(name, opts.ext);
  }
  if (opts.suffix) {
    name = addSuffix(name, opts.suffix);
  }
  return `~/out/${name}`;
}

export function replaceExt(path: string, ext: string): string {
  let lastDot = path.lastIndexOf(".");
  if (lastDot === -1) {
    lastDot = path.length - 1;
  }
  return path.slice(0, lastDot + 1) + ext;
}

export function addSuffix(path: string, suffix: string): string {
  const name = path.split("/").pop()!;
  let stem = name;
  let ext = "";
  const lastDot = name.lastIndexOf(".");
  if (lastDot > -1) {
    stem = name.slice(0, lastDot);
    ext = name.slice(lastDot);
  }
  return `${stem}${suffix}${ext}`;
}

export async function readFile(path: string, venv: VirtualEnv): Promise<File> {
  const blob = await venv.fs.readFileToBlob(path);
  const name = path.split("/").pop()!;
  return new File([blob], name);
}

export function basename(file: FileSource): string {
  // TODO: windows
  if (typeof file === "string") {
    return file.split("/").pop() as string;
  } else {
    return file.name;
  }
}
