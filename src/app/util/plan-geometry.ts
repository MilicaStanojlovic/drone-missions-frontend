/**
 * Pure flight-plan geometry — ported behaviour-for-behaviour from the DroneMissions
 * design prototype so the numbers and flight-zone maths match. No Angular/DOM here;
 * everything is in the 1000 x 640 virtual map space.
 */
import { Geofence, Waypoint } from '../models/mission-plan.model';

/** Pannable/zoomable world extent (the map can scroll a little past its frame). */
export const EX = { x0: -700, y0: -448, x1: 1700, y1: 1088 };

/** Zoom bounds, expressed as the view width in world units. */
export const MIN_VIEW_W = 340;
export const MAX_VIEW_W = 2400;

export interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The default 1:1 view over the 1000 x 640 map. */
export function defaultView(): View {
  return { x: 0, y: 0, w: 1000, h: 640 };
}

/** Total path length in "metres" (segment pixels x 1.5), matching the design. */
export function pathMeters(wps: Waypoint[]): number {
  let d = 0;
  for (let i = 1; i < wps.length; i++) {
    const dx = wps[i].x - wps[i - 1].x;
    const dy = wps[i].y - wps[i - 1].y;
    d += Math.sqrt(dx * dx + dy * dy);
  }
  return d * 1.5;
}

export function distanceText(wps: Waypoint[]): string {
  return (pathMeters(wps) / 1000).toFixed(2) + ' km';
}

export function durationText(wps: Waypoint[]): string {
  return Math.max(0, Math.round(pathMeters(wps) / 9 / 60)) + ' min';
}

/** Smallest circle around the waypoints (centroid + furthest point + padding). */
export function enclosingCircle(wps: Waypoint[], pad = 70): Geofence {
  if (!wps || !wps.length) {
    return { type: 'circle', cx: 500, cy: 320, r: 300 };
  }
  let sx = 0;
  let sy = 0;
  wps.forEach((p) => {
    sx += p.x;
    sy += p.y;
  });
  const cx = sx / wps.length;
  const cy = sy / wps.length;
  let r = 0;
  wps.forEach((p) => {
    r = Math.max(r, Math.hypot(p.x - cx, p.y - cy));
  });
  return { type: 'circle', cx: Math.round(cx), cy: Math.round(cy), r: Math.round(r + pad) };
}

export function pointInPolygon(p: Waypoint, pts: Waypoint[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x;
    const yi = pts[i].y;
    const xj = pts[j].x;
    const yj = pts[j].y;
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / ((yj - yi) || 1e-9) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function inZone(p: Waypoint, z: Geofence | null | undefined): boolean {
  if (!z) {
    return true;
  }
  if (z.type === 'circle') {
    return Math.hypot(p.x - z.cx, p.y - z.cy) <= z.r + 0.5;
  }
  return pointInPolygon(p, z.pts);
}

/** Clamp a point into the zone; returns null for a polygon point that's outside. */
export function clampToZone(p: Waypoint, z: Geofence | null | undefined): Waypoint | null {
  if (!z) {
    return p;
  }
  if (z.type === 'circle') {
    const dx = p.x - z.cx;
    const dy = p.y - z.cy;
    const d = Math.hypot(dx, dy);
    if (d <= z.r) {
      return p;
    }
    const k = z.r / (d || 1);
    return { x: Math.round(z.cx + dx * k), y: Math.round(z.cy + dy * k) };
  }
  return pointInPolygon(p, z.pts) ? p : null;
}

export function zoneCentroid(z: Geofence): Waypoint {
  if (z.type === 'circle') {
    return { x: z.cx, y: z.cy };
  }
  let sx = 0;
  let sy = 0;
  z.pts.forEach((p) => {
    sx += p.x;
    sy += p.y;
  });
  return { x: sx / z.pts.length, y: sy / z.pts.length };
}

/** Convert any zone to a circle (keeps rough position/size). */
export function zoneToCircle(z: Geofence | null): Geofence {
  if (z && z.type === 'circle') {
    return z;
  }
  if (z && z.type === 'polygon') {
    const c = enclosingCircle(z.pts, 0);
    if (c.type === 'circle') {
      return { type: 'circle', cx: c.cx, cy: c.cy, r: Math.max(80, c.r) };
    }
  }
  return { type: 'circle', cx: 500, cy: 320, r: 300 };
}

/** Convert any zone to a hexagonal polygon around its current area. */
export function zoneToPolygon(z: Geofence | null): Geofence {
  if (z && z.type === 'polygon') {
    return z;
  }
  const c = z && z.type === 'circle' ? z : { cx: 500, cy: 320, r: 300 };
  const pts: Waypoint[] = [];
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 3;
    pts.push({ x: Math.round(c.cx + Math.cos(a) * c.r), y: Math.round(c.cy + Math.sin(a) * c.r) });
  }
  return { type: 'polygon', pts };
}

/** Keep a view within the world extent and locked to a 0.64 aspect ratio. */
export function clampView(v: View): View {
  const EXW = EX.x1 - EX.x0;
  const EXH = EX.y1 - EX.y0;
  let w = Math.min(v.w, EXW);
  let h = w * 0.64;
  if (h > EXH) {
    h = EXH;
    w = h / 0.64;
  }
  let x = v.x;
  let y = v.y;
  x = w >= EXW ? EX.x0 + (EXW - w) / 2 : Math.max(EX.x0, Math.min(EX.x1 - w, x));
  y = h >= EXH ? EX.y0 + (EXH - h) / 2 : Math.max(EX.y0, Math.min(EX.y1 - h, y));
  return { x, y, w, h };
}
