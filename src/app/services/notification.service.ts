import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

import { AppNotification } from '../models/notification.model';
import { AuthService } from './auth.service';

/**
 * The pilot's in-app notifications. Holds the list reactively (mirrors
 * `ToastService`/`AuthService.profile$`): refreshed on sign-in and polled while
 * a pilot is logged in. The bell badge derives its count from the list.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = 'http://localhost:8085/api/v1/notifications';
  private readonly pollMs = 45000;

  private readonly subject = new BehaviorSubject<AppNotification[]>([]);
  readonly notifications$ = this.subject.asObservable();
  readonly unreadCount$ = this.notifications$.pipe(map((list) => list.filter((n) => !n.read).length));

  private pollHandle: ReturnType<typeof setInterval> | null = null;
  private loadedForUser: number | null = null;

  constructor() {
    // Load on login/reload (pilot only); clear + stop when logged out or on the designer side.
    this.auth.profile$.subscribe((profile) => {
      if (profile && this.auth.isPilot) {
        if (profile.id !== this.loadedForUser) {
          this.loadedForUser = profile.id;
          this.refresh();
          this.startPolling();
        }
      } else {
        this.loadedForUser = null;
        this.stopPolling();
        this.subject.next([]);
      }
    });
  }

  /** Re-fetch the caller's notifications. */
  refresh(): void {
    if (!this.auth.isPilot) {
      return;
    }
    this.http.get<AppNotification[]>(this.baseUrl).subscribe({
      next: (list) => this.subject.next(list),
      error: (err) => console.error('Failed to load notifications', err)
    });
  }

  markRead(id: number): void {
    this.http.post<void>(`${this.baseUrl}/${id}/read`, {}).subscribe({
      next: () => this.subject.next(this.subject.value.map((n) => (n.id === id ? { ...n, read: true } : n))),
      error: (err) => console.error('Failed to mark notification read', err)
    });
  }

  markAllRead(): void {
    this.http.post<void>(`${this.baseUrl}/read-all`, {}).subscribe({
      next: () => this.subject.next(this.subject.value.map((n) => ({ ...n, read: true }))),
      error: (err) => console.error('Failed to mark all read', err)
    });
  }

  private startPolling(): void {
    if (!this.pollHandle) {
      this.pollHandle = setInterval(() => this.refresh(), this.pollMs);
    }
  }

  private stopPolling(): void {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }
}
