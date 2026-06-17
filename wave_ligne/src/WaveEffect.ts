import { Bound, CanvasForm, CanvasSpace, Group, Pt } from "pts";

// ── colour helpers ────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function samplePalette(
  t: number,
  colors: [number, number, number][]
): [number, number, number] {
  t = ((t % 1) + 1) % 1;
  const n = colors.length;
  const pos = t * n;
  const i = Math.floor(pos);
  const f = pos - i;
  const a = colors[i];
  const b = colors[(i + 1) % n];
  return [
    a[0] + (b[0] - a[0]) * f,
    a[1] + (b[1] - a[1]) * f,
    a[2] + (b[2] - a[2]) * f,
  ];
}

// ── options ───────────────────────────────────────────────────────────────────

export interface WaveOptions {
  /** Total number of rows stacked in the window — sets this canvas height. */
  rows?: number;
  waveAmp?: number;
  scrollSpeed?: number;
  grain?: number;
  seam?: number;
  palette?: [string, string, string, string];
}

// ── effect ────────────────────────────────────────────────────────────────────

export class WaveEffect {
  private space: CanvasSpace;
  private form: CanvasForm;
  private colors: [number, number, number][];
  private rows: number;
  private waveAmp: number;
  private scrollSpeed: number;
  private seam: number;

  constructor(canvas: HTMLCanvasElement, options: WaveOptions = {}) {
    this.rows        = options.rows        ?? 1;
    this.waveAmp     = options.waveAmp     ?? 0.3;
    this.scrollSpeed = options.scrollSpeed ?? 0.5;
    this.seam        = options.seam        ?? 0.45;
    this.colors      = (options.palette    ?? ["#1d6286", "#2cc181", "#7e7cfb", "#bcbcf9"])
                         .map(hexToRgb) as [number, number, number][];

    // resize: false — we manage dimensions explicitly via space.resize()
    this.space = new CanvasSpace(canvas).setup({ bgcolor: "#000000", retina: true, resize: false });
    this.form  = this.space.getForm();

    this.applySize();
    window.addEventListener("resize", this.onResize);

    this.space.add({ animate: (time) => this.draw(time / 1000) });
  }

  private applySize(): void {
    const w = window.innerWidth;
    const h = Math.floor(window.innerHeight / this.rows);
    this.space.resize(new Bound(new Pt(0, 0), new Pt(w, h)));
  }

  private onResize = (): void => {
    this.applySize();
  };

  private draw(t: number): void {
    const w  = this.space.size.x;
    const h  = this.space.size.y;
    const cx = w / 2;

    const phase = Math.sin(t * this.scrollSpeed) * this.waveAmp;

    const STOPS = 32;
    const stops: [number, string][] = [];
    for (let i = 0; i <= STOPS; i++) {
      const mx = i / STOPS;
      const [r, g, b] = samplePalette(mx * 0.5 + phase, this.colors);
      const s = Math.exp(-(mx * mx) / 0.006) * this.seam;
      stops.push([mx, `rgb(${(r * (1 - s)) | 0},${(g * (1 - s)) | 0},${(b * (1 - s)) | 0})`]);
    }

    const gradBuilder = this.form.gradient(stops);

    const gradR = gradBuilder(new Group(new Pt(cx, 0), new Pt(w, 0)));
    this.form.fillOnly(true).fill(gradR).rect(new Group(new Pt(cx, 0), new Pt(w, h)));

    const gradL = gradBuilder(new Group(new Pt(cx, 0), new Pt(0, 0)));
    this.form.fill(gradL).rect(new Group(new Pt(0, 0), new Pt(cx, h)));
  }

  start():   void { this.space.play(); }
  stop():    void { this.space.pause(); }
  dispose(): void {
    window.removeEventListener("resize", this.onResize);
    this.space.dispose();
  }
}
