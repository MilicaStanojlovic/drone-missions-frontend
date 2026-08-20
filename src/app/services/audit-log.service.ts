import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AuditAction, AuditLogEntry } from '../models/audit.model';
import { PagedModel } from '../models/page.model';
import { UserRole } from '../models/user.model';

/** Optional server-side filters for the audit listing. `page` is 0-based. */
export interface AuditLogQuery {
  page?: number;
  role?: UserRole | '';
  action?: AuditAction | '';
  q?: string;
}

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8085/api/v1/audit-log';

  /** One page of audit entries, newest first (admin-only endpoint). */
  getPage(query: AuditLogQuery = {}): Observable<PagedModel<AuditLogEntry>> {
    let params = new HttpParams();
    if (query.page && query.page > 0) {
      params = params.set('page', query.page);
    }
    if (query.role) {
      params = params.set('role', query.role);
    }
    if (query.action) {
      params = params.set('action', query.action);
    }
    if (query.q?.trim()) {
      params = params.set('q', query.q.trim());
    }
    return this.http.get<PagedModel<AuditLogEntry>>(this.baseUrl, { params });
  }
}
