/**
 * Deterministic procedural "map" background, ported from the DroneMissions design's
 * genBasemap. Given a seed it returns a flat list of primitive SVG shapes (world
 * coordinates in the 1000 x 640 space) — same seed → same map. Rendered natively by
 * the mission-map component; no DOM here.
 */
import { EX } from './plan-geometry';

export type BasemapShape =
  | { t: 'rect'; x: number; y: number; width: number; height: number; fill?: string; stroke?: string; strokeWidth?: number; rx?: number }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string; strokeWidth: number }
  | { t: 'polygon'; points: string; fill?: string; opacity?: number }
  | { t: 'polyline'; points: string; stroke: string; strokeWidth: number; opacity?: number }
  | { t: 'text'; x: number; y: number; text: string; fill: string; fontSize: number; letterSpacing: string; fontFamily: string; fontStyle?: string };

const C = {
  land: '#eef1ea',
  water: '#c3dbec',
  park: '#d7e7c6',
  roadCase: '#e0e6ec',
  road: '#ffffff',
  bldg: '#e6eaef',
  bldgStroke: '#d9dfe6',
  label: '#93a3b2',
  waterLabel: '#6f9dc0'
};

/** Seeded PRNG (mulberry32-ish) — identical to the design's rngFrom. */
function rngFrom(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pts = (arr: number[][]) => arr.map((p) => p[0] + ',' + p[1]).join(' ');

export function generateBasemap(seed: string, mini = false): BasemapShape[] {
  const W = 1000;
  const H = 640;
  const els: BasemapShape[] = [];
  const rng = rngFrom(seed);
  const rand = (a: number, b: number) => a + rng() * (b - a);
  const pick = <T>(a: T[]): T => a[Math.floor(rng() * a.length)];

  // Land + graticule
  els.push({ t: 'rect', x: EX.x0, y: EX.y0, width: EX.x1 - EX.x0, height: EX.y1 - EX.y0, fill: C.land });
  const grat = 'rgba(45,75,105,0.045)';
  for (let x = Math.ceil(EX.x0 / 100) * 100; x < EX.x1; x += 100) {
    els.push({ t: 'line', x1: x, y1: EX.y0, x2: x, y2: EX.y1, stroke: grat, strokeWidth: 1 });
  }
  for (let y = Math.ceil(EX.y0 / 100) * 100; y < EX.y1; y += 100) {
    els.push({ t: 'line', x1: EX.x0, y1: y, x2: EX.x1, y2: y, stroke: grat, strokeWidth: 1 });
  }

  // Water body
  const layout = pick(['coast', 'coast', 'river', 'lake']);
  if (layout === 'coast') {
    const side = pick(['left', 'right', 'top', 'bottom']);
    const wp: number[][] = [];
    if (side === 'right' || side === 'left') {
      const base = side === 'right' ? rand(650, 770) : rand(230, 350);
      const dir = side === 'right' ? 1 : -1;
      const edge = side === 'right' ? W : 0;
      for (let y = -20; y <= H + 20; y += 70) wp.push([base + dir * rand(-35, 55) + Math.sin(y / 90) * 28, y]);
      els.push({ t: 'polygon', points: pts([[edge, -20], ...wp, [edge, H + 20]]), fill: C.water });
    } else {
      const base = side === 'bottom' ? rand(430, 520) : rand(120, 210);
      const dir = side === 'bottom' ? 1 : -1;
      const edge = side === 'bottom' ? H : 0;
      for (let x = -20; x <= W + 20; x += 90) wp.push([x, base + dir * rand(-28, 45) + Math.cos(x / 120) * 22]);
      els.push({ t: 'polygon', points: pts([[-20, edge], ...wp, [W + 20, edge]]), fill: C.water });
    }
  } else if (layout === 'river') {
    const vert = rng() < 0.5;
    const rp: number[][] = [];
    if (vert) {
      const base = rand(360, 640);
      for (let y = -20; y <= H + 20; y += 60) rp.push([base + Math.sin(y / 70) * 70 + rand(-14, 14), y]);
    } else {
      const base = rand(230, 420);
      for (let x = -20; x <= W + 20; x += 70) rp.push([x, base + Math.sin(x / 90) * 55 + rand(-14, 14)]);
    }
    els.push({ t: 'polyline', points: pts(rp), stroke: C.water, strokeWidth: rand(72, 104) });
  } else {
    const cx = rand(320, 740);
    const cy = rand(190, 450);
    const rx = rand(120, 185);
    const ry = rand(90, 145);
    const lp: number[][] = [];
    for (let a = 0; a < 6.2; a += Math.PI / 8) {
      const rr = 1 + rand(-0.12, 0.12);
      lp.push([cx + Math.cos(a) * rx * rr, cy + Math.sin(a) * ry * rr]);
    }
    els.push({ t: 'polygon', points: pts(lp), fill: C.water });
  }

  // Parks
  const parkN = mini ? 1 : 1 + Math.floor(rng() * 3);
  for (let i = 0; i < parkN; i++) {
    const cx = rand(130, 870);
    const cy = rand(120, 520);
    const rx = rand(48, 105);
    const ry = rand(40, 85);
    const pp: number[][] = [];
    for (let a = 0; a < 6.2; a += Math.PI / 6) {
      const rr = 1 + rand(-0.16, 0.16);
      pp.push([cx + Math.cos(a) * rx * rr, cy + Math.sin(a) * ry * rr]);
    }
    els.push({ t: 'polygon', points: pts(pp), fill: C.park, opacity: 0.85 });
  }

  // Arterial roads (casing then fill)
  const artN = mini ? 2 : 2 + Math.floor(rng() * 2);
  const caseW = mini ? 5 : 9;
  const fillW = mini ? 2.3 : 5;
  for (let i = 0; i < artN; i++) {
    const horiz = rng() < 0.5;
    let ps: number[][];
    if (horiz) {
      const y = rand(90, H - 90);
      const y2 = y + rand(-160, 160);
      ps = [[EX.x0, y], [W * 0.5, (y + y2) / 2], [EX.x1, y2]];
    } else {
      const x = rand(90, W - 90);
      const x2 = x + rand(-160, 160);
      ps = [[x, EX.y0], [(x + x2) / 2, H * 0.5], [x2, EX.y1]];
    }
    els.push({ t: 'polyline', points: pts(ps), stroke: C.roadCase, strokeWidth: caseW });
    els.push({ t: 'polyline', points: pts(ps), stroke: C.road, strokeWidth: fillW });
  }

  // Local street grid + buildings
  const rw = rand(280, 410);
  const rh = rand(190, 290);
  const rx0 = rand(40, W - rw - 40);
  const ry0 = rand(40, H - rh - 40);
  const sp = mini ? 68 : rand(56, 74);
  const gridLines: Array<['v' | 'h', number]> = [];
  for (let x = rx0; x <= rx0 + rw + 0.1; x += sp) gridLines.push(['v', x]);
  for (let y = ry0; y <= ry0 + rh + 0.1; y += sp) gridLines.push(['h', y]);

  if (!mini) {
    for (let x = rx0; x < rx0 + rw - sp * 0.5; x += sp) {
      for (let y = ry0; y < ry0 + rh - sp * 0.5; y += sp) {
        if (rng() < 0.55) {
          const pad = sp * 0.17;
          const bw = sp - pad * 2 - rng() * sp * 0.14;
          const bh = sp - pad * 2 - rng() * sp * 0.14;
          els.push({ t: 'rect', x: x + pad, y: y + pad, width: Math.max(6, bw), height: Math.max(6, bh), fill: C.bldg, stroke: C.bldgStroke, strokeWidth: 1, rx: 1.5 });
        }
      }
    }
  }
  const line = (o: 'v' | 'h', v: number, stroke: string, strokeWidth: number): BasemapShape =>
    o === 'v'
      ? { t: 'line', x1: v, y1: ry0, x2: v, y2: ry0 + rh, stroke, strokeWidth }
      : { t: 'line', x1: rx0, y1: v, x2: rx0 + rw, y2: v, stroke, strokeWidth };
  gridLines.forEach((g) => els.push(line(g[0], g[1], C.roadCase, mini ? 3.4 : 5)));
  gridLines.forEach((g) => els.push(line(g[0], g[1], C.road, mini ? 1.5 : 2.6)));

  // Labels
  if (!mini) {
    const names = ['NORTH REACH', 'HARBOR HILL', 'OLD TOWN', 'RIDGEWAY', 'MILL DISTRICT', 'EASTBANK', 'CEDAR FLATS', 'WESTGATE', 'THE LEVEE', 'GREENPOINT'];
    els.push({ t: 'text', x: rx0 + rw / 2, y: ry0 + rh / 2, text: pick(names), fill: C.label, fontSize: 13, letterSpacing: '0.18em', fontFamily: 'IBM Plex Mono, monospace' });
  }

  return els;
}
