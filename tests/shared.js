import * as fs from "fs/promises";
import * as path from "path";
import * as url from "url";
import * as scrilib from "../out/scrilib/esm.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export async function runExamples(mod, egs, it) {
  for (const eg of egs) {
    const description = `${eg.key}: ${eg.description}`;
    const callback = async function () {
      await loadFiles(eg, path.join(__dirname, "../examples"));
      const out = await scrilib[mod][eg.key](eg.input);
      if (process.env.OUT) {
        const outDir = path.join(__dirname, "out");
        await fs.mkdir(outDir, { recursive: true });
        const buf = await out.arrayBuffer();
        await fs.writeFile(path.join(outDir, out.name), Buffer.from(buf));
      }
    };
    if (eg.only) {
      it.only(description, callback);
    } else {
      it(description, callback);
    }
  }
}

function loadFiles(json, dirname) {
  const filePrefix = "file://";
  if (Array.isArray(json) || Object.getPrototypeOf(json) === Object.prototype) {
    for (const [key, value] of Object.entries(json)) {
      if (typeof value === "string" && value.startsWith(filePrefix)) {
        const filePath = path.join(dirname, value.slice(filePrefix.length));
        json[key] = filePath;
      } else {
        loadFiles(value, dirname);
      }
    }
  }
}
