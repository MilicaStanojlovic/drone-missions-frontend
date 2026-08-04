import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { MissionService } from '../../services/mission.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import {
  MISSION_STATUS_COLORS,
  MISSION_STATUS_LABELS,
  Mission
} from '../../models/mission.model';

/**
 * Admin view: every mission on the platform, with hide/remove moderation.
 * Paged and searched server-side against GET /missions/all.
 */
@Component({
  selector: 'app-admin-missions',
  imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl: './admin-missions.component.html',
  styleUrl: './admin-missions.component.css'
})
export class AdminMissionsComponent implements OnInit {
  private readonly missionService = inject(MissionService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly statusLabels = MISSION_STATUS_LABELS;
  readonly statusColors = MISSION_STATUS_COLORS;
  readonly search = inject(FormBuilder).nonNullable.control('');

  loading = true;
  error = false;
  missions: Mission[] = [];
  /** 0-based, as the backend counts; the URL carries it 1-based. */
  pageIndex = 0;
  totalPages = 0;
  totalElements = 0;

  /** Mission a hide/remove confirmation is open for, and which action it is. */
  pending: { mission: Mission; action: 'hide' | 'remove' } | null = null;
  /** Id of the row whose action call is in flight, to disable its buttons. */
  acting: number | null = null;

  ngOnInit(): void {
    // Seed from the URL so a deep link restores the search and page.
    const qp = this.route.snapshot.queryParamMap;
    const page = Number(qp.get('page'));
    this.search.setValue(qp.get('q') ?? '');
    this.pageIndex = Number.isInteger(page) && page > 1 ? page - 1 : 0;

    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.pageIndex = 0;
        this.load();
        this.syncUrl();
      });
    this.load();
  }

  get lastPageIndex(): number {
    return Math.max(this.totalPages - 1, 0);
  }

  goTo(index: number): void {
    this.pageIndex = index;
    this.load();
    // Page steps are real history entries — Back should walk pages.
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: index === 0 ? null : index + 1 },
      queryParamsHandling: 'merge'
    });
  }

  hideLabel(mission: Mission): string {
    return mission.moderation === 'HIDDEN' ? 'Unhide' : 'Hide';
  }

  /** Hide and remove confirm first; unhide fires directly (reversible). */
  onHideClick(mission: Mission): void {
    if (mission.moderation === 'HIDDEN') {
      this.act(mission, 'unhide');
    } else {
      this.pending = { mission, action: 'hide' };
    }
  }

  onRemoveClick(mission: Mission): void {
    this.pending = { mission, action: 'remove' };
  }

  get pendingTitle(): string {
    return this.pending?.action === 'remove' ? 'Delete this mission?' : 'Hide this mission?';
  }

  /** Consequence text per action, worded as in the design canvas. */
  get pendingBody(): string {
    if (!this.pending) {
      return '';
    }
    const name = this.pending.mission.name;
    return this.pending.action === 'remove'
      ? `“${name}” will be permanently deleted, along with its bids and ratings. This cannot be undone.`
      : `“${name}” will disappear from the pilot feed and stop receiving new bids. Its designer keeps it and can still see it.`;
  }

  confirmPending(): void {
    const pending = this.pending;
    this.pending = null;
    if (!pending) {
      return;
    }
    if (pending.action === 'remove') {
      this.removeMission(pending.mission);
    } else {
      this.act(pending.mission, 'hide');
    }
  }

  private load(): void {
    this.loading = true;
    this.error = false;
    this.missionService.adminList({ q: this.search.value, page: this.pageIndex }).subscribe({
      next: (page) => {
        this.missions = page.content;
        this.pageIndex = page.page.number;
        this.totalPages = page.page.totalPages;
        this.totalElements = page.page.totalElements;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  /** Search changes rewrite the query string wholesale, which also drops `page`. */
  private syncUrl(): void {
    const params: Params = {};
    if (this.search.value.trim()) {
      params['q'] = this.search.value.trim();
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      replaceUrl: true
    });
  }

  /** Permanent delete: 204 comes back, so the row is dropped rather than replaced. */
  private removeMission(mission: Mission): void {
    this.acting = mission.id;
    this.missionService.remove(mission.id).subscribe({
      next: () => {
        this.missions = this.missions.filter((m) => m.id !== mission.id);
        this.totalElements = Math.max(0, this.totalElements - 1);
        this.acting = null;
        this.toast.show(`Deleted — ${mission.name.slice(0, 34)}`, '#e04a3f');
      },
      error: (err) => {
        console.error(err);
        this.acting = null;
        this.toast.show(this.serverMessage(err, `Couldn't delete this mission`), '#e04a3f');
      }
    });
  }

  private act(mission: Mission, action: 'hide' | 'unhide'): void {
    this.acting = mission.id;
    this.missionService[action](mission.id).subscribe({
      next: (updated) => {
        this.missions = this.missions.map((m) => (m.id === updated.id ? updated : m));
        this.acting = null;
        this.toast.show(`${this.actionLabel(action)} — ${updated.name.slice(0, 34)}`, '#d9860a');
      },
      error: (err) => {
        console.error(err);
        this.acting = null;
        this.toast.show(this.serverMessage(err, `Couldn't ${action} this mission`), '#e04a3f');
      }
    });
  }

  private actionLabel(action: string): string {
    return { hide: 'Hidden', unhide: 'Back in the feed' }[action] ?? action;
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
