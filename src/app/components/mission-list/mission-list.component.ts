import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import {
  Mission,
  MISSION_STATUS_COLORS,
  MISSION_STATUS_LABELS,
  MissionStatus
} from '../../models/mission.model';
import { FeedFilters, MissionService } from '../../services/mission.service';
import { AuthService } from '../../services/auth.service';
import { BidService } from '../../services/bid.service';
import { MissionMapComponent } from '../mission-map/mission-map.component';
import { distanceText } from '../../util/geo';

interface StatTile {
  label: string;
  value: number;
  color: string;
}

/**
 * Two experiences off one component, chosen by the route's `mine` data flag:
 * - `mine` = true  → the designer dashboard (own missions + stat tiles).
 * - `mine` = false → the pilot feed / marketplace (open missions + tabs + filters).
 * Cards link to the mission detail; edit/delete live there.
 */
@Component({
  selector: 'app-mission-list',
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MissionMapComponent],
  templateUrl: './mission-list.component.html',
  styleUrl: './mission-list.component.css'
})
export class MissionListComponent implements OnInit {
  private readonly missionService = inject(MissionService);
  private readonly route = inject(ActivatedRoute);
  private readonly bidService = inject(BidService);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly statusLabels = MISSION_STATUS_LABELS;
  readonly statusColors = MISSION_STATUS_COLORS;

  mine = false;
  loading = true;
  error = false;
  missions: Mission[] = [];

  /** Pilot feed only. */
  tab: 'open' | 'mine' = 'open';

  /** Pilot-feed server-side filters (open tab). */
  readonly filterForm = this.fb.nonNullable.group({
    keyword: '',
    location: '',
    date: ''
  });

  ngOnInit(): void {
    this.mine = this.route.snapshot.data['mine'] === true;
    // Re-query the feed as the pilot types/picks (debounced); the dashboard doesn't filter.
    if (!this.mine) {
      this.filterForm.valueChanges
        .pipe(
          debounceTime(300),
          distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
        )
        .subscribe(() => this.load());
    }
    this.load();
  }

  private load(): void {
    this.loading = true;
    this.error = false;
    const source = this.mine
      ? this.missionService.getMine()
      : this.missionService.getAll(this.activeFilters());
    source.subscribe({
      next: (missions) => {
        this.missions = missions;
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }

  /** The current feed filters as sent to the backend (empty strings are dropped by the service). */
  private activeFilters(): FeedFilters {
    const { keyword, location, date } = this.filterForm.getRawValue();
    return { keyword, location, date };
  }

  get hasActiveFilters(): boolean {
    const { keyword, location, date } = this.filterForm.getRawValue();
    return !!(keyword.trim() || location.trim() || date);
  }

  clearFilters(): void {
    this.filterForm.reset({ keyword: '', location: '', date: '' });
  }

  /** Path distance shown on a mission's card (— when it has no route). */
  pathFor(mission: Mission): string {
    const wps = mission.waypoints;
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

  /**
   * The cards to render. The open feed is already filtered server-side (keyword/location/date),
   * so it renders as-is; only "My bids & jobs" narrows client-side (bids are local-only).
   */
  get visibleMissions(): Mission[] {
    if (this.mine) {
      return this.missions;
    }
    // "My bids & jobs" = open missions the pilot has placed a (local) bid on.
    if (this.tab === 'mine') {
      const me = this.auth.profile?.username ?? '';
      return this.missions.filter((m) => !!this.bidService.myBid(m.id, me));
    }
    return this.missions;
  }

  setTab(tab: 'open' | 'mine'): void {
    this.tab = tab;
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
