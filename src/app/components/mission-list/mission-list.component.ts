import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import {
  Mission,
  MISSION_STATUS_COLORS,
  MISSION_STATUS_LABELS,
  MissionStatus
} from '../../models/mission.model';
import { MissionService } from '../../services/mission.service';
import { AuthService } from '../../services/auth.service';
import { MissionPlanService } from '../../services/mission-plan.service';
import { BidService } from '../../services/bid.service';
import { MissionMapComponent } from '../mission-map/mission-map.component';
import { Geofence, MissionPlan, Waypoint } from '../../models/mission-plan.model';
import { distanceText } from '../../util/plan-geometry';

interface StatTile {
  label: string;
  value: number;
  color: string;
}

/**
 * Two experiences off one component, chosen by the route's `mine` data flag:
 * - `mine` = true  → the designer dashboard (own missions + stat tiles).
 * - `mine` = false → the pilot feed / marketplace (open missions + tabs + search).
 * Cards link to the mission detail; edit/delete live there.
 */
@Component({
  selector: 'app-mission-list',
  imports: [CommonModule, RouterLink, MissionMapComponent],
  templateUrl: './mission-list.component.html',
  styleUrl: './mission-list.component.css'
})
export class MissionListComponent implements OnInit {
  private readonly missionService = inject(MissionService);
  private readonly route = inject(ActivatedRoute);
  private readonly planService = inject(MissionPlanService);
  private readonly bidService = inject(BidService);
  readonly auth = inject(AuthService);

  readonly statusLabels = MISSION_STATUS_LABELS;
  readonly statusColors = MISSION_STATUS_COLORS;
  /** Stable empty array for cards whose mission has no saved plan. */
  readonly noWaypoints: Waypoint[] = [];
  /** Locally-saved flight plans, by mission id (waypoints/location/zone). */
  private plans: Record<number, MissionPlan | null> = {};

  mine = false;
  loading = true;
  error = false;
  missions: Mission[] = [];

  /** Pilot feed only. */
  tab: 'open' | 'mine' = 'open';
  search = '';

  ngOnInit(): void {
    this.mine = this.route.snapshot.data['mine'] === true;
    this.load();
  }

  private load(): void {
    this.loading = true;
    this.error = false;
    const source = this.mine ? this.missionService.getMine() : this.missionService.getAll();
    source.subscribe({
      next: (missions) => {
        this.missions = missions;
        this.plans = {};
        for (const m of missions) {
          this.plans[m.id] = this.planService.get(m.id);
        }
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }

  /** Card thumbnail data from the mission's saved plan (empty if none). */
  waypointsFor(id: number): Waypoint[] {
    return this.plans[id]?.waypoints ?? this.noWaypoints;
  }
  geofenceFor(id: number): Geofence | null {
    return this.plans[id]?.geofence ?? null;
  }
  locationFor(id: number): string {
    return this.plans[id]?.location ?? '';
  }
  pathFor(id: number): string {
    const wps = this.plans[id]?.waypoints;
    return wps && wps.length > 1 ? distanceText(wps) : '—';
  }

  /** Dashboard stat tiles, computed client-side from the loaded missions. */
  get stats(): StatTile[] {
    const count = (status: MissionStatus) => this.missions.filter((m) => m.status === status).length;
    return [
      { label: 'Total', value: this.missions.length, color: '#2f6bff' },
      { label: 'Draft', value: count('DRAFT'), color: MISSION_STATUS_COLORS.DRAFT },
      { label: 'Published', value: count('PUBLISHED'), color: MISSION_STATUS_COLORS.PUBLISHED },
      { label: 'Completed', value: count('COMPLETED'), color: MISSION_STATUS_COLORS.COMPLETED }
    ];
  }

  /** The cards to render: search + tab filtering applies on the pilot feed. */
  get visibleMissions(): Mission[] {
    if (this.mine) {
      return this.missions;
    }
    // "My bids & jobs" = open missions the pilot has placed a (local) bid on.
    if (this.tab === 'mine') {
      const me = this.auth.profile?.username ?? '';
      return this.missions.filter((m) => !!this.bidService.myBid(m.id, me));
    }
    const query = this.search.trim().toLowerCase();
    return query ? this.missions.filter((m) => m.name.toLowerCase().includes(query)) : this.missions;
  }

  setTab(tab: 'open' | 'mine'): void {
    this.tab = tab;
  }

  onSearch(value: string): void {
    this.search = value;
  }

  /** "Jul 18 – Jul 22" style flight window from the mission's start/end times. */
  formatWindow(mission: Mission): string {
    const fmt = (iso?: string) =>
      iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
    if (!mission.startTime && !mission.endTime) {
      return 'TBD';
    }
    return `${fmt(mission.startTime)} – ${fmt(mission.endTime)}`;
  }
}
