import { Input } from "./index.js";
import { Page } from "./page.js";
import * as icons from "./icons.js";

type Delegate = {
  didRemovePage: (page: Page, e: MouseEvent) => void;
};

export class PageToolbar {
  input: Input;
  del: Delegate;
  page?: Page;
  baseEl: HTMLElement;
  isEmpty: boolean;

  constructor(input: Input, del: Delegate) {
    this.input = input;
    this.del = del;

    this.baseEl = Object.assign(document.createElement("div"), {
      style: "display: none",
      className: "page-toolbar",
      onmousemove: this.onMouseMove.bind(this),
      onmousedown: this.onMouseDown.bind(this),
    });
    if (this.input.allow_rotate) {
      const rotateEl = Object.assign(document.createElement("button"), {
        className: "page-toolbar-btn",
        innerHTML: icons.svg(icons.rotate),
        onclick: this.onRotateClick.bind(this),
      });
      const rotateCounterEl = Object.assign(document.createElement("button"), {
        className: "page-toolbar-btn",
        innerHTML: icons.svg(icons.rotateCounter),
        onclick: this.onRotateCounterClick.bind(this),
      });
      this.baseEl.append(rotateEl, rotateCounterEl);
    }
    if (this.input.allow_remove) {
      const removeEl = Object.assign(document.createElement("button"), {
        className: "page-toolbar-btn",
        innerHTML: icons.svg(icons.remove),
        onclick: this.onRemoveClick.bind(this),
      });
      this.baseEl.append(removeEl);
    }
    this.isEmpty = this.baseEl.children.length === 0;
  }

  show(page: Page) {
    this.page = page;
    if (this.isEmpty) return;

    const rect = page.rect();
    Object.assign(this.baseEl.style, {
      transform: `translate(${rect.x1}px, ${rect.y2}px) translate(-8px, -35px)`,
      display: "",
    });
  }

  hide() {
    this.baseEl.style.display = "none";
  }

  onMouseMove(e: Event) {
    e.stopPropagation();
  }

  onMouseDown(e: Event) {
    e.stopPropagation();
  }

  onRotateClick(_: Event) {
    this.page!.updateRotate(false);
  }

  onRotateCounterClick(_: Event) {
    this.page!.updateRotate(true);
  }

  onRemoveClick(e: MouseEvent) {
    this.del.didRemovePage(this.page!, e);
  }
}
