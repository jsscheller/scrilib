import * as path from "path";
import * as url from "url";
import * as fs from "fs/promises";
import * as child_process from "child_process";
import * as esbuild from "esbuild";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../out");
const typesDir = path.join(outDir, "types");
const entryPoints = [
  "src/index.ts",
  "src/audio/index.ts",
  "src/image/index.ts",
  "src/pdf/index.ts",
  "src/picker/pdfAnnotations/index.ts",
  "src/picker/pdfPages/index.ts",
  "src/viewer/image/index.ts",
];

async function main() {
  try {
    await fs.rm(outDir, { recursive: true });
  } catch (_) {}
  await fs.mkdir(outDir, { recursive: true });

  await genTypes();

  for (const entryPoint of entryPoints) {
    const name =
      entryPoint === "src/index.ts"
        ? "scrilib"
        : entryPoint.split("/").slice(1, -1).map(kebab).join("-");

    if (process.argv[2] && name !== process.argv[2]) {
      continue;
    }
    await bundle(name, entryPoint);
  }
}

async function genTypes() {
  await new Promise((resolve, reject) => {
    const tsc = path.join(__dirname, "../node_modules/typescript/bin/tsc");
    child_process
      .spawn(tsc, ["--emitDeclarationOnly", "--outDir", typesDir], {
        stdio: ["pipe", process.stdout, process.stderr],
      })
      .on("close", (code) => {
        code ? reject(code) : resolve();
      });
  });
}

const HEADER = {
  esm: `import * as buffer from "buffer";
import * as path from "path";
import * as url from "url";
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const File = buffer.File || function (bits, name) {
  return Object.assign(new buffer.Blob(bits), { name });
};

function ASSET_URL(name) {
  return path.join(__dirname, name);
}`,
  cjs: `const buffer = require("buffer");
const path = require("path");

const File = buffer.File || function (bits, name) {
  return Object.assign(new buffer.Blob(bits), { name });
};

function ASSET_URL(name) {
  return path.join(__dirname, name);
}`,
};

async function bundle(name, entryPoint) {
  const bundleDir = path.join(outDir, name);

  const includeFiles = new Set();
  const includeDirs = new Set();

  const formats = process.env.BROWSER ? ["iife"] : ["esm", "cjs"];
  for (const format of formats) {
    await esbuild.build({
      entryPoints: [entryPoint],
      outdir: `out/${name}`,
      bundle: true,
      write: true,
      format,
      globalName: format === "iife" ? "main" : undefined,
      plugins: [dirPlugin(includeDirs), filePlugin(includeFiles)],
    });

    const indexPath = path.join(bundleDir, "index.js");
    let index = (await fs.readFile(indexPath)).toString();
    index =
      (HEADER[format] || "") + index.replaceAll(path.join(__dirname, ".."), "");
    await fs.writeFile(indexPath, index);
    if (!process.env.BROWSER) {
      await fs.rename(indexPath, path.join(bundleDir, `${format}.js`));
    }
  }

  if (process.env.BROWSER) {
    await fs.cp(
      path.join(__dirname, "../node_modules/@jspawn/jspawn/worker.js"),
      path.join(bundleDir, "jspawnWorker.js")
    );
  }

  for (const filePath of includeFiles) {
    const basename = path.basename(filePath);
    await fs.cp(filePath, path.join(bundleDir, basename));
    if (filePath.endsWith(".wasm") && filePath.includes("@jspawn")) {
      await fs.cp(
        filePath.replace(".wasm", ".js"),
        path.join(bundleDir, basename.replace(".wasm", ".js"))
      );
      try {
        await fs.cp(
          filePath.replace(".wasm", ".worker.js"),
          path.join(bundleDir, basename.replace(".wasm", ".worker.js"))
        );
      } catch (_) {}
    }
  }

  for (const dirPath of includeDirs) {
    await fs.cp(dirPath, path.join(bundleDir, path.basename(dirPath)), {
      recursive: true,
    });
  }

  if (!process.env.BROWSER) {
    const buf = await fs.readFile(path.join(__dirname, "../package.json"));
    const pkg = JSON.parse(buf.toString());
    pkg.name += `/${name}`;
    await fs.writeFile(
      path.join(bundleDir, "package.json"),
      JSON.stringify(pkg, null, 2)
    );

    await fs.cp(typesDir, path.join(bundleDir, "types"), { recursive: true });
  }
}

const dirPlugin = (dirs) => ({
  name: "dir",
  setup: (build) => {
    build.onResolve({ filter: /^(dir|_dir):/ }, async (args) => {
      const dirPath = resolveImportPath(args.path, args.resolveDir);
      let rootDir;
      if (args.path.startsWith("_")) {
        const [_, base] = args.path.split(":");
        rootDir = path.join(base, path.basename(dirPath));
      } else {
        dirs.add(dirPath);
        rootDir = path.basename(dirPath);
      }
      return {
        path: dirPath,
        namespace: "dir-stub",
        pluginData: {
          resolveDir: args.resolveDir,
          rootDir,
        },
      };
    });

    build.onLoad({ filter: /.*/, namespace: "dir-stub" }, async (args) => {
      const ents = await fs.readdir(args.path, { withFileTypes: true });
      const imps = [];
      const exps = [];
      for (const [index, ent] of ents.entries()) {
        const entPath = path.join(args.path, ent.name);
        if (ent.isFile()) {
          imps.push(
            `import import${index} from "_file:${args.pluginData.rootDir}:${entPath}"`
          );
        } else {
          imps.push(
            `import import${index} from "_dir:${args.pluginData.rootDir}:${entPath}"`
          );
        }
        exps.push(`"${ent.name}": import${index},`);
      }

      const contents = `${imps.join("\n")}
        const dir = {
          ${exps.join("\n")}
        };
        export default dir;`;
      return { contents, resolveDir: args.pluginData.resolveDir };
    });
  },
});

const filePlugin = (files) => ({
  name: "file",
  setup: (build) => {
    build.onResolve({ filter: /^(file|_file):/ }, async (args) => {
      const filePath = resolveImportPath(args.path, args.resolveDir);
      let exportPath = path.basename(args.path);
      if (args.path.startsWith("_")) {
        const [_, rootDir] = args.path.split(":");
        exportPath = `${rootDir}/${exportPath}`;
      } else {
        files.add(filePath);
      }
      return {
        path: filePath,
        namespace: "file-stub",
        pluginData: {
          exportPath,
        },
      };
    });

    build.onLoad({ filter: /.*/, namespace: "file-stub" }, async (args) => {
      let contents;
      if (process.env.BROWSER) {
        contents = `export default "/${args.pluginData.exportPath}";`;
      } else {
        contents = `export default ASSET_URL("${args.pluginData.exportPath}");`;
      }
      return { contents };
    });
  },
});

function resolveImportPath(importPath, resolveDir) {
  importPath = importPath.split(":").pop();
  if (path.isAbsolute(importPath)) {
    return importPath;
  } else if (importPath.startsWith(".")) {
    return path.resolve(resolveDir, importPath);
  } else {
    return path.join(__dirname, "../node_modules", importPath);
  }
}

function kebab(s) {
  let acc = "";
  let prev;
  for (const c of s.split("")) {
    const test = c.toUpperCase() === c;
    if (test) {
      acc += `${acc.length !== 0 && !prev ? "-" : ""}${c.toLowerCase()}`;
    } else {
      acc += c;
    }
    prev = test;
  }
  return acc;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
