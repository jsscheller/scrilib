import * as assert from "assert";
import * as path from "path";
import * as url from "url";
import { runExamples } from "./shared.js";
import * as scrilib from "../out/scrilib/esm.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

describe("pdf", function () {
  runExamples("pdf", it);

  it("page selection syntax", async function () {
    const { paths, venv } = await scrilib.util.initVirtualEnv({
      pdf: path.join(__dirname, "../assets/sample.pdf"),
    });
    const testSyntax = async (syntax) => {
      return scrilib.pdf.shared.parsePageSelection(syntax, paths.pdf, venv);
    };

    assert.strictEqual(await testSyntax("1"), "1");
    assert.strictEqual(await testSyntax("-1"), "4");
    assert.strictEqual(await testSyntax("-2"), "3");
    assert.strictEqual(await testSyntax("1..2"), "1,2");
    assert.strictEqual(await testSyntax("..2"), "1,2");
    assert.strictEqual(await testSyntax("1.."), "1,2,3,4");
    assert.strictEqual(await testSyntax(".."), "1,2,3,4");
    assert.strictEqual(await testSyntax("..-1"), "1,2,3,4");
    assert.strictEqual(await testSyntax("1..-1"), "1,2,3,4");
    assert.strictEqual(await testSyntax("-2.."), "3,4");
    assert.strictEqual(await testSyntax("-2..-1"), "3,4");
    assert.strictEqual(await testSyntax("-1..1"), "4,3,2,1");
  });
});
