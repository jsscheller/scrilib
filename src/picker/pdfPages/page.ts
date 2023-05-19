import { Input, PDF, Dimensions } from "./index.js";
import * as icons from "./icons.js";

type Rect = {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
};

type Delegate = {
  cancelNextClick?: boolean;
};

export class Page {
  input: Input;
  id: number;
  pdf: PDF;
  initPageNum: number;
  pageNum: number;
  initRotate: number;
  rotate: number;
  dims: Dimensions;
  del: Delegate;
  renderedPreview?: boolean;
  selected?: boolean;
  baseEl: HTMLElement;
  previewEl: HTMLElement;
  checkboxEl: HTMLElement;
  pageNumEl: HTMLElement;

  constructor(
    input: Input,
    id: number,
    pdf: PDF,
    pageNum: number,
    rotate: number,
    dims: Dimensions,
    del: Delegate
  ) {
    this.input = input;
    this.id = id;
    this.pdf = pdf;
    this.initPageNum = pageNum;
    this.pageNum = pageNum;
    this.initRotate = rotate;
    this.rotate = rotate;
    this.dims = dims;
    this.del = del;

    this.baseEl = Object.assign(document.createElement("div"), {
      id: id.toString(),
      className: "page",
      onclick: this.onBaseClick.bind(this),
    });
    this.checkboxEl = Object.assign(document.createElement("div"), {
      className: "page-checkbox",
      innerHTML: icons.svg(icons.check),
      onclick: this.onCheckboxClick.bind(this),
    });
    this.previewEl = Object.assign(document.createElement("div"), {
      className: "page-preview",
    });
    this.pageNumEl = Object.assign(document.createElement("div"), {
      className: "page-num",
    });
    this.baseEl.append(this.previewEl, this.checkboxEl, this.pageNumEl);

    if (!input.allow_select) {
      this.checkboxEl.style.display = "none";
    }
  }

  render(preview?: string) {
    Object.assign(this.baseEl.style, {
      width: `${this.dims.pageWidth}px`,
      height: `${this.dims.pageHeight}px`,
    });
    this.previewEl.style.backgroundImage = preview ? `url(${preview})` : "";
    this.renderedPreview = !!preview;
    this.renderPageNum();
    this.renderRotate();
  }

  renderPageNum() {
    this.pageNumEl.innerText = (this.pageNum + 1).toString();
  }

  renderRotate() {
    const scale =
      this.rotate % 180 > 0 ? this.dims.pageWidth / this.dims.pageHeight : 1;
    this.previewEl.style.transform = `rotate(${this.rotate}deg) scale(${scale})`;
  }

  rect(): Rect {
    const el = this.baseEl;
    return pageRectForEl(el, this.dims);
  }

  updateRotate(counter: boolean) {
    const inc = counter ? -90 : 90;
    let rotate = this.rotate + inc;
    rotate = rotate % 360;
    if (rotate < 0) rotate += 360;
    this.rotate = rotate;
    this.renderRotate();
  }

  updatePageNum(pageNum: number) {
    this.pageNum = pageNum;
    this.renderPageNum();
  }

  remove() {
    this.baseEl.remove();
  }

  select() {
    if (!this.input.allow_select || this.del.cancelNextClick) return;
    this.selected = !this.selected;
    this.checkboxEl.classList.toggle("checked", this.selected);
    this.baseEl.classList.toggle("selected", this.selected);
  }

  onCheckboxClick(_: Event) {
    this.select();
  }

  onBaseClick(_: Event) {
    this.select();
  }
}

export function pageElForEvent(e: MouseEvent): HTMLElement | undefined {
  return pageElForTarget(e.target as Element);
}

export function pageElForTarget(el: Element): HTMLElement | undefined {
  if (el.classList.contains("page-checkbox")) {
    el = el.parentElement!;
  }
  return el.classList.contains("page") ? (el as HTMLElement) : undefined;
}

export function pageRectForEl(el: HTMLElement, dims: Dimensions): Rect {
  return {
    x1: el.offsetLeft,
    x2: el.offsetLeft + dims.pageWidth,
    y1: el.offsetTop,
    y2: el.offsetTop + dims.pageHeight,
  };
}
