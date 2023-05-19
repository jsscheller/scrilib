import examples from "../examples/image.json" assert { type: "json" };
import { runExamples } from "./shared.js";

describe("image", function () {
  runExamples("image", examples, it);
});
