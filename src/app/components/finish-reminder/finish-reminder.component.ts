import { Component, OnInit, inject } from '@angular/core';

import { Mission } from '../../models/mission.model';
import { MissionService } from '../../services/mission.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

/**
 * Proactively nags the winning pilot about missions whose end date has passed
 * without being marked finished. Mounted once at app root: when a pilot logs in
 * (or reloads while logged in), it fetches their jobs and pops a confirmation
 * for each overdue one. "Not yet" dismisses it for the session (sessionStorage);
 * it asks again in a fresh session. No polling — a single check per sign-in.
 */
@Component({
  selector: 'app-finish-reminder',
  imports: [ConfirmDialogComponent],
  templateUrl: './finish-reminder.component.html'
})
export class FinishReminderComponent implements OnInit {
  private readonly missionService = inject(MissionService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  private readonly dismissPrefix = 'dm_finish_dismissed_';
  private checkedForUser: number | null = null;

  private queue: Mission[] = [];
  current: Mission | null = null;

  ngOnInit(): void {
    // Fires on login and on reload (loadProfile re-emits); re-check only when the
    // signed-in pilot actually changes so navigation doesn't re-pop the dialog.
    this.auth.profile$.subscribe((profile) => {
      if (profile && this.auth.isPilot && profile.id !== this.checkedForUser) {
        this.checkedForUser = profile.id;
        this.checkJobs();
      }
    });
  }

  get message(): string {
    if (!this.current) {
      return '';
    }
    const ended = this.current.endTime
      ? new Date(this.current.endTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '';
    return `“${this.current.name}” was scheduled to end ${ended}. Did it finish?`;
  }

  private checkJobs(): void {
    this.missionService.getMyJobs().subscribe({
      next: (jobs) => {
        const now = Date.now();
        this.queue = jobs.filter(
          (m) =>
            !!m.endTime &&
            new Date(m.endTime).getTime() < now &&
            m.status !== 'COMPLETED' &&
            m.status !== 'CANCELLED' &&
            !this.isDismissed(m.id)
        );
        this.showNext();
      },
      error: (err) => console.error('Failed to load jobs for finish reminder', err)
    });
  }

  private showNext(): void {
    this.current = this.queue.shift() ?? null;
  }

  confirm(): void {
    const mission = this.current;
    this.current = null;
    if (!mission) {
      return;
    }
    this.missionService.complete(mission.id).subscribe({
      next: () => {
        this.toast.show(`“${mission.name}” marked as completed`, '#12a06a');
        this.showNext();
      },
      error: (err) => {
        console.error('Failed to complete mission', err);
        this.toast.show('Could not mark the mission finished', '#e04a3f');
        this.showNext();
      }
    });
  }

  dismiss(): void {
    if (this.current) {
      this.setDismissed(this.current.id);
    }
    this.showNext();
  }

  private isDismissed(id: number): boolean {
    try {
      return sessionStorage.getItem(this.dismissPrefix + id) === '1';
    } catch {
      return false;
    }
  }

  private setDismissed(id: number): void {
    try {
      sessionStorage.setItem(this.dismissPrefix + id, '1');
    } catch {
      /* best-effort */
    }
  }
}
