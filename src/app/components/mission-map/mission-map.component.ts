import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import * as L from 'leaflet';

import {
  Geofence,
  LatLng,
  WAYPOINT_ACTION_ICONS,
  WAYPOINT_ACTION_LABELS,
  Waypoint
} from '../../models/mission.model';
import { DEFAULT_CENTER, DEFAULT_ZOOM, clampToZone, distanceMeters, inZone } from '../../util/geo';

const ZONE_COLOR = '#6d5ef0';

/**
 * The flight map, on Leaflet (OpenStreetMap tiles, real lat/lng). Controlled
 * component: emits `waypointsChange` / `geofenceChange` and expects the parent to
 * feed the new values back. In `editable` + `mode='add'` a map click appends a
 * waypoint; in `mode='select'` markers drag (right-click removes) and the flight
 * zone gets drag handles. Read-only otherwise (still pannable/zoomable).
 *
 * Adding is now a two-step flow owned by the parent: a map click emits
 * `waypointAdd` (the parent collects altitude/action, then feeds `waypoints`
 * back), and clicking an existing marker emits `waypointEdit` with its index.
 */
@Component({
  selector: 'app-mission-map',
  imports: [],
  template: `<div #mapEl class="map" [class.map--static]="!interactive"></div>`,
  styles: [
    `
      :host { display: block; width: 100%; height: 100%; }
      .map { width: 100%; height: 100%; background: #eef1ec; }
      /* Static thumbnail: purely visual, let clicks fall through to the card link. */
      .map--static { pointer-events: none; }
    `
  ]
})
export class MissionMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() waypoints: Waypoint[] = [];
  @Input() geofence: Geofence | null = null;
  @Input() editable = false;
  @Input() mode: 'add' | 'select' | 'pan' = 'add';
  /** When false the map is a static thumbnail: no pan/zoom/controls, clicks pass through. */
  @Input() interactive = true;

  @Output() waypointsChange = new EventEmitter<Waypoint[]>();
  /** A click on empty map in `add` mode — the parent decides what to append. */
  @Output() waypointAdd = new EventEmitter<LatLng>();
  /** A click on an existing marker, by index. */
  @Output() waypointEdit = new EventEmitter<number>();
  @Output() geofenceChange = new EventEmitter<Geofence>();
  @Output() outOfZone = new EventEmitter<void>();

  @ViewChild('mapEl', { static: true }) private mapEl!: ElementRef<HTMLDivElement>;

  private map?: L.Map;
  private readonly plan = L.layerGroup();
  private pathLine?: L.Polyline;
  private zoneShape?: L.Circle | L.Polygon;
  private markers: L.Marker[] = [];
  private fitted = false;

  ngAfterViewInit(): void {
    const options: L.MapOptions = { center: [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], zoom: DEFAULT_ZOOM };
    if (!this.interactive) {
      // Static thumbnail — kill every interaction handler and chrome, keep just the tiles + route.
      Object.assign(options, {
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        touchZoom: false,
        keyboard: false,
        zoomControl: false,
        attributionControl: false
      });
    }
    this.map = L.map(this.mapEl.nativeElement, options);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
    this.plan.addTo(this.map);
    this.map.on('click', (e: L.LeafletMouseEvent) => this.onMapClick(e));
    setTimeout(() => this.map?.invalidateSize(), 0);
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.map && (changes['waypoints'] || changes['geofence'] || changes['mode'] || changes['editable'])) {
      this.render();
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  // ---- interaction ----
  private onMapClick(e: L.LeafletMouseEvent): void {
    if (!this.editable || this.mode !== 'add') {
      return;
    }
    const p: LatLng = { lat: e.latlng.lat, lng: e.latlng.lng };
    if (!inZone(p, this.geofence)) {
      this.outOfZone.emit();
      return;
    }
    this.waypointAdd.emit(p);
  }

  /** Marker positions merged back onto the waypoints, so altitude/action survive a drag. */
  private currentWaypoints(): Waypoint[] {
    return this.markers.map((m, i) => ({
      ...this.waypoints[i],
      lat: m.getLatLng().lat,
      lng: m.getLatLng().lng
    }));
  }

  // ---- rendering ----
  private render(): void {
    if (!this.map) {
      return;
    }
    this.plan.clearLayers();
    this.markers = [];
    this.pathLine = undefined;
    this.zoneShape = undefined;

    this.renderZone();

    if (this.waypoints.length >= 2) {
      this.pathLine = L.polyline(
        this.waypoints.map((p) => [p.lat, p.lng] as [number, number]),
        { color: '#2f6bff', weight: 3, opacity: 0.9, dashArray: '8 6' }
      );
      this.plan.addLayer(this.pathLine);
    }

    this.waypoints.forEach((wp, i) => this.renderWaypoint(wp, i));

    if (!this.fitted) {
      this.fitToPlan();
    }
  }

  private renderWaypoint(wp: Waypoint, i: number): void {
    const outside = this.geofence != null && !inZone(wp, this.geofence);
    const color = outside ? '#e04a3f' : i === 0 ? '#12a06a' : '#2f6bff';
    const draggable = this.editable && this.mode === 'select';
    const marker = L.marker([wp.lat, wp.lng], { draggable, icon: this.waypointIcon(wp, i, color) });
    const tooltip = this.waypointTooltip(wp);
    if (tooltip) {
      marker.bindTooltip(tooltip, { direction: 'top', offset: [0, -14], opacity: 0.95 });
    }
    if (this.editable) {
      marker.on('click', () => this.waypointEdit.emit(i));
    }
    if (draggable) {
      marker.on('drag', () => this.pathLine?.setLatLngs(this.markers.map((m) => m.getLatLng())));
      marker.on('dragend', () => {
        const next = this.currentWaypoints().map((p) => {
          const clamped = clampToZone(p, this.geofence);
          return clamped ? { ...p, lat: clamped.lat, lng: clamped.lng } : p;
        });
        this.waypointsChange.emit(next);
      });
      marker.on('contextmenu', () => this.waypointsChange.emit(this.waypoints.filter((_, idx) => idx !== i)));
    }
    this.markers.push(marker);
    this.plan.addLayer(marker);
  }

  /** Numbered pin, with an action badge clipped to its corner when the waypoint has one. */
  private waypointIcon(wp: Waypoint, i: number, color: string): L.DivIcon {
    const pin =
      `<div style="width:26px;height:26px;border-radius:50%;background:#fff;border:2.5px solid ${color};` +
      `display:flex;align-items:center;justify-content:center;font:600 12px 'IBM Plex Mono',monospace;` +
      `color:${color};box-shadow:0 1px 3px rgba(20,35,55,.3)">${i + 1}</div>`;
    // Legacy waypoints carry no action — keep the plain marker.
    if (!wp.action) {
      return L.divIcon({ className: '', html: pin, iconSize: [26, 26], iconAnchor: [13, 13] });
    }
    const badge =
      `<div style="position:absolute;right:-5px;bottom:-4px;width:15px;height:15px;border-radius:50%;` +
      `background:${color};border:1.5px solid #fff;color:#fff;display:flex;align-items:center;` +
      `justify-content:center;box-shadow:0 1px 2px rgba(20,35,55,.35)">` +
      `<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" ` +
      `stroke-linecap="round" stroke-linejoin="round">${WAYPOINT_ACTION_ICONS[wp.action]}</svg></div>`;
    return L.divIcon({
      className: '',
      html: `<div style="position:relative;width:26px;height:26px">${pin}${badge}</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });
  }

  /** `Hover 30 s · 60 m` — empty for legacy waypoints that carry neither field. */
  private waypointTooltip(wp: Waypoint): string {
    const parts: string[] = [];
    if (wp.action) {
      const seconds = wp.action === 'HOVER' && wp.hoverDurationSeconds ? ` ${wp.hoverDurationSeconds} s` : '';
      parts.push(`${WAYPOINT_ACTION_LABELS[wp.action]}${seconds}`);
    }
    if (wp.altitude != null) {
      parts.push(`${wp.altitude} m`);
    }
    return parts.join(' · ');
  }

  private renderZone(): void {
    const z = this.geofence;
    if (!z) {
      return;
    }
    const style: L.PathOptions = {
      color: ZONE_COLOR,
      weight: 2,
      dashArray: '8 6',
      fillColor: ZONE_COLOR,
      fillOpacity: 0.08
    };
    if (z.type === 'CIRCLE') {
      this.zoneShape = L.circle([z.center.lat, z.center.lng], { radius: z.radiusMeters, ...style });
      this.plan.addLayer(this.zoneShape);
      if (this.editable && this.mode === 'select') {
        this.renderCircleHandles(z);
      }
    } else {
      this.zoneShape = L.polygon(z.points.map((p) => [p.lat, p.lng] as [number, number]), style);
      this.plan.addLayer(this.zoneShape);
      if (this.editable && this.mode === 'select') {
        this.renderPolygonHandles(z);
      }
    }
  }

  private handleIcon(filled: boolean): L.DivIcon {
    const bg = filled ? ZONE_COLOR : '#fff';
    const border = filled ? '#fff' : ZONE_COLOR;
    return L.divIcon({
      className: '',
      html: `<div style="width:14px;height:14px;border-radius:50%;background:${bg};border:2px solid ${border};box-shadow:0 1px 2px rgba(20,35,55,.3)"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });
  }

  private renderCircleHandles(z: Extract<Geofence, { type: 'CIRCLE' }>): void {
    const center = L.marker([z.center.lat, z.center.lng], { draggable: true, icon: this.handleIcon(true) });
    // radius handle placed due east of the centre
    const edge = { lat: z.center.lat, lng: z.center.lng + z.radiusMeters / (111_320 * Math.cos((z.center.lat * Math.PI) / 180)) };
    const radius = L.marker([edge.lat, edge.lng], { draggable: true, icon: this.handleIcon(false) });

    center.on('drag', () => {
      const c = center.getLatLng();
      (this.zoneShape as L.Circle).setLatLng(c);
    });
    center.on('dragend', () => {
      const c = center.getLatLng();
      this.geofenceChange.emit({ type: 'CIRCLE', center: { lat: c.lat, lng: c.lng }, radiusMeters: z.radiusMeters });
    });
    radius.on('drag', () => {
      const c = (this.zoneShape as L.Circle).getLatLng();
      (this.zoneShape as L.Circle).setRadius(Math.max(50, distanceMeters({ lat: c.lat, lng: c.lng }, radius.getLatLng())));
    });
    radius.on('dragend', () => {
      const c = (this.zoneShape as L.Circle).getLatLng();
      const r = Math.max(50, Math.round(distanceMeters({ lat: c.lat, lng: c.lng }, radius.getLatLng())));
      this.geofenceChange.emit({ type: 'CIRCLE', center: { lat: c.lat, lng: c.lng }, radiusMeters: r });
    });
    this.plan.addLayer(center);
    this.plan.addLayer(radius);
  }

  private renderPolygonHandles(z: Extract<Geofence, { type: 'POLYGON' }>): void {
    z.points.forEach((pt, i) => {
      const handle = L.marker([pt.lat, pt.lng], { draggable: true, icon: this.handleIcon(false) });
      handle.on('drag', () => {
        const pts = z.points.map((p, idx) => (idx === i ? handle.getLatLng() : L.latLng(p.lat, p.lng)));
        (this.zoneShape as L.Polygon).setLatLngs(pts);
      });
      handle.on('dragend', () => {
        const g = handle.getLatLng();
        const points = z.points.map((p, idx) => (idx === i ? { lat: g.lat, lng: g.lng } : p));
        this.geofenceChange.emit({ type: 'POLYGON', points });
      });
      this.plan.addLayer(handle);
    });
  }

  private fitToPlan(): void {
    if (!this.map) {
      return;
    }
    const pts: L.LatLngExpression[] = this.waypoints.map((p) => [p.lat, p.lng]);
    if (this.geofence?.type === 'CIRCLE') {
      pts.push([this.geofence.center.lat, this.geofence.center.lng]);
    } else if (this.geofence?.type === 'POLYGON') {
      this.geofence.points.forEach((p) => pts.push([p.lat, p.lng]));
    }
    if (pts.length === 1) {
      this.map.setView(pts[0], 14);
      this.fitted = true;
    } else if (pts.length > 1) {
      this.map.fitBounds(L.latLngBounds(pts).pad(0.25));
      this.fitted = true;
    }
  }
}
