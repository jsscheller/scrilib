import { Point, Dimensions } from "./index.js";
import {
  Page,
  pageElForTarget,
  pageElForEvent,
  pageRectForEl,
} from "./page.js";

type Delegate = {
  didMovePage: (from: number, to: number) => void;
};

export class Move {
  pages: Page[];
  dims: Dimensions;
  shadowRoot: ShadowRoot;
  del: Delegate;
  active?: Page;
  startPoint?: Point;
  animationFrame?: number;
  target?: HTMLElement;
  targetLeading?: boolean;
  ghostEl: HTMLElement;
  indicatorEl: HTMLElement;

  constructor(
    pages: Page[],
    dims: Dimensions,
    shadowRoot: ShadowRoot,
    del: Delegate
  ) {
    this.pages = pages;
    this.dims = dims;
    this.shadowRoot = shadowRoot;
    this.del = del;
    this.ghostEl = Object.assign(document.createElement("div"), {
      style: "display: none",
      className: "move-ghost",
    });
    this.indicatorEl = Object.assign(document.createElement("div"), {
      style: `display: none; width: ${dims.gap}px;`,
      className: "move-indicator",
    });
    this.indicatorEl.append(document.createElement("div"));
  }

  start(page: Page, e: MouseEvent) {
    this.active = page;
    this.startPoint = { x: e.x, y: e.y };
    delete this.target;

    const ghostEl = page.baseEl.cloneNode(true) as HTMLElement;
    for (const el of Array.from(ghostEl.children)) {
      if (!el.classList.contains("page-preview")) {
        el.remove();
      }
    }
    const rect = page.rect();
    Object.assign(this.ghostEl.style, {
      left: `${rect.x1}px`,
      top: `${rect.y1}px`,
      display: "",
    });
    this.ghostEl.innerHTML = "";
    this.ghostEl.append(ghostEl);
  }

  update(e: MouseEvent) {
    cancelAnimationFrame(this.animationFrame!);

    const pt = { x: e.x, y: e.y };
    let pageEl = pageElForEvent(e);
    this.animationFrame = requestAnimationFrame(() => {
      const dx = pt.x - this.startPoint!.x;
      const dy = pt.y - this.startPoint!.y;
      Object.assign(this.ghostEl.style, {
        transform: `translate(${dx}px, ${dy}px)`,
      });

      pageEl = pageEl || this.findPageEl(pt);
      if (pageEl) {
        const rect = pageRectForEl(pageEl, this.dims);
        const leading = pt.x - rect.x1 < this.dims.pageWidth / 2;
        const x = leading ? rect.x1 : rect.x2;
        const adjust = leading ? -100 : 0;
        Object.assign(this.indicatorEl.style, {
          transform: `translate(${x}px, ${rect.y1}px) translateX(${adjust}%)`,
          height: `${this.dims.pageHeight}px`,
          display: "",
        });
        this.target = pageEl;
        this.targetLeading = leading;
      } else {
        this.indicatorEl.style.display = "none";
        delete this.target;
      }
    });
  }

  findPageEl(pt: Point): HTMLElement | undefined {
    const x = pt.x;
    for (const dx of [-this.dims.gap, this.dims.gap]) {
      pt.x = x + dx;
      const el = this.shadowRoot.elementFromPoint(pt.x, pt.y);
      if (el) {
        const pageEl = pageElForTarget(el);
        if (pageEl) return pageEl;
      }
    }
    return undefined;
  }

  end() {
    if (this.target) {
      const from = this.pages.indexOf(this.active!);
      let to = this.pages.findIndex((x) => x.baseEl === this.target)!;
      if (from < to && this.targetLeading) {
        to -= 1;
      } else if (from > to && !this.targetLeading) {
        to += 1;
      }
      if (from !== to) {
        this.del.didMovePage(from, to);
      }
    }
    delete this.active;
    this.ghostEl.style.display = "none";
    this.indicatorEl.style.display = "none";
  }
}
