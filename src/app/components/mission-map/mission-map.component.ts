import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { Geofence, Waypoint } from '../../models/mission-plan.model';
import { BasemapShape, generateBasemap } from '../../util/basemap';
import {
  EX,
  MAX_VIEW_W,
  MIN_VIEW_W,
  View,
  clampToZone,
  clampView,
  defaultView,
  inZone,
  zoneCentroid
} from '../../util/plan-geometry';

type DragKind = 'pan' | 'node' | 'zone-center' | 'zone-radius' | 'zone-vertex';
interface Drag {
  kind: DragKind;
  idx: number;
  sx?: number;
  sy?: number;
  view?: View;
  start?: Waypoint;
  zone?: Geofence;
}

/**
 * The SVG flight map. Renders a deterministic procedural basemap plus the flight
 * zone, path and numbered waypoints. In `editable` mode it supports add / drag /
 * delete of waypoints, dragging the flight zone, and zoom/pan; it is a controlled
 * component — it emits `waypointsChange` / `geofenceChange` and expects the parent
 * to feed the new values back in. Read-only otherwise; `mini` for card thumbnails.
 */
@Component({
  selector: 'app-mission-map',
  imports: [CommonModule],
  templateUrl: './mission-map.component.html',
  styleUrl: './mission-map.component.css'
})
export class MissionMapComponent implements OnChanges {
  @Input() waypoints: Waypoint[] = [];
  @Input() geofence: Geofence | null = null;
  @Input() editable = false;
  @Input() mode: 'add' | 'select' | 'pan' = 'add';
  @Input() seed = 'seed';
  @Input() mini = false;
  @Input() animatePath = true;

  @Output() waypointsChange = new EventEmitter<Waypoint[]>();
  @Output() geofenceChange = new EventEmitter<Geofence>();
  @Output() cursorMove = new EventEmitter<Waypoint>();
  @Output() outOfZone = new EventEmitter<void>();

  @ViewChild('svgEl') private svgRef?: ElementRef<SVGSVGElement>;

  basemap: BasemapShape[] = [];
  view: View = defaultView();
  selectedIdx = -1;
  private drag: Drag | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['seed'] || changes['mini']) {
      this.basemap = generateBasemap(this.seed, this.mini);
    }
  }

  // ---- derived values ----
  get viewBox(): string {
    return `${this.view.x} ${this.view.y} ${this.view.w} ${this.view.h}`;
  }
  /** World-units-per-screen-unit factor; scales stroke widths/handles at zoom. */
  get hs(): number {
    return this.view.w / 1000;
  }
  get pathPoints(): string {
    return this.waypoints.map((p) => `${p.x},${p.y}`).join(' ');
  }
  /** Flight-path stroke weight in world units (thinner on mini thumbnails). */
  get pathWeight(): number {
    return this.mini ? 2 : 3;
  }
  polygonPoints(z: Geofence): string {
    return z.type === 'polygon' ? z.pts.map((p) => `${p.x},${p.y}`).join(' ') : '';
  }
  get zoneDash(): string {
    return `${9 * this.hs} ${7 * this.hs}`;
  }
  get showHandles(): boolean {
    return this.editable && this.mode === 'select';
  }
  get cursorClass(): string {
    if (!this.editable) {
      return 'is-static';
    }
    return this.mode === 'pan' ? 'is-pan' : this.mode === 'add' ? 'is-add' : 'is-select';
  }

  nodeColor(p: Waypoint, i: number): string {
    if (this.geofence && !inZone(p, this.geofence)) {
      return '#e04a3f';
    }
    return i === 0 ? '#12a06a' : '#2f6bff';
  }

  zoneLabelPos(): Waypoint {
    return this.geofence ? zoneCentroid(this.geofence) : { x: 500, y: 320 };
  }

  // ---- pointer interaction (editable only) ----
  private worldCoords(e: PointerEvent | WheelEvent): Waypoint {
    const el = this.svgRef?.nativeElement;
    if (!el) {
      return { x: 0, y: 0 };
    }
    const rect = el.getBoundingClientRect();
    const v = this.view;
    let x = v.x + ((e.clientX - rect.left) / rect.width) * v.w;
    let y = v.y + ((e.clientY - rect.top) / rect.height) * v.h;
    x = Math.max(EX.x0, Math.min(EX.x1, x));
    y = Math.max(EX.y0, Math.min(EX.y1, y));
    return { x: Math.round(x), y: Math.round(y) };
  }

  onSvgPointerDown(e: PointerEvent): void {
    if (!this.editable) {
      return;
    }
    const p = this.worldCoords(e);
    this.svgRef?.nativeElement.setPointerCapture(e.pointerId);
    if (this.mode === 'pan') {
      this.drag = { kind: 'pan', idx: 0, sx: e.clientX, sy: e.clientY, view: { ...this.view } };
      return;
    }
    if (this.mode === 'add') {
      if (!inZone(p, this.geofence)) {
        this.outOfZone.emit();
        return;
      }
      const next = [...this.waypoints, p];
      this.selectedIdx = next.length - 1;
      this.waypointsChange.emit(next);
      return;
    }
    // select
    this.selectedIdx = -1;
  }

  onNodePointerDown(i: number, e: PointerEvent): void {
    if (!this.editable || this.mode !== 'select') {
      return;
    }
    e.stopPropagation();
    this.svgRef?.nativeElement.setPointerCapture(e.pointerId);
    this.selectedIdx = i;
    this.drag = { kind: 'node', idx: i };
  }

  onZonePointerDown(kind: DragKind, idx: number, e: PointerEvent): void {
    if (!this.editable || this.mode !== 'select' || !this.geofence) {
      return;
    }
    e.stopPropagation();
    this.svgRef?.nativeElement.setPointerCapture(e.pointerId);
    this.drag = { kind, idx, start: this.worldCoords(e), zone: structuredClone(this.geofence) };
  }

  onSvgPointerMove(e: PointerEvent): void {
    if (!this.editable) {
      return;
    }
    const p = this.worldCoords(e);
    this.cursorMove.emit(p);
    const d = this.drag;
    if (!d) {
      return;
    }
    if (d.kind === 'pan' && d.view && d.sx != null && d.sy != null) {
      const rect = this.svgRef!.nativeElement.getBoundingClientRect();
      const v = d.view;
      const dx = ((e.clientX - d.sx) / rect.width) * v.w;
      const dy = ((e.clientY - d.sy) / rect.height) * v.h;
      this.view = clampView({ x: v.x - dx, y: v.y - dy, w: v.w, h: v.h });
      return;
    }
    if (d.kind === 'node') {
      const cp = clampToZone(p, this.geofence);
      if (!cp) {
        return;
      }
      this.waypointsChange.emit(this.waypoints.map((w, i) => (i === d.idx ? cp : w)));
      return;
    }
    if (d.zone) {
      this.dragZone(d, p);
    }
  }

  private dragZone(d: Drag, p: Waypoint): void {
    const z = d.zone!;
    if (d.kind === 'zone-center') {
      if (z.type === 'circle') {
        this.geofenceChange.emit({ ...z, cx: p.x, cy: p.y });
      } else if (d.start) {
        const dx = p.x - d.start.x;
        const dy = p.y - d.start.y;
        this.geofenceChange.emit({
          type: 'polygon',
          pts: z.pts.map((q) => ({ x: Math.round(q.x + dx), y: Math.round(q.y + dy) }))
        });
      }
    } else if (d.kind === 'zone-radius' && z.type === 'circle') {
      this.geofenceChange.emit({ ...z, r: Math.max(70, Math.round(Math.hypot(p.x - z.cx, p.y - z.cy))) });
    } else if (d.kind === 'zone-vertex' && z.type === 'polygon') {
      this.geofenceChange.emit({ type: 'polygon', pts: z.pts.map((q, i) => (i === d.idx ? p : q)) });
    }
  }

  onSvgPointerUp(): void {
    this.drag = null;
  }

  onWheel(e: WheelEvent): void {
    if (!this.editable) {
      return;
    }
    e.preventDefault();
    const p = this.worldCoords(e);
    this.zoomAround(e.deltaY > 0 ? 1.12 : 0.9, p.x, p.y);
  }

  removeWaypoint(i: number, e: Event): void {
    e.stopPropagation();
    this.selectedIdx = -1;
    this.waypointsChange.emit(this.waypoints.filter((_, idx) => idx !== i));
  }

  private zoomAround(factor: number, fx: number, fy: number): void {
    const v = this.view;
    const nw = Math.max(MIN_VIEW_W, Math.min(MAX_VIEW_W, v.w * factor));
    const nh = nw * 0.64;
    const nx = fx - (fx - v.x) * (nw / v.w);
    const ny = fy - (fy - v.y) * (nh / v.h);
    this.view = clampView({ x: nx, y: ny, w: nw, h: nh });
  }

  zoomIn(): void {
    this.zoomAround(0.82, this.view.x + this.view.w / 2, this.view.y + this.view.h / 2);
  }
  zoomOut(): void {
    this.zoomAround(1.22, this.view.x + this.view.w / 2, this.view.y + this.view.h / 2);
  }
  zoomReset(): void {
    this.view = defaultView();
  }
}
