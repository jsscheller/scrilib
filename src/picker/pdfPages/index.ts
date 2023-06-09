/**
 * Page picker for PDFs - select, move, rotate, delete and split.
 *
 * ### Examples
 *
 * sample.pdf
 *
 * ```
 * {
 *   "pdfs": [{ "$file": "/assets/sample.pdf" }],
 *   "allow_select": true,
 *   "allow_move": true
 * }
 * ```
 *
 * @module
 */

import "file:../colors.css";
import "file:../normalize.css";
import "file:./styles.css";
import "file:./index.html";
import "file:../../initListener.js";
import { VirtualEnv } from "@jspawn/jspawn";
import { initVirtualEnv } from "../../util.js";
import qpdf from "file:@jspawn/qpdf-wasm/qpdf.wasm";
import pdfr from "file:@jspawn/pdfr-wasm/pdfr.wasm";
import { Page, pageElForEvent, pageElForTarget } from "./page.js";
import { PageToolbar } from "./pageToolbar.js";
import { Move } from "./move.js";
import { Split } from "./split.js";
import * as icons from "./icons.js";

export type Input = {
  pdfs: File[];
  allow_insert?: boolean;
  allow_select?: boolean;
  allow_move?: boolean;
  allow_rotate?: boolean;
  allow_remove?: boolean;
  allow_split?: boolean;
};

export type Output = {
  pdfs: OutputPDF[];
};

export function value(): Output {
  return PDF_PAGES!.value();
}

export type OutputPDF = {
  pages: OutputPage[];
};

export type OutputPage = {
  pdf: File;
  page: integer;
  rotate?: integer;
};

export type PageSelection = {
  from: integer;
  select: string;
};

export type PageRotation = {
  angle: integer;
  select: string;
};

export type PDF = {
  file: File;
  name: string;
};

export type Dimensions = {
  pageWidth: number;
  pageHeight: number;
  gap: number;
};

export type Point = {
  x: number;
  y: number;
};

let PDF_PAGES: PDFPages | undefined;

export async function init(input: Input) {
  PDF_PAGES = new PDFPages(input, document.body);
}

class PDFPages {
  input: Input;
  dims: Dimensions;
  newPDFs: File[];
  pdfs: PDF[];
  pages: Page[];
  splits: Split[];
  animationFrame?: number;
  toolbarAnimationFrame?: number;
  rendering?: boolean;
  toolbarPage?: number;
  idInc: number;
  pageToolbar: PageToolbar;
  move: Move;
  mouseDown?: Point;
  cancelNextClick?: boolean;
  venv!: VirtualEnv;
  baseEl: HTMLElement;
  pageContainerEl: HTMLElement;
  splitContainerEl: HTMLElement;
  insertDocEl: HTMLElement;
  insertDocFileInputEl: HTMLInputElement;

  constructor(input: Input, slotEl: HTMLElement) {
    this.input = input;
    const pageWidth = 200;
    this.dims = {
      pageWidth,
      pageHeight: Math.round((pageWidth / 8.5) * 11),
      gap: input.allow_split ? 42 : 16,
    };
    this.newPDFs = this.input.pdfs.slice();
    this.pdfs = [];
    this.splits = [];
    this.pages = [];
    this.idInc = 0;
    this.pageToolbar = new PageToolbar(input, this);
    this.move = new Move(this.pages, this.dims, this);

    this.baseEl = Object.assign(document.createElement("div"), {
      className: "base",
      onmousemove: this.onMouseMove.bind(this),
      onmousedown: this.onMouseDown.bind(this),
      onmouseup: this.onMouseUp.bind(this),
      onscroll: this.requestRender.bind(this),
    });
    this.splitContainerEl = Object.assign(document.createElement("div"), {
      className: "split-container",
      style: `gap: ${this.dims.gap}px 0; display: ${
        input.allow_split ? "" : "none"
      }`,
    });
    this.pageContainerEl = Object.assign(document.createElement("div"), {
      className: "page-container",
      style: `gap: ${this.dims.gap}px`,
    });
    this.insertDocEl = Object.assign(document.createElement("div"), {
      className: "page-insert",
      style: `display: ${input.allow_insert ? "" : "none"}; width: ${
        this.dims.pageWidth
      }px; height: ${this.dims.pageHeight}px`,
      onclick: this.onInsertDocClick.bind(this),
    });
    this.insertDocFileInputEl = Object.assign(document.createElement("input"), {
      type: "file",
      multiple: "true",
      onchange: this.onDocFileInputChange.bind(this),
    });
    const insertDocContainer = document.createElement("div");
    insertDocContainer.append(
      this.insertDocFileInputEl,
      Object.assign(document.createElement("div"), {
        innerHTML: icons.svg(icons.plus),
      }),
      Object.assign(document.createElement("div"), {
        innerText: "Add PDF",
        style: "font-size: 24px",
      })
    );
    this.insertDocEl.append(insertDocContainer);

    this.pageContainerEl.append(this.insertDocEl);
    this.baseEl.append(
      this.splitContainerEl,
      this.pageContainerEl,
      this.pageToolbar.baseEl,
      this.move.ghostEl,
      this.move.indicatorEl
    );
    slotEl.append(this.baseEl);

    this.requestRender();
  }

  value(): Output {
    const pdfs = [];
    let pageOffset = 0;
    while (pageOffset < this.pages.length) {
      const outputPages = [];
      while (pageOffset < this.pages.length) {
        const page = this.pages[pageOffset]!;
        const split = this.splits[pageOffset];
        pageOffset += 1;
        const outputPage: OutputPage = {
          pdf: page.pdf.file,
          page: page.initPageNum + 1,
        };
        if (page.rotate !== page.initRotate) {
          outputPage.rotate = page.rotate;
        }
        outputPages.push(outputPage);
        if (split && split.active) {
          break;
        }
      }
      pdfs.push({
        pages: outputPages,
      });
    }
    return { pdfs };
  }

  requestRender() {
    cancelAnimationFrame(this.animationFrame!);
    this.animationFrame = requestAnimationFrame(async () => {
      if (this.rendering) {
        this.requestRender();
      } else {
        this.rendering = true;
        await this.render();
        this.rendering = false;
      }
    });
  }

  async render() {
    if (!this.venv) {
      const init = await initVirtualEnv({});
      this.venv = init.venv;
    }

    if (this.newPDFs.length > 0) {
      await this.loadNewPDFs();
    }

    const pagesToRender = this.visiblePages()
      .filter((x) => !x.renderedPreview)
      .slice(0, 10);

    if (pagesToRender.length === 0) return;

    await this.renderPages(pagesToRender);

    this.requestRender();
  }

  async loadNewPDFs() {
    for (const file of this.newPDFs.splice(0, this.newPDFs.length)) {
      const name = `pdf${this.pdfs.length}.pdf`;
      const pdf = { file, name };
      this.pdfs.push(pdf);

      await this.venv.fs.writeFile(name, file);

      const output = await this.venv.run(qpdf, [
        "--warning-exit-0",
        "--json",
        name,
      ]);
      const json = JSON.parse(output.stdout);

      for (const [index, pageJSON] of json.pages.entries()) {
        const obj = json.objects[`obj:${pageJSON.object}`];
        const rotate = (obj && obj.value && obj.value["/Rotate"]) || 0;
        const page = new Page(
          this.input,
          this.idInc++,
          pdf,
          index,
          rotate,
          this.dims,
          this
        );
        page.render();
        this.pageContainerEl.insertBefore(page.baseEl, this.insertDocEl);
        this.pages.push(page);

        const split = new Split(this.dims);
        this.splitContainerEl.append(split.baseEl);
        this.splits.push(split);
      }
    }
  }

  visiblePages(): Page[] {
    const top = window.scrollY;
    const start = this.pages.findIndex((x) => x.rect().y2 > top)!;
    const bottom = top + window.innerHeight;
    const endPage = this.pages
      .slice(start)
      .reverse()
      .find((x) => x.rect().y1 < bottom)!;
    const end = start + this.pages.indexOf(endPage);
    return this.pages.slice(start, end + 1);
  }

  async renderPages(pages: Page[]) {
    const grouped = pages.reduce(
      (acc: { [key: string]: Page[] }, page: Page) => {
        const key = page.pdf.name;
        if (!acc[key]) acc[key] = [];
        acc[key].push(page);
        return acc;
      },
      {}
    );

    for (const [pdfName, pages] of Object.entries(grouped)) {
      const renderWidth = Math.ceil(this.dims.pageWidth / 4) * 4;
      await this.venv.run(pdfr, [
        "render",
        `--size=${renderWidth}x`,
        `--pages=${pages.map((x) => x.pageNum + 1).join(",")}`,
        pdfName,
        "out",
      ]);

      const ents = await this.venv.fs.readdir("out");
      for (const [index, ent] of ents.entries()) {
        const blob = await this.venv.fs.readFileToBlob(`out/${ent}`, {
          type: "image/jpeg",
        });
        const url = URL.createObjectURL(blob);
        pages[index]!.render(url);
      }

      await this.venv.fs.rmdir("out", { recursive: true });
    }
  }

  updateToolbar(e: MouseEvent) {
    const pageEl = pageElForEvent(e);
    const prevToolbarPage = this.toolbarPage;
    if (!this.move.active && pageEl) {
      this.toolbarPage = parseInt(pageEl.id);
    } else {
      delete this.toolbarPage;
    }
    if (prevToolbarPage !== this.toolbarPage) {
      this.requestToolbarRender();
    }
  }

  requestToolbarRender() {
    cancelAnimationFrame(this.toolbarAnimationFrame!);
    this.toolbarAnimationFrame = requestAnimationFrame(async () => {
      this.renderToolbar();
    });
  }

  renderToolbar() {
    if (this.toolbarPage != null) {
      const page = this.pages.find((x) => x.id === this.toolbarPage);
      if (!page) return;
      this.pageToolbar.show(page);
    } else {
      this.pageToolbar.hide();
    }
  }

  updatePageNums() {
    for (const [index, page] of this.pages.entries()) {
      page.updatePageNum(index);
    }
  }

  onMouseDown(e: MouseEvent) {
    this.mouseDown = { x: e.x, y: e.y };
  }

  onMouseUp(_: MouseEvent) {
    delete this.mouseDown;

    if (this.move.active) {
      this.move.end();
      this.cancelNextClick = true;
      setTimeout(() => {
        this.cancelNextClick = false;
      });
    }
  }

  onMouseMove(e: MouseEvent) {
    this.updateToolbar(e);

    if (this.move.active) {
      this.move.update(e);
    } else if (this.toolbarPage != null && this.mouseDown) {
      if (
        Math.abs(e.x - this.mouseDown.x) > 5 ||
        Math.abs(e.y - this.mouseDown.y) > 5
      ) {
        const page = this.pages.find((x) => x.id === this.toolbarPage)!;
        this.move.start(page, e);
      }
    }
  }

  onDocFileInputChange(_: Event) {
    for (const file of Array.from(this.insertDocFileInputEl.files!)) {
      this.newPDFs.push(file);
    }
    this.requestRender();

    this.insertDocFileInputEl.value = "";
  }

  onInsertDocClick(_: Event) {
    this.insertDocFileInputEl.click();
  }

  didRemovePage(page: Page, e: MouseEvent) {
    page.remove();
    const index = this.pages.indexOf(page);
    this.pages.splice(index, 1);
    this.updatePageNums();

    const lastSplit = this.splits.pop()!;
    lastSplit.remove();

    delete this.toolbarPage;
    this.renderToolbar();

    const el = document.elementFromPoint(e.x, e.y);
    if (el) {
      const pageEl = pageElForTarget(el);
      if (pageEl) {
        this.toolbarPage = parseInt(pageEl.id);
        this.requestToolbarRender();
      }
    }
  }

  didMovePage(from: number, to: number) {
    const page = this.pages[from];

    this.pages.splice(from, 1);
    this.pages.splice(to, 0, page);

    if (to === this.pages.length - 1) {
      this.pageContainerEl.insertBefore(page.baseEl, this.insertDocEl);
    } else {
      const beforeEl = this.pages[to + 1].baseEl;
      this.pageContainerEl.insertBefore(page.baseEl, beforeEl);
    }

    this.updatePageNums();
  }
}
