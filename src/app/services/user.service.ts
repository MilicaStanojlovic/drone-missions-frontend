import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { NewAdminPayload, UserResponse } from '../models/user.model';

/**
 * User listing against `/api/v1/users`. Profile and auth flows stay in
 * AuthService; this exists for the admin views.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8085/api/v1/users';

  /** Every account on the platform — the backend restricts this to admins. */
  getAll(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(this.baseUrl);
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
