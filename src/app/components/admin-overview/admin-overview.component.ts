import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PlatformStatsService } from '../../services/platform-stats.service';
import { PlatformStats, TopMission } from '../../models/stats.model';
import {
  MISSION_STATUSES,
  MISSION_STATUS_COLORS,
  MISSION_STATUS_LABELS
} from '../../models/mission.model';

/** Admin view: platform-wide snapshot counts as stat tiles and simple bars. */
@Component({
  selector: 'app-admin-overview',
  imports: [CommonModule],
  templateUrl: './admin-overview.component.html',
  styleUrl: './admin-overview.component.css'
})
export class AdminOverviewComponent implements OnInit {
  private readonly statsService = inject(PlatformStatsService);

  readonly statuses = MISSION_STATUSES;
  readonly statusLabels = MISSION_STATUS_LABELS;
  readonly statusColors = MISSION_STATUS_COLORS;

  loading = true;
  error = false;
  stats: PlatformStats | null = null;

  ngOnInit(): void {
    this.statsService.getOverview().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  get totalMissions(): number {
    return Object.values(this.stats?.missionsByStatus ?? {}).reduce((a, b) => a + b, 0);
  }

  /** Wording as in the design canvas: $ + thousands separators, no decimals. */
  get bidVolumeText(): string {
    return '$' + Math.round(this.stats?.bidAmountTotal ?? 0).toLocaleString('en-US');
  }

  get avgBidText(): string {
    if (!this.stats || this.stats.bidCount === 0) {
      return '—';
    }
    return '$' + Math.round(this.stats.bidAmountTotal / this.stats.bidCount);
  }

  /** Bars are normalized to the largest bucket, not the total (canvas behavior). */
  statusWidth(count: number): string {
    const max = Math.max(1, ...Object.values(this.stats?.missionsByStatus ?? {}));
    return (count / max) * 100 + '%';
  }

  bidBarHeight(top: TopMission): string {
    const max = Math.max(1, ...(this.stats?.topMissionsByBids ?? []).map((t) => t.bids));
    return (top.bids / max) * 100 + '%';
  }

  barLabel(name: string): string {
    return name.split(' — ')[0].slice(0, 24);
  }

  get totalUsers(): number {
    return Object.values(this.stats?.usersByRole ?? {}).reduce((a, b) => a + b, 0);
  }

  /** User-base bars are shares of ALL users, so the rows read as a split. */
  roleShare(count: number): string {
    return (count / Math.max(1, this.totalUsers)) * 100 + '%';
  }
}
