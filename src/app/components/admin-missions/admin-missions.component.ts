import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { MissionService } from '../../services/mission.service';
import { UserService } from '../../services/user.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import {
  MISSION_STATUS_COLORS,
  MISSION_STATUS_LABELS,
  Mission
} from '../../models/mission.model';

/**
 * Admin view: every mission on the platform, with hide/remove moderation.
 * The backend returns the full set on GET /missions when the caller is an admin.
 */
@Component({
  selector: 'app-admin-missions',
  imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl: './admin-missions.component.html',
  styleUrl: './admin-missions.component.css'
})
export class AdminMissionsComponent implements OnInit {
  private readonly missionService = inject(MissionService);
  private readonly userService = inject(UserService);
  private readonly toast = inject(ToastService);

  readonly statusLabels = MISSION_STATUS_LABELS;
  readonly statusColors = MISSION_STATUS_COLORS;
  readonly search = inject(FormBuilder).nonNullable.control('');

  loading = true;
  error = false;
  missions: Mission[] = [];

  /** Designer ids that are currently suspended, for the row flag. */
  private suspendedDesigners = new Set<number>();

  /** Mission a hide/remove confirmation is open for, and which action it is. */
  pending: { mission: Mission; action: 'hide' | 'remove' } | null = null;
  /** Id of the row whose action call is in flight, to disable its buttons. */
  acting: number | null = null;

  ngOnInit(): void {
    this.missionService.getAll().subscribe({
      next: (missions) => {
        this.missions = missions;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = true;
        this.loading = false;
      }
    });
    // Best-effort: the suspended flag under designer names. The list still renders without it.
    this.userService.getAll().subscribe({
      next: (users) => {
        this.suspendedDesigners = new Set(users.filter((u) => u.suspendedAt).map((u) => u.id));
      },
      error: (err) => console.error(err)
    });
  }

  /** Client-side narrowing by mission name or designer, per the design's search box. */
  get visibleMissions(): Mission[] {
    const term = this.search.value.trim().toLowerCase();
    if (!term) {
      return this.missions;
    }
    return this.missions.filter(
      (m) =>
        m.name.toLowerCase().includes(term) ||
        (m.designerName ?? '').toLowerCase().includes(term)
    );
  }

  designerSuspended(mission: Mission): boolean {
    return mission.userId != null && this.suspendedDesigners.has(mission.userId);
  }

  hideLabel(mission: Mission): string {
    return mission.moderation === 'HIDDEN' ? 'Unhide' : 'Hide';
  }

  removeLabel(mission: Mission): string {
    return mission.moderation === 'REMOVED' ? 'Restore' : 'Remove';
  }

  /** Hide and remove confirm first; unhide and restore fire directly (both reversible). */
  onHideClick(mission: Mission): void {
    if (mission.moderation === 'HIDDEN') {
      this.act(mission, 'unhide');
    } else {
      this.pending = { mission, action: 'hide' };
    }
  }

  onRemoveClick(mission: Mission): void {
    if (mission.moderation === 'REMOVED') {
      this.act(mission, 'restore');
    } else {
      this.pending = { mission, action: 'remove' };
    }
  }

  get pendingTitle(): string {
    return this.pending?.action === 'remove' ? 'Remove this mission?' : 'Hide this mission?';
  }

  /** Consequence text per action, worded as in the design canvas. */
  get pendingBody(): string {
    if (!this.pending) {
      return '';
    }
    const name = this.pending.mission.name;
    return this.pending.action === 'remove'
      ? `“${name}” will be withdrawn from the platform for everyone, including its designer. You can restore it later from this list.`
      : `“${name}” will disappear from the pilot feed and stop receiving new bids. Its designer keeps it and can still see it.`;
  }

  confirmPending(): void {
    const pending = this.pending;
    this.pending = null;
    if (pending) {
      this.act(pending.mission, pending.action);
    }
  }

  private act(mission: Mission, action: 'hide' | 'unhide' | 'remove' | 'restore'): void {
    this.acting = mission.id;
    this.missionService[action](mission.id).subscribe({
      next: (updated) => {
        this.missions = this.missions.map((m) => (m.id === updated.id ? updated : m));
        this.acting = null;
        this.toast.show(`${this.actionLabel(action)} — ${updated.name.slice(0, 34)}`, this.actionColor(action));
      },
      error: (err) => {
        console.error(err);
        this.acting = null;
        this.toast.show(this.serverMessage(err, `Couldn't ${action} this mission`), '#e04a3f');
      }
    });
  }

  private actionLabel(action: string): string {
    return { hide: 'Hidden', unhide: 'Back in the feed', remove: 'Removed', restore: 'Restored' }[action] ?? action;
  }

  private actionColor(action: string): string {
    return action === 'remove' ? '#e04a3f' : action === 'restore' ? '#12a06a' : '#d9860a';
  }

  /** "Novi Sad · Aug 12 – Aug 14", degrading gracefully when fields are unset. */
  meta(mission: Mission): string {
    const parts: string[] = [mission.location?.trim() || 'No location'];
    if (mission.startTime && mission.endTime) {
      parts.push(`${this.day(mission.startTime)} – ${this.day(mission.endTime)}`);
    }
    return parts.join(' · ');
  }

  private day(iso: string): string {
    return formatDate(iso, 'MMM d', 'en-US');
  }

  private serverMessage(err: unknown, fallback: string): string {
    const message = (err as { error?: { message?: string } })?.error?.message;
    return message || fallback;
  }
}
