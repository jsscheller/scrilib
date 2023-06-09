/**
 * Annotate a PDF - add images, text and signatures.
 *
 * ### Examples
 *
 * sample.pdf
 *
 * ```
 * {
 *   "pdf": { "$file": "/assets/sample.pdf" }
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
import qpdf from "file:@jspawn/qpdf-wasm/qpdf.wasm";
import pdfr from "file:@jspawn/pdfr-wasm/pdfr.wasm";
import { initVirtualEnv } from "../../util.js";

export type Input = {
  pdf: File;
};

export function value(): AnnotationU[] {
  return PDF_ANNOTATIONS!.value();
}

const PPI = 72;
const MIN_TEXTAREA_WIDTH = 10;
const FONTS = ["Times New Roman", "Helvetica", "Courier"];
const TEXT_ALIGNS: { [key: string]: string[] } = {
  left: [
    `<path fill-rule="evenodd" d="M2 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/>`,
  ],
  center: [
    `<path fill-rule="evenodd" d="M4 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/>`,
  ],
  right: [
    `<path fill-rule="evenodd" d="M6 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-4-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm4-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-4-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/>`,
  ],
};
const ICON_PLUS = [
  `<path fill-rule="evenodd" d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2Z"/>`,
];
const ICON_CHECK = [
  `<path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z"/>`,
];

export type AnnotationU = ImageAnnotation | TextAnnotation;

export const enum Annotation {
  Image = "Image",
  Text = "Text",
}
export const AnnotationImage = Annotation.Image;
export const AnnotationText = Annotation.Text;

export type ImageAnnotation = {
  type: Annotation.Image;
  page: integer;
  x: number;
  y: number;
  width: number;
  height: number;
  file: File;
};

export type TextAnnotation = {
  type: Annotation.Text;
  page: integer;
  x: number;
  y: number;
  text: string;
  font: string;
  font_size: integer;
};

type TextLine = {
  text: string;
  top: number;
  left: number;
  height: number;
};

type AnnotationStateU = ImageAnnotationState | TextAnnotationState;

const enum AnnotationState {
  Image = "Image",
  Text = "Text",
}

type ImageAnnotationState = {
  type: AnnotationState.Image;
  pageState: PageState;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  base?: HTMLElement;
  image: ImageState;
  isSig: boolean;
};

type TextAnnotationState = {
  type: AnnotationState.Text;
  pageState: PageState;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  base?: HTMLElement;
  textarea: Textarea;
  font: string;
  fontSize: number;
  fontStyle: string;
  fontWeight: string;
  textAlign: string;
};

type ImageState = {
  contents: Blob;
  name: string;
  width?: number;
  height?: number;
  url?: string;
};

type ToolU = MoveTool | TextTool | ImageTool | SignatureTool;

const enum Tool {
  Move = "Move",
  Text = "Text",
  Image = "Image",
  Signature = "Signature",
}

type MoveTool = {
  type: Tool.Move;
  btnEl: HTMLElement;
  popoverEl?: HTMLElement;
};

type TextTool = {
  type: Tool.Text;
  btnEl: HTMLElement;
  popoverEl?: HTMLElement;
  font: string;
  fontSize: number;
  fontStyle: string;
  fontWeight: string;
  textAlign: string;
};

type ImageTool = {
  type: Tool.Image;
  btnEl: HTMLElement;
  popoverEl?: HTMLElement;
};

type SignatureTool = {
  type: Tool.Signature;
  btnEl: HTMLElement;
  popoverEl?: HTMLElement;
};

type TextProps = {
  font: string;
  fontSize: number;
  fontStyle: string;
  fontWeight: string;
  textAlign: string;
};

type PageState = {
  page: number;
  project?: number;
  pageEl: HTMLElement;
  rendered?: boolean;
  rect?: DOMRect;
  pageBgEl: HTMLElement;
  width: number;
  height: number;
};

type MoveState = {
  initX: number;
  initY: number;
  initObjX: number;
  initObjY: number;
  initWidth?: number;
  initHeight?: number;
  initScaleX?: number;
  initScaleY?: number;
};

type Point = {
  x: number;
  y: number;
};

type TextareaStyle = {
  fontFamily: string;
  fontSize: string;
  fontStyle: string;
  fontWeight: string;
  textAlign: string;
};

let PDF_ANNOTATIONS: PDFAnnotations | undefined;

export async function init(input: Input) {
  PDF_ANNOTATIONS = new PDFAnnotations(input, document.body);
}

class PDFAnnotations {
  input: Input;
  pages: PageState[];
  annots: AnnotationStateU[];
  tools: ToolU[];
  images: ImageState[];
  sigs: ImageState[];
  base: HTMLElement;
  sigPad?: SignaturePad;
  isMouseDown?: boolean;
  moveState!: MoveState;
  isControlHandle?: boolean;
  controlTarget?: HTMLElement;
  animationFrame?: number;
  pageCount?: number;
  sel!: AnnotationStateU;
  tool!: ToolU;
  rendering?: boolean;
  pdf?: string;
  venv!: VirtualEnv;
  pageContainerEl: HTMLElement;
  measureEl: HTMLElement;
  fileInputEl: HTMLInputElement;
  toolbarEl!: HTMLElement;
  controlEl!: HTMLElement;
  sigModalEl?: HTMLElement;
  toolFontStyleEl?: HTMLElement;
  toolFontWeightEl?: HTMLElement;
  toolTextAlignEl?: HTMLElement;
  toolFontEl?: HTMLSelectElement;
  toolFontSizeEl?: HTMLInputElement;
  toolImageEl?: HTMLSelectElement;
  toolSigEl?: HTMLSelectElement;

  constructor(input: Input, slotEl: HTMLElement) {
    this.input = input;
    this.pages = [];
    this.annots = [];
    this.tools = [];
    this.images = [];
    this.sigs = [];
    this.base = Object.assign(document.createElement("div"), {
      className: "base",
    });
    this.pageContainerEl = Object.assign(document.createElement("div"), {
      className: "page-container",
    });
    this.renderControl();
    this.pageContainerEl.append(this.controlEl);
    this.measureEl = Object.assign(document.createElement("div"), {
      className: "measure",
    });
    this.fileInputEl = Object.assign(document.createElement("input"), {
      type: "file",
      onchange: this.onFileInputChange.bind(this),
    });
    this.measureEl.append(this.fileInputEl);
    this.renderToolbar();
    this.base.append(this.toolbarEl, this.pageContainerEl, this.measureEl);

    slotEl.append(this.base);

    window.addEventListener("mousedown", this.onMouseDown.bind(this));
    window.addEventListener("mousemove", this.onMouseMove.bind(this));
    window.addEventListener("mouseup", this.onMouseUp.bind(this));
    window.addEventListener("keydown", this.onKeyDown.bind(this));

    this.pageContainerEl.addEventListener("scroll", this.onScroll.bind(this));
    this.requestRender();
    this.selectTool(Tool.Move);
  }

  renderToolbar() {
    this.toolbarEl = Object.assign(document.createElement("div"), {
      className: "toolbar",
    });

    const btns = [
      [
        {
          type: Tool.Move,
        },
        1.2,
        [
          `<path d="M14.082 2.182a.5.5 0 0 1 .103.557L8.528 15.467a.5.5 0 0 1-.917-.007L5.57 10.694.803 8.652a.5.5 0 0 1-.006-.916l12.728-5.657a.5.5 0 0 1 .556.103z"/>`,
        ],
      ],
      [
        {
          type: Tool.Text,
          font: FONTS[0],
          fontSize: 12,
          fontStyle: "normal",
          fontWeight: "normal",
          textAlign: "left",
        },
        1.5,
        [
          `<path d="M12.258 3h-8.51l-.083 2.46h.479c.26-1.544.758-1.783 2.693-1.845l.424-.013v7.827c0 .663-.144.82-1.3.923v.52h4.082v-.52c-1.162-.103-1.306-.26-1.306-.923V3.602l.431.013c1.934.062 2.434.301 2.693 1.846h.479L12.258 3z"/>`,
        ],
      ],
      [
        {
          type: Tool.Image,
        },
        1.2,
        [
          `<path d="M4 0h8a2 2 0 0 1 2 2v8.293l-2.73-2.73a1 1 0 0 0-1.52.127l-1.889 2.644-1.769-1.062a1 1 0 0 0-1.222.15L2 12.292V2a2 2 0 0 1 2-2zm4.002 5.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0z"/>`,
          `<path d="M10.564 8.27 14 11.708V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-.293l3.578-3.577 2.56 1.536 2.426-3.395z"/>`,
        ],
      ],
      [
        {
          type: Tool.Signature,
        },
        1.2,
        [
          `<path d="m13.498.795.149-.149a1.207 1.207 0 1 1 1.707 1.708l-.149.148a1.5 1.5 0 0 1-.059 2.059L4.854 14.854a.5.5 0 0 1-.233.131l-4 1a.5.5 0 0 1-.606-.606l1-4a.5.5 0 0 1 .131-.232l9.642-9.642a.5.5 0 0 0-.642.056L6.854 4.854a.5.5 0 1 1-.708-.708L9.44.854A1.5 1.5 0 0 1 11.5.796a1.5 1.5 0 0 1 1.998-.001z"/>`,
        ],
      ],
    ];
    for (let [tool_, scale, icon] of btns) {
      const tool = tool_ as ToolU;
      tool.btnEl = Object.assign(document.createElement("button"), {
        title: tool.type,
        className: "toolbar-btn",
        innerHTML: svg(icon as string[], scale as number),
        onclick: () => this.selectTool(tool),
      });
      this.toolbarEl.append(tool.btnEl);
      this.tools.push(tool);
    }
  }

  renderControl() {
    this.controlEl = Object.assign(document.createElement("div"), {
      className: "control",
      style: "display:none;",
      onmousedown: this.onControlMouseDown.bind(this),
      ondblclick: this.onControlDblClick.bind(this),
    });

    const handles = [
      [0, 0],
      [0, "100%"],
      ["100%", "100%"],
      ["100%", 0],
    ];
    for (const [top, left] of handles) {
      this.controlEl.append(
        Object.assign(document.createElement("div"), {
          className: "control-handle",
          style: `top:${top};left:${left}`,
        })
      );
    }
  }

  onControlMouseDown(e: MouseEvent) {
    e.stopPropagation();
    this.controlTarget = e.target! as HTMLElement;
    this.isControlHandle =
      this.controlTarget!.classList.contains("control-handle");
    this.initMoveState(e);
  }

  initMoveState(e: MouseEvent) {
    this.isMouseDown = true;
    this.moveState = {
      initX: e.x,
      initY: this.pageContainerEl.scrollTop + e.y,
      initObjX: this.sel.x,
      initObjY: this.sel.y,
    };
  }

  onMouseMove(e: MouseEvent) {
    if (!this.isMouseDown) return;

    let dx = e.x - this.moveState.initX;
    let dy = this.pageContainerEl.scrollTop + e.y - this.moveState.initY;

    if (this.isControlHandle) {
      const handleEls = Array.from(this.controlEl.children);
      const handleIndex = handleEls.indexOf(this.controlTarget!);
      const isLeading = handleIndex === 0 || handleIndex === 3;

      if (this.sel.type === AnnotationState.Text) {
        dx *= isLeading ? 1 : -1;
        this.moveState.initWidth =
          this.moveState.initWidth || this.sel.textarea.base.offsetWidth;
        const width = Math.max(
          MIN_TEXTAREA_WIDTH,
          this.moveState.initWidth - dx / this.sel.pageState.project!
        );
        this.sel.textarea.base.style.width = `${width}px`;
        this.sel.textarea.update();
        if (isLeading) {
          this.transformAnnot(
            this.sel,
            1,
            1,
            this.moveState.initObjX + dx,
            this.sel.y
          );
        }
      } else {
        // handles start with tl and move clockwise
        const p1 = handleEls[(handleIndex + 2) % 4].getBoundingClientRect();
        const p2 = { x: this.moveState.initX, y: this.moveState.initY };
        const vec = { x: p2.y - p1.y, y: -(p2.x - p1.x) };
        const mag = Math.sqrt(vec.x * vec.x + vec.y * vec.y);

        // define a vector using the current handle and its diagonal partner
        // calculate the distance from the point to the normal of the vector
        // ie. if the point is moving perpendicular to the vector, no scaling occurs
        const a = vec.y;
        const b = -vec.x;
        const m = vec.y / vec.x;
        const c = (p1.y - m * p1.x) * -b;
        const nextMag =
          Math.abs(a * e.x + b * (this.pageContainerEl.scrollTop + e.y) + c) /
          Math.sqrt(a * a + b * b);

        const scale = nextMag / mag;
        let dx = 0;
        let dy = 0;
        const w = (this.moveState.initWidth =
          this.moveState.initWidth || this.controlEl.offsetWidth);
        const h = (this.moveState.initHeight =
          this.moveState.initHeight || this.controlEl.offsetHeight);

        if (handleIndex === 3 || handleIndex === 0) {
          dx = w - scale * w;
        }
        if (handleIndex === 0 || handleIndex === 1) {
          dy = h - scale * h;
        }

        const scaleX = (this.moveState.initScaleX =
          this.moveState.initScaleX || this.sel.scaleX);
        const scaleY = (this.moveState.initScaleY =
          this.moveState.initScaleY || this.sel.scaleY);
        this.transformAnnot(
          this.sel,
          scaleX * scale,
          scaleY * scale,
          this.moveState.initObjX + dx,
          this.moveState.initObjY + dy
        );
      }
    } else {
      this.transformAnnot(
        this.sel,
        this.sel.scaleX,
        this.sel.scaleY,
        this.moveState.initObjX + dx,
        this.moveState.initObjY + dy
      );
    }
    if (this.sel.type === AnnotationState.Text) {
      // Clear text selection since `user-select: none` doesn't work on textareas.
      const sel = window.getSelection();
      if (sel) sel.removeAllRanges();
    }
    this.showControl();
  }

  onMouseUp() {
    this.isMouseDown = false;
  }

  onMouseDown() {
    this.clearSelection();
  }

  onControlDblClick() {
    if (this.sel.type === AnnotationState.Text) {
      this.hideControl();
      this.sel.textarea.base.focus();
      this.sel.textarea.base.select();
    }
  }

  selectTool(newTool_: ToolU | Tool) {
    if (typeof newTool_ === "string") {
      newTool_ = this.tools.find((x) => x.type === newTool_)!;
    }
    const newTool = newTool_ as ToolU;
    if (this.tool === newTool) return;

    for (const tool of this.tools) {
      tool.btnEl.classList.toggle("selected", tool === newTool);
    }
    this.hideToolPopover();

    this.tool = newTool;
    let cursor = "";
    switch (this.tool.type) {
      case Tool.Move:
        break;
      case Tool.Text:
        this.showToolPopover(this.tool);
        this.updateTextToolPopover();
        cursor = "text";
        break;
      case Tool.Image:
      case Tool.Signature:
        this.showToolPopover(this.tool);
        cursor = "copy";
        break;
    }

    this.pageContainerEl.style.cursor = cursor;
  }

  hideToolPopover() {
    for (const tool of this.tools) {
      if (tool.popoverEl) tool.popoverEl.style.display = "none";
    }
  }

  showToolPopover(tool: ToolU) {
    const btnCenter = tool.btnEl.offsetLeft + tool.btnEl.offsetWidth / 2;
    if (!tool.popoverEl) {
      tool.popoverEl = this.renderToolPopover(tool);
    }
    Object.assign(tool.popoverEl.style, {
      display: "",
      left: `${btnCenter}px`,
    });
  }

  renderToolPopover(tool: ToolU) {
    const baseEl = Object.assign(document.createElement("div"), {
      className: "toolbar-popover",
      onmousedown: (e: Event) => e.stopPropagation(),
    });
    switch (tool.type) {
      case Tool.Text: {
        const textSwitchesEl = document.createElement("div");
        textSwitchesEl.append(
          (this.toolFontStyleEl = Object.assign(
            document.createElement("button"),
            {
              title: "Italic",
              className: "toolbar-btn",
              innerHTML: svg(
                [
                  `<path d="M7.991 11.674 9.53 4.455c.123-.595.246-.71 1.347-.807l.11-.52H7.211l-.11.52c1.06.096 1.128.212 1.005.807L6.57 11.674c-.123.595-.246.71-1.346.806l-.11.52h3.774l.11-.52c-1.06-.095-1.129-.211-1.006-.806z"/>`,
                ],
                1.2
              ),
              onclick: () => this.toggleFontStyle(),
            }
          )),
          (this.toolFontWeightEl = Object.assign(
            document.createElement("button"),
            {
              title: "Bold",
              className: "toolbar-btn",
              innerHTML: svg(
                [
                  `<path d="M8.21 13c2.106 0 3.412-1.087 3.412-2.823 0-1.306-.984-2.283-2.324-2.386v-.055a2.176 2.176 0 0 0 1.852-2.14c0-1.51-1.162-2.46-3.014-2.46H3.843V13H8.21zM5.908 4.674h1.696c.963 0 1.517.451 1.517 1.244 0 .834-.629 1.32-1.73 1.32H5.908V4.673zm0 6.788V8.598h1.73c1.217 0 1.88.492 1.88 1.415 0 .943-.643 1.449-1.832 1.449H5.907z"/>`,
                ],
                1.2
              ),
              onclick: () => this.toggleFontWeight(),
            }
          )),
          (this.toolTextAlignEl = Object.assign(
            document.createElement("button"),
            {
              title: "Align",
              className: "toolbar-btn",
              onclick: () => this.toggleTextAlign(),
            }
          ))
        );
        baseEl.append(
          (this.toolFontEl = Object.assign(document.createElement("select"), {
            innerHTML: FONTS.map((font) => `<option>${font}</option>`).join(""),
            onchange: (e: Event) =>
              this.setFont((e.currentTarget! as HTMLInputElement).value),
          })),
          (this.toolFontSizeEl = Object.assign(
            document.createElement("input"),
            {
              type: "number",
              style: "width: 40px;",
              onchange: (e: Event) =>
                this.setFontSize(
                  parseInt((e.currentTarget! as HTMLInputElement).value)
                ),
            }
          )),
          textSwitchesEl
        );
        this.updateTextToolPopover();
        break;
      }
      case Tool.Image: {
        baseEl.append(
          (this.toolImageEl = Object.assign(document.createElement("select"), {
            style: "display: none",
          })),
          Object.assign(document.createElement("button"), {
            className: "toolbar-btn",
            innerHTML: [svg(ICON_PLUS, 1.2), " Upload Image"].join(""),
            onclick: () => this.fileInputEl.click(),
          })
        );
        break;
      }
      case Tool.Signature: {
        baseEl.append(
          (this.toolSigEl = Object.assign(document.createElement("select"), {
            style: "display: none",
          })),
          Object.assign(document.createElement("button"), {
            className: "toolbar-btn",
            innerHTML: [svg(ICON_PLUS, 1.2), " Create Signature"].join(""),
            onclick: () => this.showSignatureModal(),
          })
        );
        break;
      }
    }
    this.base.append(baseEl);
    return baseEl;
  }

  setFont(val: string) {
    ((this.sel || this.tool) as TextProps).font = val;
    if (this.sel) this.updateTextSelection();
  }

  setFontSize(val: number) {
    ((this.sel || this.tool) as TextProps).fontSize = val;
    if (this.sel) this.updateTextSelection();
  }

  toggleFontWeight() {
    const target = (this.sel || this.tool) as TextProps;
    target.fontWeight = target.fontWeight === "normal" ? "bold" : "normal";
    this.updateTextToolPopover();
    if (this.sel) this.updateTextSelection();
  }

  toggleFontStyle() {
    const target = (this.sel || this.tool) as TextProps;
    target.fontStyle = target.fontStyle === "normal" ? "italic" : "normal";
    this.updateTextToolPopover();
    if (this.sel) this.updateTextSelection();
  }

  toggleTextAlign() {
    const target = (this.sel || this.tool) as TextProps;
    const opts = Object.keys(TEXT_ALIGNS);
    const pos = opts.findIndex((x) => x === target.textAlign);
    const val = opts[(pos + 1) % opts.length];
    target.textAlign = val;
    this.updateTextToolPopover();
    if (this.sel) this.updateTextSelection();
  }

  updateTextSelection() {
    const sel = this.sel as TextAnnotationState;
    sel.textarea.setFont(sel);
    this.showControl();
  }

  updateTextToolPopover() {
    const target = (this.sel || this.tool) as TextProps;
    this.toolFontEl!.value = target.font;
    this.toolFontSizeEl!.value = target.fontSize.toString();
    this.toolFontWeightEl!.classList.toggle(
      "selected",
      target.fontWeight === "bold"
    );
    this.toolFontStyleEl!.classList.toggle(
      "selected",
      target.fontStyle === "italic"
    );
    this.toolTextAlignEl!.innerHTML = svg(TEXT_ALIGNS[target.textAlign], 1.2);
  }

  value(): AnnotationU[] {
    let out: AnnotationU[] = [];
    for (const annot of this.annots) {
      const { rect: rect_, page, project: project_ } = annot.pageState;
      const project = project_!;
      const rect = rect_!;
      switch (annot.type) {
        case AnnotationState.Text: {
          const measureEl = Object.assign(document.createElement("div"), {
            className: "textarea",
          });
          Object.assign(measureEl.style, annot.textarea.style);
          measureEl.style.width = `${
            parseFloat(annot.textarea.base.style.width) * project
          }px`;
          measureEl.style.fontSize = `${annot.fontSize * project}px`;
          // Important: this must be placed at the top.
          this.measureEl.prepend(measureEl);
          const lines = calcLines(annot.textarea.base.value, measureEl);
          out = out.concat(
            lines
              .filter((line) => line.text.length)
              .map((line) => {
                return {
                  type: Annotation.Text,
                  page,
                  x: (annot.x + line.left) / project,
                  y:
                    (rect.height -
                      (annot.y + line.top + annot.fontSize * project)) /
                    project,
                  text: line.text,
                  font: standardFontName(annot)!,
                  font_size: annot.fontSize,
                };
              })
          );
          measureEl.remove();
          break;
        }
        case AnnotationState.Image: {
          const objRect = annot.base!.getBoundingClientRect();
          out.push({
            type: Annotation.Image,
            page,
            x: annot.x / project,
            y: (rect.height - (annot.y + objRect.height)) / project,
            width: objRect.width / project,
            height: objRect.height / project,
            file: new File([annot.image.contents], annot.image.name),
          });
        }
      }
    }
    return out;
  }

  onScroll() {
    this.requestRender();
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
    if (!this.pdf) {
      const { venv, paths } = await initVirtualEnv({
        pdf: this.input.pdf,
      });
      this.pdf = paths.pdf;
      this.venv = venv;
    }
    if (this.pageCount == null) {
      let output: any;
      try {
        output = await this.venv.run(qpdf, ["--json", this.pdf!]);
      } catch (err_) {
        let err = err_ as any;
        if (
          err.stdout &&
          err.stderr &&
          err.stderr.includes("succeeded with warnings")
        ) {
          output = err;
        } else {
          throw err;
        }
      }

      const json = JSON.parse(output.stdout);

      this.pageCount = json.pages.length;

      for (const [pos, page] of json.pages.entries()) {
        const obj = json.objects[`obj:${page.object}`];
        const rotate = (obj.value && obj.value["/Rotate"]) || 0;
        const mediaBox = obj.value["/MediaBox"];
        const pageState = this.renderPage(
          pos + 1,
          rotate,
          mediaBox[2],
          mediaBox[3]
        );
        this.pageContainerEl.append(pageState.pageEl);
        this.pages.push(pageState);
      }

      this.updatePageRects();
    }

    const pageToRender = this.visiblePages()
      .map((pos) => this.pages[pos])
      .filter((pageState) => !pageState.rendered)
      .pop();

    if (pageToRender == null) return;

    const renderWidth = Math.ceil(pageToRender.rect!.width / 4) * 4;
    await this.venv.run(pdfr, [
      "render",
      `--size=${renderWidth}x`,
      `--pages=${pageToRender.page}`,
      this.pdf!,
      "out",
    ]);

    const ents = await this.venv.fs.readdir("out");
    const blob = await this.venv.fs.readFileToBlob(`out/${ents[0]}`, {
      type: "image/jpeg",
    });
    const url = URL.createObjectURL(blob);
    pageToRender.pageBgEl.style.backgroundImage = `url(${url})`;
    pageToRender.rendered = true;

    await this.venv.fs.rmdir("out", { recursive: true });

    await this.render();
  }

  renderPage(
    page: number,
    _rotate: number,
    width: number,
    height: number
  ): PageState {
    const pageEl = Object.assign(document.createElement("div"), {
      id: `page-${page}`,
      className: "page",
    });
    const pageBgEl = Object.assign(document.createElement("div"), {
      className: "page-bg",
      onclick: (e: MouseEvent) => this.onPageClick(e, page),
    });
    pageBgEl.style.paddingBottom = `${(height / width) * 100}%`;

    pageEl.append(pageBgEl);

    return { page, pageEl, pageBgEl, width, height };
  }

  async onPageClick(e: MouseEvent, page: number) {
    if (!this.tool) return;

    const pageState = this.pages.find((x) => x.page === page)!;

    let imageOpt: ImageState | undefined;
    switch (this.tool.type) {
      case Tool.Text: {
        const textarea = new Textarea();
        const annot: TextAnnotationState = {
          type: AnnotationState.Text,
          pageState,
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          textarea,
          font: this.tool.font,
          fontSize: this.tool.fontSize,
          fontWeight: this.tool.fontWeight,
          fontStyle: this.tool.fontStyle,
          textAlign: this.tool.textAlign,
        };
        annot.base = this.createAnnotBase(annot);
        this.annots.push(annot);

        annot.base!.append(textarea.base);
        this.measureEl.append(textarea.measureEl);
        textarea.setFont(this.tool);

        textarea.base.onfocus = (e) => this.onTextareaFocus(e, annot);
        textarea.base.onblur = (e) => this.onTextareaBlur(e, annot);

        this.transformAnnot(
          annot,
          1,
          1,
          e.x - pageState.rect!.left,
          this.pageContainerEl.scrollTop + e.y - pageState.rect!.top
        );

        this.selectAnnot(annot);
        textarea.base.focus();
        break;
      }
      // @ts-ignore
      case Tool.Signature:
        imageOpt = this.sigs.find((x) => x.name === this.toolSigEl!.value);
      // Fall through
      case Tool.Image: {
        imageOpt =
          imageOpt ||
          this.images.find((x) => x.name === this.toolImageEl!.value);
        if (!imageOpt) return;
        const image = imageOpt!;
        if (!image.url) {
          image.url = URL.createObjectURL(image.contents);
        }
        if (!image.width) {
          await new Promise((resolve, reject) => {
            const imgEl = document.createElement("img");
            imgEl.onload = () => {
              image.width = imgEl.offsetWidth;
              image.height = imgEl.offsetHeight;
              imgEl.remove();
              resolve(null);
            };
            imgEl.onerror = reject;
            this.measureEl.append(imgEl);
            imgEl.src = image.url!;
          });
        }

        const annot: ImageAnnotationState = {
          type: AnnotationState.Image,
          pageState,
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          image,
          isSig: this.tool.type === Tool.Signature,
        };
        annot.base = this.createAnnotBase(annot);
        this.annots.push(annot);

        annot.base!.append(
          Object.assign(document.createElement("div"), {
            className: "object-image",
            style: `background-image: url(${image.url!});width:${image.width!}px;height:${image.height!}px;`,
          })
        );

        let scale = 1;
        const projectedWidth = image.width! * pageState.project!;
        if (projectedWidth > pageState.rect!.width * 0.2) {
          scale = (pageState.rect!.width * 0.2) / projectedWidth;
        }
        const scaledWidth = projectedWidth * scale;
        const scaledHeight = image.height! * pageState.project! * scale;
        this.transformAnnot(
          annot,
          scale,
          scale,
          e.x - pageState.rect!.left - scaledWidth / 2,
          this.pageContainerEl.scrollTop +
            e.y -
            pageState.rect!.top -
            scaledHeight / 2
        );
        this.selectAnnot(annot);
        break;
      }
    }
  }

  onTextareaFocus(_: Event, annot: TextAnnotationState) {
    annot.textarea.base.style.pointerEvents = "";
  }

  onTextareaBlur(_: Event, annot: TextAnnotationState) {
    annot.textarea.fixedWidth = true;
    annot.textarea.base.style.pointerEvents = "none";

    if (!annot.textarea.base.value.length) {
      this.removeAnnot(annot);
      this.clearSelection();
    } else {
      this.selectAnnot(annot);
    }
  }

  createAnnotBase(annot: AnnotationStateU): HTMLElement {
    const base = Object.assign(document.createElement("div"), {
      className: "object",
      onmousedown: (e: MouseEvent) => this.onAnnotMouseDown(e, annot),
    });
    annot.pageState.pageBgEl.append(base);
    return base;
  }

  removeAnnot(annot: AnnotationStateU) {
    annot.base!.remove();
    this.annots.splice(this.annots.indexOf(annot), 1);
  }

  onAnnotMouseDown(e: MouseEvent, annot: AnnotationStateU) {
    e.stopPropagation();
    if (this.sel !== annot) {
      this.selectAnnot(annot);
    }
    if (!this.isEditingTextarea()) {
      this.initMoveState(e);
    }
  }

  isEditingTextarea() {
    return (
      document.activeElement &&
      document.activeElement.classList.contains("textarea")
    );
  }

  selectAnnot(annot: AnnotationStateU) {
    this.selectTool(Tool.Move);
    this.sel = annot;

    switch (annot.type) {
      case AnnotationState.Text:
        const tool = this.tools.find((x) => x.type === Tool.Text)!;
        this.showToolPopover(tool);
        if (annot.textarea.fixedWidth) this.showControl();
        break;
      case AnnotationState.Image:
        this.showControl();
        break;
    }
  }

  showControl() {
    const rect = this.sel.base!.getBoundingClientRect();
    Object.assign(this.controlEl.style, {
      display: "",
      top: `${
        rect.top +
        this.pageContainerEl.scrollTop -
        this.pageContainerEl.offsetTop
      }px`,
      left: `${rect.left - this.pageContainerEl.offsetLeft}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }

  hideControl() {
    this.controlEl.style.display = "none";
  }

  clearSelection() {
    // @ts-ignore
    delete this.sel;
    if (this.tool.type === Tool.Move) {
      this.hideToolPopover();
    }
    this.hideControl();
  }

  transformAnnot(
    annot: AnnotationStateU,
    scaleX: number,
    scaleY: number,
    x: number,
    y: number
  ) {
    annot.base!.style.transform = `translate(${x}px, ${y}px) scale(${annot.pageState.project}) scale(${scaleX}, ${scaleY})`;
    Object.assign(annot, { x, y, scaleX, scaleY });
  }

  updatePageRects() {
    for (const pageState of this.pages) {
      pageState.rect = pageState.pageBgEl.getBoundingClientRect();
      const dpi = (pageState.rect!.width / pageState.width) * PPI;
      pageState.project = dpi / PPI;
    }
  }

  visiblePages(): number[] {
    const scrollTop = this.pageContainerEl.scrollTop;
    const containerHeight = this.pageContainerEl.offsetHeight;

    let start = 0;
    while (true) {
      const pageState = this.pages[start];
      if (!pageState || pageState.rect!.y > scrollTop) {
        break;
      } else {
        start += 1;
      }
    }
    let end = start;
    while (true) {
      const pageState = this.pages[end];
      if (
        !pageState ||
        pageState.rect!.y + pageState.rect!.height > scrollTop + containerHeight
      ) {
        break;
      } else {
        end += 1;
      }
    }
    const visiblePages = [];
    while (start <= end) {
      if (this.pages[start]) {
        visiblePages.push(start);
      }
      start += 1;
    }
    return visiblePages;
  }

  onFileInputChange() {
    const file = this.fileInputEl.files!.item(0);
    this.fileInputEl.value = "";
    if (file) {
      const origName = file.name || "untitled";
      let name = origName;
      let suffix = 2;
      while (this.images.find((x) => x.name === name)) {
        name = addSuffix(suffix, origName);
      }
      this.images.push({ name, contents: file });
      this.toolImageEl!.append(
        Object.assign(document.createElement("option"), {
          innerText: name,
        })
      );
      this.toolImageEl!.value = name;
      this.toolImageEl!.style.display = "";
    }
  }

  showSignatureModal() {
    if (!this.sigModalEl) this.renderSignatureModal();
    this.sigModalEl!.style.display = "";

    this.sigPad!.reset();
    this.sigPad!.connectedCallback();
  }

  renderSignatureModal() {
    this.sigModalEl = Object.assign(document.createElement("div"), {
      className: "modal-backdrop",
    });

    const body = Object.assign(document.createElement("div"), {
      className: "modal",
    });
    this.sigPad = new SignaturePad();
    const footer = Object.assign(document.createElement("div"), {
      style: "display:flex;align-items:center;padding:.5rem;",
    });
    footer.append(
      Object.assign(document.createElement("div"), {
        style: "flex:1;color:var(--gray-700);",
        innerText: "Sign on the dotted line above.",
      }),
      Object.assign(document.createElement("button"), {
        className: "btn btn-link",
        innerText: "Close",
        onclick: () => this.hideModal(),
      }),
      Object.assign(document.createElement("button"), {
        className: "btn btn-primary",
        innerHTML: [svg(ICON_CHECK), " Done"].join(""),
        onclick: () => this.acceptSignature(),
      })
    );
    body.append(this.sigPad!.base, footer);

    this.sigModalEl.append(
      Object.assign(document.createElement("div"), {
        className: "modal-backdrop-trigger",
        onmousedown: (e: Event) => {
          e.preventDefault();
          this.hideModal();
        },
      }),
      body
    );

    this.base.append(this.sigModalEl);
  }

  hideModal() {
    this.sigModalEl!.style.display = "none";
  }

  async acceptSignature() {
    this.hideModal();

    const origName = "signature.png";
    let name = origName;
    let suffix = 2;
    while (this.sigs.find((x) => x.name === name)) {
      name = addSuffix(suffix, origName);
    }
    this.sigs.push({ name, contents: await this.sigPad!.toBlob() });
    this.toolSigEl!.append(
      Object.assign(document.createElement("option"), {
        innerText: name,
      })
    );
    this.toolSigEl!.value = name;
    this.toolSigEl!.style.display = "";
  }

  onKeyDown(e: KeyboardEvent) {
    if (!this.sel || this.isEditingTextarea()) return;

    switch (e.key) {
      case "Backspace":
      case "Delete":
        this.removeAnnot(this.sel);
        this.clearSelection();
        break;
    }
  }
}

function svg(inner: string[], scale?: number): string {
  const innerS = inner.join("");
  const scaleS = scale ? ` style="transform: scale(${scale})"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"${scaleS}>${innerS}</svg>`;
}

function addSuffix(suffix: number, path: string): string {
  const name = path.split("/").pop()!;
  let stem = name;
  let ext = "";
  const lastDot = name.lastIndexOf(".");
  if (lastDot > -1) {
    stem = name.slice(0, lastDot);
    ext = name.slice(lastDot);
  }
  return `${stem}${suffix}${ext}`;
}

function calcLines(s: string, measureEl: HTMLElement): TextLine[] {
  const lines: TextLine[] = [];
  const spanEl = document.createElement("span");
  measureEl.append(spanEl);
  spanEl.innerText = "a";
  const lineHeight = measureEl.getBoundingClientRect().height;
  let i = 0;
  while (true) {
    spanEl.innerText = "";
    while (i < s.length) {
      const c = s[i];
      spanEl.innerText = spanEl.textContent + c;
      if (measureEl.getBoundingClientRect().height > lineHeight) {
        spanEl.innerText = spanEl.textContent!.slice(0, -1);
        break;
      }
      i += 1;
      if (c === "\n") break;
    }
    const spanRect = spanEl.getBoundingClientRect();
    lines.push({
      text: spanEl.textContent!,
      top: spanRect.top + spanRect.height * lines.length,
      left: spanRect.left,
      height: spanRect.height,
    });
    if (i === s.length) break;
  }
  return lines;
}

function standardFontName(annot: TextAnnotationState): string | undefined {
  const isBold = annot.fontWeight === "bold";
  const isItalic = annot.fontStyle === "italic";
  switch (annot.font) {
    case "Times New Roman":
      if (isBold && isItalic) return "Times-BoldItalic";
      if (isBold) return "Times-Bold";
      if (isItalic) return "Times-Italic";
      return "Times-Roman";
    case "Helvetica":
      if (isBold && isItalic) return "Helvetica-BoldOblique";
      if (isBold) return "Helvetica-Bold";
      if (isItalic) return "Helvetica-Oblique";
      return "Helvetica";
    case "Courier":
      if (isBold && isItalic) return "Courier-BoldOblique";
      if (isBold) return "Courier-Bold";
      if (isItalic) return "Courier-Oblique";
      return "Courier";
  }
}

class Textarea {
  base: HTMLTextAreaElement;
  measureEl: HTMLElement;
  style!: TextareaStyle;
  lineHeight!: number;
  fixedWidth?: boolean;

  constructor() {
    this.base = Object.assign(document.createElement("textarea"), {
      className: "textarea",
      rows: 1,
      tabindex: -1,
      onchange: this.update.bind(this),
      oninput: this.update.bind(this),
    });
    this.measureEl = Object.assign(document.createElement("div"), {
      style: "white-space: pre; line-height: 1.2;",
    });
  }

  setFont(props: TextProps) {
    this.style = {
      fontFamily: props.font,
      fontSize: `${props.fontSize}px`,
      fontStyle: props.fontStyle,
      fontWeight: props.fontWeight,
      textAlign: props.textAlign,
    };
    Object.assign(this.base.style, this.style);
    Object.assign(this.measureEl.style, this.style);

    this.measureEl.innerHTML = "a";
    this.lineHeight = this.measureEl.offsetHeight;

    this.update();
  }

  update() {
    if (!this.fixedWidth) {
      this.measureEl.innerHTML = this.base.value;
      const width = Math.max(
        MIN_TEXTAREA_WIDTH,
        this.measureEl.scrollWidth + 1
      );
      this.base.style.width = `${width}px`;
    }
    this.base.rows = 1;
    this.base.scrollTop = 0;
    this.base.rows = Math.round(
      Math.max(this.lineHeight, this.base.scrollHeight) / this.lineHeight
    );
  }
}

class SignaturePad {
  accPoints!: Point[];
  paths!: Path2D[];
  pathData!: string[];
  bounds!: number[][];
  drawnPointCount!: number;
  base: HTMLElement;
  canvas: HTMLCanvasElement;
  ctxProps: {
    strokeStyle: string;
    lineWidth: number;
    lineJoin: string;
    lineCap: string;
  };
  ctx!: CanvasRenderingContext2D;
  baseRect?: DOMRect;
  mouseDown?: boolean;
  midPoint?: Point;
  animationFrame?: number;

  constructor() {
    this.reset();
    this.base = Object.assign(document.createElement("div"), {
      className: "signature-pad",
      onmousedown: this.onMouseDown.bind(this),
    });
    this.canvas = document.createElement("canvas");
    this.ctxProps = {
      strokeStyle: "#000",
      lineWidth: 2,
      lineJoin: "round",
      lineCap: "round",
    };

    this.base.append(
      Object.assign(document.createElement("div"), {
        className: "signature-pad-bg",
      }),
      this.canvas
    );

    window.addEventListener("mousemove", this.onMouseMove.bind(this));
    window.addEventListener("mouseup", this.onMouseUp.bind(this));
  }

  reset() {
    this.accPoints = [];
    this.paths = [];
    this.pathData = [];
    this.bounds = [];
    this.drawnPointCount = 0;
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  connectedCallback() {
    if (!this.ctx) {
      Object.assign(this.canvas, {
        width: this.canvas.offsetWidth,
        height: this.canvas.offsetHeight,
      });
      this.ctx = this.canvas.getContext("2d")!;
      Object.assign(this.ctx, this.ctxProps);
    }
    this.baseRect = this.base.getBoundingClientRect();
  }

  async toBlob(type?: string): Promise<Blob> {
    const boundPoints = this.bounds.reduce((acc: Point[], bounds) => {
      acc.push({ x: bounds[0], y: bounds[1] }, { x: bounds[2], y: bounds[3] });
      return acc;
    }, []);
    const bounds = calcBounds(boundPoints);
    const width = bounds[2] - bounds[0];
    const height = bounds[3] - bounds[1];
    if (type === "svg") {
      const pathData = combinePaths(this.pathData, bounds[0], bounds[1]);
      const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}px" height="${height}px" viewBox="0 0 ${width} ${height}">`,
        `<path stroke="currentColor" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" d="${pathData}"></path>`,
        "</svg>",
      ].join("");
      return new Blob([svg], { type: "image/svg+xml" });
    } else {
      const scale = 3;
      const canvas = document.createElement("canvas");
      canvas.width = width * scale + this.ctxProps.lineWidth * scale;
      canvas.height = height * scale + this.ctxProps.lineWidth * scale;
      const ctx = canvas.getContext("2d")!;
      Object.assign(ctx, this.ctxProps);
      ctx.scale(scale, scale);
      ctx.translate(
        -bounds[0] + ctx.lineWidth / 2,
        -bounds[1] + ctx.lineWidth / 2
      );
      for (const path of this.paths) {
        ctx.stroke(path);
      }
      return new Promise((resolve) => canvas.toBlob((x) => resolve(x!)));
    }
  }

  onMouseDown() {
    this.mouseDown = true;
  }

  onMouseUp() {
    this.mouseDown = false;
    delete this.midPoint;
    this.drawnPointCount = 0;

    if (!this.accPoints.length) return;

    const points = simplifyPoints(this.accPoints, 2.1);
    const pathData = points2PathData(points);
    this.paths.push(new Path2D(pathData));
    this.pathData.push(pathData);
    this.bounds.push(calcBounds(points));

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const path of this.paths) {
      this.ctx.stroke(path);
    }

    this.accPoints.length = 0;
  }

  onMouseMove(e: MouseEvent) {
    if (this.mouseDown) {
      e.preventDefault();

      // handle touch devices
      // @ts-ignore
      e = e.touches ? e.touches[0] : e;

      this.accPoints.push({
        x: e.clientX - this.baseRect!.left,
        y: e.clientY - this.baseRect!.top,
      });
      this.requestRender();
    }
  }

  requestRender() {
    cancelAnimationFrame(this.animationFrame!);
    this.animationFrame = requestAnimationFrame(() => {
      this.render();
    });
  }

  render() {
    const { ctx, accPoints, drawnPointCount } = this;

    const pointCount =
      accPoints.length - (accPoints.length % 2) - drawnPointCount;
    for (let i = 0; i < pointCount; i += 2) {
      const p1 = accPoints[drawnPointCount + i];
      const p2 = accPoints[drawnPointCount + i + 1];

      if (this.midPoint) {
        ctx.beginPath();
        ctx.moveTo(this.midPoint.x, this.midPoint.y);
      } else {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
      }

      this.midPoint = calcMidPoint(p1, p2);
      ctx.quadraticCurveTo(p1.x, p1.y, this.midPoint.x, this.midPoint.y);

      ctx.stroke();
    }
    this.drawnPointCount += pointCount;
  }
}

function calcMidPoint(a: Point, b: Point): Point {
  const t = 0.5;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function calcBounds(points: Point[]): number[] {
  const bounds = [1e6, 1e6, -1e6, -1e6];

  for (const { x, y } of points) {
    bounds[0] = Math.min(bounds[0], x);
    bounds[1] = Math.min(bounds[1], y);
    bounds[2] = Math.max(bounds[2], x);
    bounds[3] = Math.max(bounds[3], y);
  }

  return bounds;
}

function combinePaths(paths: string[], dx: number, dy: number): string {
  let data = "";
  for (let d of paths) {
    const chunks = d.split(/[A-Z]/).slice(1);
    d = "";

    for (const [i, nums] of chunks.entries()) {
      d += (i === 0 && "M") || (i === chunks.length - 1 && "L") || "Q";
      d += nums
        .split(" ")
        .map((n, i) => parseFloat(n) - (!(i % 2) ? dx : dy))
        .join(" ");
    }

    data += d;
  }
  return data;
}

// simplification using Ramer-Douglas-Peucker algorithm
function simplifyPoints(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points;

  const sqTolerance = tolerance * tolerance;
  const last = points.length - 1;

  const simplified = [points[0]];
  simplifyDPStep(points, 0, last, sqTolerance, simplified);
  simplified.push(points[last]);

  return simplified;
}

function simplifyDPStep(
  points: Point[],
  first: number,
  last: number,
  sqTolerance: number,
  simplified: Point[]
) {
  let maxSqDist = sqTolerance;
  let index!: number;

  for (let i = first + 1; i < last; i++) {
    const sqDist = calcSqSegDist(points[i], points[first], points[last]);

    if (sqDist > maxSqDist) {
      index = i;
      maxSqDist = sqDist;
    }
  }

  if (maxSqDist > sqTolerance) {
    if (index - first > 1) {
      simplifyDPStep(points, first, index, sqTolerance, simplified);
    }

    simplified.push(points[index]);

    if (last - index > 1) {
      simplifyDPStep(points, index, last, sqTolerance, simplified);
    }
  }
}

// square distance from a point to a segment
function calcSqSegDist(p: Point, p1: Point, p2: Point): number {
  var x = p1.x;
  let y = p1.y;
  let dx = p2.x - x;
  let dy = p2.y - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);

    if (t > 1) {
      x = p2.x;
      y = p2.y;
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = p.x - x;
  dy = p.y - y;

  return dx * dx + dy * dy;
}

function points2PathData(points: Point[]): string {
  const data = [];
  let p1 = points[0];
  let p2 = points[1];
  let i = 1;

  data.push("M" + p1.x + " " + p1.y);

  while (i < points.length) {
    if (!equalPoints(p1, p2)) {
      const midPoint = calcMidPoint(p1, p2);
      // p1 is our bezier control point
      // midpoint is our endpoint
      // start point is p(i-1) value.
      data.push("Q" + p1.x + " " + p1.y + " " + midPoint.x + " " + midPoint.y);
    }

    p1 = points[i];

    if (i + 1 < points.length) {
      p2 = points[i + 1];
    }

    i++;
  }

  data.push("L" + p1.x + " " + p1.y);

  return data.join("");
}

function equalPoints(a: Point, b: Point): boolean {
  const tol = 3 / window.devicePixelRatio;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy < tol * tol;
}
