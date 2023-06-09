import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";
import * as url from "url";
import * as scrilib from "../out/scrilib/esm.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export function runExamples(mod, it) {
  const examples = readExamples(mod);
  for (const eg of examples) {
    const description = `${eg.key}: ${eg.description}`;
    const callback = async function () {
      await loadFiles(eg);
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

function readExamples(mod) {
  let examples = [];
  const modPath = path.join(__dirname, "../src", mod);
  const ents = fsSync.readdirSync(modPath);
  for (const ent of ents) {
    const filePath = path.join(modPath, ent);
    const s = fsSync.readFileSync(filePath).toString();
    examples = examples.concat(
      parseExamples(s, filePath).map((example) => {
        example.key = ent.split(".")[0];
        return example;
      })
    );
  }
  return examples;
}

function parseExamples(s, filePath) {
  const parsed = [];
  const commentStart = s.indexOf("/**\n *");
  if (commentStart === -1) return parsed;
  const commentEnd = s.indexOf("\n */\n");
  const comment = s
    .slice(commentStart, commentEnd)
    .split("\n")
    .map((x) => x.trim().slice(1).trim())
    .join("\n");
  const examplesTag = "### Examples";
  let examplesStart = comment.indexOf(examplesTag);
  if (examplesStart == -1) return parsed;
  let slice = comment.slice(examplesStart + examplesTag.length).trim();
  const codeTag = "```";
  while (slice.length) {
    const codeStart = slice.indexOf(codeTag);
    if (codeStart === -1) break;
    const description = slice.slice(0, codeStart).trim();
    const codeEnd = slice.indexOf(codeTag, codeStart + 1);
    let input;
    try {
      input = JSON.parse(
        slice.slice(codeStart + codeTag.length, codeEnd).trim()
      );
    } catch (err) {
      console.log(`invalid JSON: ${filePath}`);
      throw err;
    }
    parsed.push({ description, input });
    slice = slice.slice(codeEnd + codeTag.length);
  }
  return parsed;
}

function loadFiles(json) {
  if (Array.isArray(json) || Object.getPrototypeOf(json) === Object.prototype) {
    for (const [key, value] of Object.entries(json)) {
      if (value.$file) {
        const filePath = path.join(__dirname, "..", value.$file);
        json[key] = filePath;
      } else {
        loadFiles(value);
      }
    }
  }
}
