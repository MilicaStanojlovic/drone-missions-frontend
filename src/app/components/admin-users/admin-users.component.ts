import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UserService } from '../../services/user.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import {
  USER_ROLE_COLORS,
  USER_ROLE_LABELS,
  UserResponse
} from '../../models/user.model';

@Component({
  selector: 'app-admin-users',
  imports: [CommonModule, ConfirmDialogComponent],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.css'
})
export class AdminUsersComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly toast = inject(ToastService);

  readonly roleLabels = USER_ROLE_LABELS;
  readonly roleColors = USER_ROLE_COLORS;

  loading = true;
  error = false;
  users: UserResponse[] = [];

  /** Suspend awaiting confirmation; null = dialog closed. */
  pending: UserResponse | null = null;
  /** Row with a call in flight, to disable its button. */
  acting: number | null = null;

  ngOnInit(): void {
    this.userService.getAll().subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  askSuspend(user: UserResponse): void {
    this.pending = user;
  }

  /** Role-specific consequences, worded as in the design canvas. */
  get pendingBody(): string {
    if (!this.pending) {
      return '';
    }
    return this.pending.role === 'PILOT'
      ? 'This pilot will immediately be unable to place bids, be awarded missions, or execute jobs already awarded to them. Existing bids are kept.'
      : 'This designer will immediately be unable to create, edit, or publish missions, and their published missions will stop accepting bids.';
  }

  get pendingConfirmText(): string {
    return this.pending?.role === 'PILOT' ? 'Suspend pilot' : 'Suspend designer';
  }

  confirmSuspend(): void {
    const user = this.pending;
    this.pending = null;
    if (!user) {
      return;
    }
    this.acting = user.id;
    this.userService.suspend(user.id).subscribe({
      next: (updated) => {
        this.replaceRow(updated);
        this.acting = null;
        this.toast.show(`${updated.username} suspended`, '#e04a3f');
      },
      error: (err) => {
        console.error(err);
        this.acting = null;
        this.toast.show(this.serverMessage(err, `Couldn't suspend ${user.username}`), '#e04a3f');
      }
    });
  }

  reactivate(user: UserResponse): void {
    this.acting = user.id;
    this.userService.reactivate(user.id).subscribe({
      next: (updated) => {
        this.replaceRow(updated);
        this.acting = null;
        this.toast.show(`${updated.username} reactivated`, '#12a06a');
      },
      error: (err) => {
        console.error(err);
        this.acting = null;
        this.toast.show(this.serverMessage(err, `Couldn't reactivate ${user.username}`), '#e04a3f');
      }
    });
  }

  private replaceRow(updated: UserResponse): void {
    this.users = this.users.map((u) => (u.id === updated.id ? updated : u));
  }

  private serverMessage(err: unknown, fallback: string): string {
    const message = (err as { error?: { message?: string } })?.error?.message;
    return message || fallback;
  }
}
