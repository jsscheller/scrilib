/**
 * View/zoom/pan images. Supports several image formats.
 *
 * ### Examples
 *
 * tree.jpg
 *
 * ```
 * {
 *   "image": { "$file": "/assets/tree.jpg" }
 * }
 * ```
 *
 * @module
 */

import "file:../../picker/colors.css";
import "file:../../picker/normalize.css";
import "file:./styles.css";
import "file:./index.html";
import "file:../../initListener.js";
import { initVirtualEnv } from "../../util.js";
import { PinchZoom } from "./pinchZoom.js";
import magick from "file:@jspawn/imagemagick-wasm/magick.wasm";

export type Input = {
  image: File;
};

export async function init(input: Input) {
  const imageViewer = new ImageViewer(input, document.body);
  await imageViewer.render();
}

class ImageViewer {
  input: Input;
  baseEl: HTMLElement;
  statusEl: HTMLElement;
  pinchZoom: PinchZoom;
  canvasEl: HTMLCanvasElement;

  constructor(input: Input, slotEl: HTMLElement) {
    this.input = input;

    this.baseEl = Object.assign(document.createElement("div"), {
      className: "base",
    });
    this.statusEl = Object.assign(document.createElement("div"), {
      className: "status",
      innerText: "Loading...",
    });
    const statusContainerEl = Object.assign(document.createElement("div"), {
      className: "status-container",
    });
    statusContainerEl.append(this.statusEl);
    this.pinchZoom = new PinchZoom();
    this.canvasEl = Object.assign(document.createElement("canvas"), {
      className: "canvas",
    });

    this.baseEl.append(this.pinchZoom.baseEl, statusContainerEl);
    slotEl.append(this.baseEl);
  }

  async render() {
    const { venv, paths } = await initVirtualEnv({ image: this.input.image });

    try {
      const output = await venv.run(magick, [
        "identify",
        "-format",
        "%wx%h\n",
        paths.image,
      ]);
      const [width, height] = output
        .stdout!.split("\n")
        .pop()!
        .split("x")
        .map((n) => parseInt(n));

      const rgbaPath = "image.rgba";
      await venv.run(magick, [paths.image, "-depth", "8", rgbaPath]);
      const blob = await venv.fs.readFileToBlob(rgbaPath);
      const buf = await blob.arrayBuffer();
      const u8 = new Uint8ClampedArray(buf);
      const data = new ImageData(u8, width, height);

      this.canvasEl.width = width;
      this.canvasEl.height = height;
      const cx = this.canvasEl.getContext("2d")!;
      cx.putImageData(data, 0, 0);

      this.statusEl.style.display = "none";

      this.pinchZoom.append(this.canvasEl);

      const padding = 30;
      let scale = (this.baseEl.clientWidth - padding) / width;
      scale = Math.min(scale, (this.baseEl.clientHeight - padding) / height);
      scale = Math.min(scale, 1);
      const x = (width * scale - width) / -2;
      const y = (height * scale - height) / -2;
      this.pinchZoom.setTransform({ scale, x, y });
    } catch (err) {
      console.error(err);
      this.statusEl.innerText = "Unable to load image";
    }
  }
}
