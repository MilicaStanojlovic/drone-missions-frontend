import { Component, Input, OnChanges } from '@angular/core';

import { Geofence, LatLng } from '../../models/mission.model';

interface Node {
  x: number;
  y: number;
  color: string;
}

/**
 * A tiny, tile-free SVG thumbnail of a flight plan — the route polyline, waypoint
 * dots and flight zone, normalized to a fixed box. Used on the card grids so we
 * don't mount dozens of live Leaflet maps.
 */
@Component({
  selector: 'app-route-preview',
  imports: [],
  template: `
    <svg class="rp" viewBox="0 0 100 64" preserveAspectRatio="xMidYMid meet">
      @if (hasRoute) {
        @if (zoneCircle) {
          <ellipse
            [attr.cx]="zoneCircle.cx"
            [attr.cy]="zoneCircle.cy"
            [attr.rx]="zoneCircle.rx"
            [attr.ry]="zoneCircle.ry"
            fill="rgba(109,94,240,0.08)"
            stroke="#6d5ef0"
            stroke-width="0.7"
            stroke-dasharray="2 1.5"
          />
        }
        @if (zonePoly) {
          <polygon
            [attr.points]="zonePoly"
            fill="rgba(109,94,240,0.08)"
            stroke="#6d5ef0"
            stroke-width="0.7"
            stroke-dasharray="2 1.5"
          />
        }
        @if (pathPoints) {
          <polyline [attr.points]="pathPoints" fill="none" stroke="#2f6bff" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round" />
        }
        @for (n of nodes; track $index) {
          <circle [attr.cx]="n.x" [attr.cy]="n.y" r="1.7" fill="#fff" [attr.stroke]="n.color" stroke-width="1.1" />
        }
      } @else {
        <text x="50" y="34" text-anchor="middle" fill="#a2afbc" font-size="6" font-family="'IBM Plex Mono', monospace">NO ROUTE</text>
      }
    </svg>
  `,
  styles: [
    `
      :host { display: block; width: 100%; height: 100%; }
      .rp {
        width: 100%;
        height: 100%;
        display: block;
        background:
          linear-gradient(rgba(40, 70, 100, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(40, 70, 100, 0.05) 1px, transparent 1px),
          linear-gradient(180deg, #eef2f6, #e7edf2);
        background-size: 12px 12px, 12px 12px, auto;
      }
    `
  ]
})
export class RoutePreviewComponent implements OnChanges {
  @Input() waypoints: LatLng[] = [];
  @Input() geofence: Geofence | null = null;

  hasRoute = false;
  pathPoints = '';
  nodes: Node[] = [];
  zoneCircle: { cx: number; cy: number; rx: number; ry: number } | null = null;
  zonePoly = '';

  ngOnChanges(): void {
    this.compute();
  }

  private compute(): void {
    this.zoneCircle = null;
    this.zonePoly = '';
    this.nodes = [];
    this.pathPoints = '';

    const wps = this.waypoints ?? [];
    this.hasRoute = wps.length > 0;
    if (!this.hasRoute) {
      return;
    }

    // Bounds over waypoints + geofence extent.
    const lats: number[] = wps.map((p) => p.lat);
    const lngs: number[] = wps.map((p) => p.lng);
    const g = this.geofence;
    if (g?.type === 'CIRCLE') {
      const dLat = g.radiusMeters / 111_320;
      const dLng = g.radiusMeters / (111_320 * Math.cos((g.center.lat * Math.PI) / 180));
      lats.push(g.center.lat - dLat, g.center.lat + dLat);
      lngs.push(g.center.lng - dLng, g.center.lng + dLng);
    } else if (g?.type === 'POLYGON') {
      g.points.forEach((p) => {
        lats.push(p.lat);
        lngs.push(p.lng);
      });
    }

    let minLat = Math.min(...lats);
    let maxLat = Math.max(...lats);
    let minLng = Math.min(...lngs);
    let maxLng = Math.max(...lngs);
    // Guard degenerate spans.
    if (maxLat - minLat < 1e-4) {
      minLat -= 5e-5;
      maxLat += 5e-5;
    }
    if (maxLng - minLng < 1e-4) {
      minLng -= 5e-5;
      maxLng += 5e-5;
    }

    const pad = 8;
    const w = 100 - pad * 2;
    const h = 64 - pad * 2;
    const x = (lng: number) => pad + ((lng - minLng) / (maxLng - minLng)) * w;
    const y = (lat: number) => pad + ((maxLat - lat) / (maxLat - minLat)) * h; // flip: north = up

    this.pathPoints = wps.map((p) => `${x(p.lng).toFixed(1)},${y(p.lat).toFixed(1)}`).join(' ');
    this.nodes = wps.map((p, i) => ({
      x: +x(p.lng).toFixed(1),
      y: +y(p.lat).toFixed(1),
      color: i === 0 ? '#12a06a' : '#2f6bff'
    }));

    if (g?.type === 'CIRCLE') {
      const dLat = g.radiusMeters / 111_320;
      const dLng = g.radiusMeters / (111_320 * Math.cos((g.center.lat * Math.PI) / 180));
      this.zoneCircle = {
        cx: +x(g.center.lng).toFixed(1),
        cy: +y(g.center.lat).toFixed(1),
        rx: +(x(g.center.lng + dLng) - x(g.center.lng)).toFixed(1),
        ry: +(y(g.center.lat - dLat) - y(g.center.lat)).toFixed(1)
      };
    } else if (g?.type === 'POLYGON') {
      this.zonePoly = g.points.map((p) => `${x(p.lng).toFixed(1)},${y(p.lat).toFixed(1)}`).join(' ');
    }
  }
}
