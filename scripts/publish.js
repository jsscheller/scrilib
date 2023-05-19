import * as path from "path";
import * as url from "url";
import * as fs from "fs/promises";
import * as child_process from "child_process";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../out");

async function main() {
  for (const pkg of ["scrilib", "audio", "image", "pdf"]) {
    await new Promise((resolve, reject) => {
      child_process
        .spawn(
          "npm",
          ["publish", !process.env.LIVE && "--dry-run"].filter(Boolean),
          {
            stdio: ["pipe", process.stdout, process.stderr],
            cwd: path.join(outDir, pkg),
          }
        )
        .on("close", (code) => {
          code ? reject(code) : resolve();
        });
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
