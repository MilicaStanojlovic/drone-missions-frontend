import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { LoginPayload, RegisterPayload, UserResponse } from '../models/user.model';

/**
 * Account registration, login and profile against the backend `/api/v1/auth`
 * API. The HTTP methods return cold Observables (subscription is the caller's
 * job); token persistence is handled by the synchronous helpers.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8085/api/v1/auth';
  private readonly tokenKey = 'dm_token';

  register(payload: RegisterPayload): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.baseUrl}/register`, payload);
  }

  /**
   * On success the JWT arrives in the `Authorization` response header and the user
   * profile in the body. This observes the full response, stores the token, and
   * returns the profile.
   */
  login(payload: LoginPayload): Observable<UserResponse> {
    return this.http
      .post<UserResponse>(`${this.baseUrl}/login`, payload, { observe: 'response' })
      .pipe(
        map((response) => {
          const header = response.headers.get('Authorization');
          const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : header;
          if (token) {
            this.storeToken(token);
          }
          return response.body as UserResponse;
        })
      );
  }

  me(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.baseUrl}/me`);
  }

  storeToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  get isLoggedIn(): boolean {
    return this.token !== null;
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
  }
}
