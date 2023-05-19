import { initVirtualEnv } from "../../util.js";
import { PinchZoom } from "./pinchZoom.js";
import magick from "file:@jspawn/imagemagick-wasm/magick.wasm";
import colorsCSS from "file:../../picker/colors.css";
import normalizeCSS from "file:../../picker/normalize.css";
import stylesCSS from "file:./styles.css";

export type Input = {
  image: File;
};

/** View/zoom/pan images. Supports several image formats.  */
export default class ImageViewer extends HTMLElement {
  input: Input;
  deps: Set<string>;
  connected?: boolean;
  baseEl: HTMLElement;
  statusEl: HTMLElement;
  pinchZoom: PinchZoom;
  canvasEl: HTMLCanvasElement;

  constructor(input: Input) {
    super();

    this.attachShadow({ mode: "open" });

    this.input = input;
    this.deps = new Set([colorsCSS, normalizeCSS, stylesCSS]);
    for (const href of this.deps.values()) {
      this.shadowRoot!.append(
        Object.assign(document.createElement("link"), {
          rel: "stylesheet",
          href,
          onload: () => {
            this.deps.delete(href);
            this.connectedCallback();
          },
        })
      );
    }

    this.baseEl = Object.assign(document.createElement("div"), {
      className: "base",
      style: "display:none",
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
    this.shadowRoot!.append(this.baseEl);
  }

  connectedCallback() {
    if (this.deps.size || this.connected) return;
    this.connected = true;

    this.baseEl.style.display = "";
    this.render();
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
