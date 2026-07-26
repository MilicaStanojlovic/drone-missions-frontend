import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';

import {
  Geofence,
  LatLng,
  Mission,
  MISSION_LIFECYCLE,
  MISSION_STATUS_COLORS,
  MISSION_STATUS_LABELS
} from '../../models/mission.model';
import { MissionService } from '../../services/mission.service';
import { BidService } from '../../services/bid.service';
import { Bid } from '../../models/bid.model';
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
 * brief, and a bids panel backed by the bids API (designer sees and accepts
 * bids; pilot places/updates/withdraws their own). Owning designers get
 * Edit / Delete.
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

  /** Where the user came from, so "Back" returns there (e.g. 'my-bids'). */
  from = '';
  /** Feed filters carried in via the query string, replayed on Back to the feed. */
  feedParams: Params = {};

  pendingDelete = false;
  pendingComplete = false;
  pendingStart = false;
  pendingCancel = false;
  bidAmount = '';
  bidMessage = '';
  bidBusy = false;
  /** The bid awaiting the designer's Accept confirmation, if any. */
  pendingAccept: Bid | null = null;

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    this.from = qp.get('from') ?? '';
    for (const key of ['keyword', 'location', 'date']) {
      const value = qp.get(key);
      if (value) {
        this.feedParams[key] = value;
      }
    }
    this.route.paramMap.subscribe((params) => this.load(Number(params.get('id'))));
  }

  private load(id: number): void {
    this.loading = true;
    this.error = false;
    this.missionService.getById(id).subscribe({
      next: (mission) => {
        this.mission = mission;
        this.loading = false;
        this.loadBids(id);
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }

  private loadBids(id: number): void {
    this.bidService.listForMission(id).subscribe({
      next: (bids) => (this.bids = bids),
      error: (err) => console.error('Failed to load bids', err)
    });
  }

  /** Re-fetch mission + bids in place (no full-page loading flash) after a bid action. */
  private refresh(): void {
    const id = this.mission?.id;
    if (id == null) {
      return;
    }
    this.missionService.getById(id).subscribe({
      next: (mission) => (this.mission = mission),
      error: (err) => console.error('Failed to refresh mission', err)
    });
    this.loadBids(id);
  }

  /** Pull a message out of the backend's `{ data, status, message }` error body. */
  private serverMessage(err: unknown, fallback: string): string {
    const body = (err as { error?: { message?: unknown } } | null)?.error;
    return body && typeof body.message === 'string' && body.message.length > 0
      ? body.message
      : fallback;
  }

  // ---- derived ----
  get isOwner(): boolean {
    return this.auth.isDesigner && !!this.mission && this.mission.userId === this.auth.userId;
  }
  /** The calling pilot won this mission. */
  get isWinner(): boolean {
    return this.auth.isPilot && !!this.mission && this.mission.awardedPilotId === this.auth.userId;
  }
  /** The awarded pilot can start their mission while it's still AWARDED. */
  get canStart(): boolean {
    return this.isWinner && this.mission?.status === 'AWARDED';
  }
  /** The owning designer can cancel any mission that isn't finished yet. */
  get canCancel(): boolean {
    return this.isOwner && !['COMPLETED', 'CANCELLED'].includes(this.mission?.status ?? '');
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
    return this.mission?.awardedPilotId != null || this.bids.some((b) => b.status === 'ACCEPTED');
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
    if (this.from === 'my-bids') {
      return 'Back to my bids';
    }
    return this.auth.isPilot ? 'Back to feed' : 'My Missions';
  }
  back(): void {
    if (this.from === 'my-bids') {
      this.router.navigate(['/my-bids']);
      return;
    }
    if (this.auth.isPilot) {
      // Replay the feed filters so the marketplace comes back the way it was left.
      this.router.navigate(['/missions'], { queryParams: this.feedParams });
      return;
    }
    this.router.navigate(['/missions/mine']);
  }

  // ---- pilot bidding ----
  /** The caller's own bid — for pilots the API returns only theirs (0/1 items). */
  get myBid(): Bid | undefined {
    return this.auth.isPilot ? this.bids[0] : undefined;
  }
  /** The bidding deadline (inclusive of its whole day) has gone by. */
  get deadlinePassed(): boolean {
    const d = this.mission?.biddingDeadline;
    return !!d && new Date() > new Date(d + 'T23:59:59');
  }
  get canBid(): boolean {
    return (
      this.auth.isPilot &&
      ['PUBLISHED', 'BIDDING'].includes(this.mission?.status ?? '') &&
      !this.deadlinePassed
    );
  }
  placeBid(): void {
    if (!this.mission || this.bidBusy) {
      return;
    }
    const existing = this.myBid;
    // Updating an existing bid: a blank amount field means "keep the current price",
    // so you can change just the message without re-typing the amount.
    const typed = this.bidAmount.trim();
    const amount = typed ? Math.round(Number(typed)) : (existing?.amount ?? 0);
    if (!amount || amount <= 0) {
      this.toast.show('Enter a valid bid amount', '#e04a3f');
      return;
    }
    const updating = !!existing;
    // Same "blank = keep" rule for the message: an empty box on an update keeps the
    // existing message instead of clearing it, so changing only the amount leaves it intact.
    const typedMessage = this.bidMessage.trim();
    const message = typedMessage || (updating ? existing?.message : undefined);
    this.bidBusy = true;
    this.bidService.place(this.mission.id, { amount, message: message || undefined }).subscribe({
      next: () => {
        this.bidBusy = false;
        this.bidAmount = '';
        this.bidMessage = '';
        this.toast.show(`${updating ? 'Bid updated' : 'Bid placed'} — $${amount}`, '#12a06a');
        this.refresh();
      },
      error: (err) => {
        console.error('Failed to place bid', err);
        this.bidBusy = false;
        this.toast.show(this.serverMessage(err, 'Could not place the bid'), '#e04a3f');
      }
    });
  }
  withdrawBid(): void {
    const bid = this.myBid;
    if (!bid || this.bidBusy) {
      return;
    }
    this.bidBusy = true;
    this.bidService.withdraw(bid.id).subscribe({
      next: () => {
        this.bidBusy = false;
        this.toast.show('Bid withdrawn');
        this.refresh();
      },
      error: (err) => {
        console.error('Failed to withdraw bid', err);
        this.bidBusy = false;
        this.toast.show(this.serverMessage(err, 'Could not withdraw the bid'), '#e04a3f');
      }
    });
  }

  // ---- designer award ----
  firstName(name: string): string {
    return name.split(' ')[0];
  }
  askAccept(bid: Bid): void {
    this.pendingAccept = bid;
  }
  confirmAccept(): void {
    const bid = this.pendingAccept;
    this.pendingAccept = null;
    if (!bid) {
      return;
    }
    this.bidService.accept(bid.id).subscribe({
      next: () => {
        this.toast.show(`Awarded to ${bid.pilotName} — other bids rejected`, '#7c5cff');
        this.refresh();
      },
      error: (err) => {
        console.error('Failed to accept bid', err);
        this.toast.show(this.serverMessage(err, 'Could not accept the bid'), '#e04a3f');
        this.refresh();
      }
    });
  }

  // ---- start (winning pilot) ----
  askStart(): void {
    this.pendingStart = true;
  }
  confirmStart(): void {
    this.pendingStart = false;
    const mission = this.mission;
    if (!mission) {
      return;
    }
    this.missionService.start(mission.id).subscribe({
      next: () => {
        this.toast.show('Mission started', '#2f6bff');
        this.refresh();
      },
      error: (err) => {
        console.error('Failed to start mission', err);
        this.toast.show(this.serverMessage(err, 'Could not start the mission'), '#e04a3f');
        this.refresh();
      }
    });
  }

  // ---- completion (winning pilot) ----
  askComplete(): void {
    this.pendingComplete = true;
  }
  confirmComplete(): void {
    this.pendingComplete = false;
    const mission = this.mission;
    if (!mission) {
      return;
    }
    this.missionService.complete(mission.id).subscribe({
      next: () => {
        this.toast.show('Mission marked as completed', '#12a06a');
        this.refresh();
      },
      error: (err) => {
        console.error('Failed to complete mission', err);
        this.toast.show(this.serverMessage(err, 'Could not complete the mission'), '#e04a3f');
        this.refresh();
      }
    });
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

  // ---- cancel (owning designer) ----
  askCancel(): void {
    this.pendingCancel = true;
  }
  confirmCancel(): void {
    this.pendingCancel = false;
    const mission = this.mission;
    if (!mission) {
      return;
    }
    this.missionService.cancel(mission.id).subscribe({
      next: () => {
        this.toast.show('Mission cancelled', '#e04a3f');
        this.refresh();
      },
      error: (err) => {
        console.error('Failed to cancel mission', err);
        this.toast.show(this.serverMessage(err, 'Could not cancel the mission'), '#e04a3f');
        this.refresh();
      }
    });
  }
}
