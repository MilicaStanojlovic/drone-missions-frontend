import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { AuditLogService } from '../../services/audit-log.service';
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTION_SENTENCES,
  AuditAction,
  AuditLogEntry
} from '../../models/audit.model';
import { USER_ROLE_COLORS, USER_ROLE_LABELS, UserRole } from '../../models/user.model';

/** Admin view: the platform audit log as a newest-first timeline feed. */
@Component({
  selector: 'app-admin-audit-log',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-audit-log.component.html',
  styleUrl: './admin-audit-log.component.css'
})
export class AdminAuditLogComponent implements OnInit {
  private readonly auditService = inject(AuditLogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly roleColors = USER_ROLE_COLORS;
  readonly roleLabels = USER_ROLE_LABELS;
  readonly sentences = AUDIT_ACTION_SENTENCES;
  readonly actionLabels = AUDIT_ACTION_LABELS;
  readonly actionOptions = Object.keys(AUDIT_ACTION_LABELS) as AuditAction[];
  readonly segments: { value: UserRole | ''; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'DESIGNER', label: 'Designers' },
    { value: 'PILOT', label: 'Pilots' },
    { value: 'ADMIN', label: 'Admins' }
  ];

  loading = true;
  error = false;
  entries: AuditLogEntry[] = [];
  /** 0-based, as the backend counts; the URL carries it 1-based. */
  pageIndex = 0;
  totalPages = 0;
  totalElements = 0;

  readonly filterForm = this.fb.nonNullable.group({
    role: '' as UserRole | '',
    action: '' as AuditAction | '',
    q: ''
  });

  ngOnInit(): void {
    // Seed from the URL before subscribing, validating against the known unions
    // so a mangled deep link filters as "everything" instead of 400ing.
    const qp = this.route.snapshot.queryParamMap;
    const role = qp.get('role');
    const action = qp.get('action');
    const page = Number(qp.get('page'));
    this.filterForm.patchValue({
      role: role && role in USER_ROLE_LABELS ? (role as UserRole) : '',
      action: action && action in AUDIT_ACTION_LABELS ? (action as AuditAction) : '',
      q: qp.get('q') ?? ''
    });
    this.pageIndex = Number.isInteger(page) && page > 1 ? page - 1 : 0;

    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
      )
      .subscribe(() => {
        this.pageIndex = 0;
        this.load();
        this.syncUrl();
      });
    this.load();
  }

  setRole(role: UserRole | ''): void {
    this.filterForm.controls.role.setValue(role);
  }

  get hasActiveFilters(): boolean {
    const { role, action, q } = this.filterForm.getRawValue();
    return !!(role || action || q.trim());
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

  /** Filter changes rewrite the query string wholesale, which also drops `page`. */
  private syncUrl(): void {
    const { role, action, q } = this.filterForm.getRawValue();
    const params: Params = {};
    if (role) {
      params['role'] = role;
    }
    if (action) {
      params['action'] = action;
    }
    if (q.trim()) {
      params['q'] = q.trim();
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      replaceUrl: true
    });
  }

  private load(): void {
    this.loading = true;
    this.error = false;
    const { role, action, q } = this.filterForm.getRawValue();
    this.auditService.getPage({ page: this.pageIndex, role, action, q }).subscribe({
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
