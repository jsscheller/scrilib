import examples from "../examples/pdf.json" assert { type: "json" };
import { runExamples } from "./shared.js";

describe("pdf", function () {
  runExamples("pdf", examples, it);
});
