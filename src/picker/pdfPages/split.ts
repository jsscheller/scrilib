import { Dimensions } from "./index.js";
import * as icons from "./icons.js";

export class Split {
  baseEl: HTMLElement;
  lineEl: HTMLElement;
  iconEl: HTMLElement;
  active?: boolean;

  constructor(dims: Dimensions) {
    this.baseEl = Object.assign(document.createElement("div"), {
      className: "split",
      style: `margin-left: ${dims.pageWidth}px; width: ${dims.gap}px; height: ${dims.pageHeight}px`,
      onclick: this.onBaseClick.bind(this),
    });
    this.lineEl = Object.assign(document.createElement("div"), {
      className: "split-line",
    });
    this.iconEl = Object.assign(document.createElement("div"), {
      className: "split-icon",
      innerHTML: icons.svg(icons.split),
    });
    this.baseEl.append(this.lineEl, this.iconEl);
  }

  remove() {
    this.baseEl.remove();
  }

  onBaseClick(_: Event) {
    this.active = !this.active;
    this.lineEl.classList.toggle("active", this.active);
    this.iconEl.classList.toggle("active", this.active);
  }
}
