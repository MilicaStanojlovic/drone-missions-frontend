import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { UserResponse } from '../models/user.model';

/**
 * User listing against `/api/v1/users`. Profile and auth flows stay in
 * AuthService; this exists for the admin views.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8085/api/v1/users';

  getAll(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(this.baseUrl);
  }

  suspend(id: number): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.baseUrl}/${id}/suspend`, {});
  }

  reactivate(id: number): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.baseUrl}/${id}/reactivate`, {});
  }
}
