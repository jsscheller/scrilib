import examples from "../examples/audio.json" assert { type: "json" };
import { runExamples } from "./shared.js";

describe("audio", function () {
  runExamples("audio", examples, it);
});
