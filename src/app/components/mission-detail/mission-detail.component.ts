import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  Geofence,
  LatLng,
  Mission,
  MISSION_LIFECYCLE,
  MISSION_STATUS_COLORS,
  MISSION_STATUS_LABELS
} from '../../models/mission.model';
import { MissionService } from '../../services/mission.service';
import { BidService, Bid } from '../../services/bid.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { MissionMapComponent } from '../mission-map/mission-map.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { distanceText, durationText } from '../../util/geo';

interface TimelineStep {
  label: string;
  color: string;
  reached: boolean;
  current: boolean;
  last: boolean;
}

/**
 * Role-aware mission detail: status timeline, read-only flight map, telemetry,
 * brief, and a bids panel (designer sees/awards bids; pilot places one — both
 * client-only for now). Owning designers get Edit / Delete.
 */
@Component({
  selector: 'app-mission-detail',
  imports: [CommonModule, RouterLink, MissionMapComponent, ConfirmDialogComponent],
  templateUrl: './mission-detail.component.html',
  styleUrl: './mission-detail.component.css'
})
export class MissionDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly missionService = inject(MissionService);
  private readonly bidService = inject(BidService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly statusLabels = MISSION_STATUS_LABELS;
  readonly statusColors = MISSION_STATUS_COLORS;

  loading = true;
  error = false;
  mission: Mission | null = null;
  bids: Bid[] = [];

  pendingDelete = false;
  bidAmount = '';

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => this.load(Number(params.get('id'))));
  }

  private load(id: number): void {
    this.loading = true;
    this.error = false;
    this.missionService.getById(id).subscribe({
      next: (mission) => {
        this.mission = mission;
        this.bids = this.bidService.list(id);
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }

  // ---- derived ----
  get isOwner(): boolean {
    return this.auth.isDesigner && !!this.mission && this.mission.userId === this.auth.userId;
  }
  get waypoints(): LatLng[] {
    return this.mission?.waypoints ?? [];
  }
  get geofence(): Geofence | null {
    return this.mission?.geofence ?? null;
  }
  get pathText(): string {
    return distanceText(this.waypoints);
  }
  get flightText(): string {
    return durationText(this.waypoints);
  }
  get windowText(): string {
    const fmt = (iso?: string) =>
      iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
    if (!this.mission?.startTime && !this.mission?.endTime) {
      return 'TBD';
    }
    return `${fmt(this.mission?.startTime)} – ${fmt(this.mission?.endTime)}`;
  }
  get deadlineText(): string {
    const d = this.mission?.biddingDeadline;
    return d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No deadline';
  }
  get bidCountText(): string {
    return this.bids.length === 1 ? '1 bid' : `${this.bids.length} bids`;
  }
  get hasAward(): boolean {
    return this.bids.some((b) => b.status === 'accepted');
  }

  get steps(): TimelineStep[] {
    const order = MISSION_LIFECYCLE;
    const cancelled = this.mission?.status === 'CANCELLED';
    const cur = this.mission ? order.indexOf(this.mission.status) : -1;
    return order.map((s, i) => ({
      label: this.statusLabels[s],
      color: this.statusColors[s],
      reached: !cancelled && i <= cur,
      current: !cancelled && i === cur,
      last: i === order.length - 1
    }));
  }

  get backLabel(): string {
    return this.auth.isPilot ? 'Back to feed' : 'My Missions';
  }
  back(): void {
    this.router.navigate([this.auth.isPilot ? '/missions' : '/missions/mine']);
  }

  // ---- pilot bidding (client-only) ----
  private get pilotName(): string {
    return this.auth.profile?.username ?? 'You';
  }
  get myBid(): Bid | undefined {
    return this.mission ? this.bidService.myBid(this.mission.id, this.pilotName) : undefined;
  }
  get canBid(): boolean {
    return this.auth.isPilot && !this.hasAward && ['PUBLISHED', 'BIDDING'].includes(this.mission?.status ?? '');
  }
  placeBid(): void {
    if (!this.mission) {
      return;
    }
    const amount = Math.round(Number(this.bidAmount));
    if (!amount || amount <= 0) {
      this.toast.show('Enter a valid bid amount', '#e04a3f');
      return;
    }
    const updating = !!this.myBid;
    this.bids = this.bidService.place(this.mission.id, this.pilotName, amount);
    this.bidAmount = '';
    this.toast.show(`${updating ? 'Bid updated' : 'Bid placed'} — $${amount}`, '#12a06a');
  }

  // ---- designer award (client-only) ----
  firstName(name: string): string {
    return name.split(' ')[0];
  }
  award(bid: Bid): void {
    if (!this.mission) {
      return;
    }
    this.bids = this.bidService.award(this.mission.id, bid.id);
    this.toast.show(`Awarded to ${bid.pilotName} — other bids declined`, '#7c5cff');
  }

  // ---- delete ----
  askDelete(): void {
    this.pendingDelete = true;
  }
  confirmDelete(): void {
    this.pendingDelete = false;
    const mission = this.mission;
    if (!mission) {
      return;
    }
    this.missionService.delete(mission.id).subscribe({
      next: () => {
        this.toast.show('Mission deleted');
        this.router.navigate(['/missions/mine']);
      },
      error: (err) => {
        console.error('Failed to delete mission', err);
        this.toast.show('Could not delete the mission', '#e04a3f');
      }
    });
  }
}
