import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { AppNotification, NOTIFICATION_COLORS } from '../../models/notification.model';
import { NotificationService } from '../../services/notification.service';

/**
 * The notifications bell in the top nav: an unread-count badge and a dropdown of
 * the pilot's notifications (bid accepted/rejected, mission overdue). Clicking a
 * row marks it read and opens the related mission. Replaces the old finish popup.
 */
@Component({
  selector: 'app-notification-bell',
  imports: [CommonModule],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.css'
})
export class NotificationBellComponent {
  private readonly service = inject(NotificationService);
  private readonly router = inject(Router);

  readonly colors = NOTIFICATION_COLORS;
  readonly notifications$ = this.service.notifications$;
  readonly unreadCount$ = this.service.unreadCount$;

  open = false;

  toggle(): void {
    this.open = !this.open;
  }
  close(): void {
    this.open = false;
  }

  onSelect(n: AppNotification): void {
    if (!n.read) {
      this.service.markRead(n.id);
    }
    this.close();
    // A rejected pilot can no longer see the (now awarded) mission — send them to the feed.
    const target = n.missionId && n.type !== 'BID_REJECTED' ? ['/missions', n.missionId] : ['/missions'];
    this.router.navigate(target);
  }

  markAll(): void {
    this.service.markAllRead();
  }

  /** "3h ago" style relative time. */
  timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }
}
