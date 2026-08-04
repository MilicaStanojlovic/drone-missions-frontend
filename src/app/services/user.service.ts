import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { NewAdminPayload, UserResponse, UserRole } from '../models/user.model';
import { PagedModel } from '../models/page.model';

/** Optional filters for the admin user listing. `page` is 0-based. */
export interface UserListQuery {
  role?: UserRole | '';
  page?: number;
}

/**
 * User listing against `/api/v1/users`. Profile and auth flows stay in
 * AuthService; this exists for the admin views.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8085/api/v1/users';

  /** One page of accounts, newest first — the backend restricts this to admins. */
  getPage(query: UserListQuery = {}): Observable<PagedModel<UserResponse>> {
    let params = new HttpParams();
    if (query.page && query.page > 0) {
      params = params.set('page', query.page);
    }
    if (query.role) {
      params = params.set('role', query.role);
    }
    return this.http.get<PagedModel<UserResponse>>(this.baseUrl, { params });
  }

  /** Admin: suspend the account — blocks designing, bidding, awards, execution. */
  suspend(id: number): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.baseUrl}/${id}/suspend`, {});
  }

  /** Admin: lift a suspension. */
  reactivate(id: number): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.baseUrl}/${id}/reactivate`, {});
  }

  /** Admin: register another admin account (role is forced server-side). */
  createAdmin(payload: NewAdminPayload): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.baseUrl}/admins`, payload);
  }
}
