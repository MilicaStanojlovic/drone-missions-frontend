import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { distinctUntilChanged } from 'rxjs/operators';

import { UserService } from '../../services/user.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import {
  USER_ROLE_COLORS,
  USER_ROLE_LABELS,
  UserResponse,
  UserRole
} from '../../models/user.model';

/** Admin view: every account, paged and role-filterable, with suspend/reactivate. */
@Component({
  selector: 'app-admin-users',
  imports: [CommonModule, RouterLink, ConfirmDialogComponent],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.css'
})
export class AdminUsersComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly roleLabels = USER_ROLE_LABELS;
  readonly roleColors = USER_ROLE_COLORS;
  readonly segments: { value: UserRole | ''; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'DESIGNER', label: 'Designers' },
    { value: 'PILOT', label: 'Pilots' },
    { value: 'ADMIN', label: 'Admins' }
  ];

  loading = true;
  error = false;
  users: UserResponse[] = [];
  /** 0-based, as the backend counts; the URL carries it 1-based. */
  pageIndex = 0;
  totalPages = 0;
  totalElements = 0;

  readonly roleControl = inject(FormBuilder).nonNullable.control<UserRole | ''>('');

  /** The user a suspend confirmation is open for; null when the dialog is closed. */
  pending: UserResponse | null = null;
  /** Id of the row whose action call is in flight, to disable its button. */
  acting: number | null = null;

  ngOnInit(): void {
    // Seed from the URL, validating the role so a mangled deep link means "everyone".
    const qp = this.route.snapshot.queryParamMap;
    const role = qp.get('role');
    const page = Number(qp.get('page'));
    if (role && role in USER_ROLE_LABELS) {
      this.roleControl.setValue(role as UserRole);
    }
    this.pageIndex = Number.isInteger(page) && page > 1 ? page - 1 : 0;

    this.roleControl.valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
      this.pageIndex = 0;
      this.load();
      this.syncUrl();
    });
    this.load();
  }

  setRole(role: UserRole | ''): void {
    this.roleControl.setValue(role);
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

  private load(): void {
    this.loading = true;
    this.error = false;
    this.userService.getPage({ role: this.roleControl.value, page: this.pageIndex }).subscribe({
      next: (page) => {
        this.users = page.content;
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

  /** Filter changes rewrite the query string wholesale, which also drops `page`. */
  private syncUrl(): void {
    const params: Params = {};
    if (this.roleControl.value) {
      params['role'] = this.roleControl.value;
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      replaceUrl: true
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
