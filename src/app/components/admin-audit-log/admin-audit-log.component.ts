import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { AuditLogService } from '../../services/audit-log.service';
import { AUDIT_ACTION_SENTENCES, AuditLogEntry } from '../../models/audit.model';
import { USER_ROLE_COLORS, USER_ROLE_LABELS } from '../../models/user.model';

/** Admin view: the platform audit log as a newest-first timeline feed. */
@Component({
  selector: 'app-admin-audit-log',
  imports: [CommonModule],
  templateUrl: './admin-audit-log.component.html',
  styleUrl: './admin-audit-log.component.css'
})
export class AdminAuditLogComponent implements OnInit {
  private readonly auditService = inject(AuditLogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly roleColors = USER_ROLE_COLORS;
  readonly roleLabels = USER_ROLE_LABELS;
  readonly sentences = AUDIT_ACTION_SENTENCES;

  loading = true;
  error = false;
  entries: AuditLogEntry[] = [];
  /** 0-based, as the backend counts; the URL carries it 1-based. */
  pageIndex = 0;
  totalPages = 0;
  totalElements = 0;

  ngOnInit(): void {
    const raw = Number(this.route.snapshot.queryParamMap.get('page'));
    this.pageIndex = Number.isInteger(raw) && raw > 1 ? raw - 1 : 0;
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

  /** Day-granularity like the design canvas; hover shows the exact moment. */
  daysAgo(iso: string): string {
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86_400_000);
    if (days <= 0) {
      return 'today';
    }
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }

  private load(): void {
    this.loading = true;
    this.error = false;
    this.auditService.getPage({ page: this.pageIndex }).subscribe({
      next: (page) => {
        this.entries = page.content;
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
}
