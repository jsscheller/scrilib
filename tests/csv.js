import * as assert from "assert";
import * as path from "path";
import * as url from "url";
import examples from "../examples/csv.json" assert { type: "json" };
import { runExamples } from "./shared.js";
import * as scrilib from "../out/scrilib/esm.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

describe("csv", function () {
  runExamples("csv", examples, it);

  it("column selection syntax", async function () {
    const { paths, venv } = await scrilib.util.initVirtualEnv({
      csv: path.join(__dirname, "../assets/sample.csv"),
    });
    const testSyntax = async (syntax) => {
      return scrilib.csv.shared.parseColumnSelection(syntax, paths.csv, venv);
    };

    assert.strictEqual(await testSyntax("1"), "0");
    assert.strictEqual(await testSyntax("1,2"), "0,1");
    assert.strictEqual(await testSyntax("-1"), "2");
    assert.strictEqual(await testSyntax("-2"), "1");
    assert.strictEqual(await testSyntax("1..2"), "0,1");
    assert.strictEqual(await testSyntax("..2"), "0,1");
    assert.strictEqual(await testSyntax("1.."), "0,1,2");
    assert.strictEqual(await testSyntax(".."), "0,1,2");
    assert.strictEqual(await testSyntax("..-1"), "0,1,2");
    assert.strictEqual(await testSyntax("1..-1"), "0,1,2");
    assert.strictEqual(await testSyntax("-2.."), "1,2");
    assert.strictEqual(await testSyntax("-2..-1"), "1,2");
    assert.strictEqual(await testSyntax("-1..1"), "2,1,0");

    assert.strictEqual(await testSyntax("foo"), "0");
    assert.strictEqual(await testSyntax("'foo'"), "0");
    assert.strictEqual(await testSyntax("!foo"), "1,2");

    assert.strictEqual(await testSyntax("/FOO/i"), "0");
  });
});
