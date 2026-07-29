import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { LoginPayload, PublicUser, RegisterPayload, UserResponse, UserRole } from '../models/user.model';

/**
 * Account registration, login and profile against the backend `/api/v1/auth`
 * API. The HTTP methods return cold Observables (subscription is the caller's
 * job); token persistence is handled by the synchronous helpers.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8085/api/v1/auth';
  /** Profile lives under /users, not /auth (UserController is @RequestMapping("/api/v1/users")). */
  private readonly usersUrl = 'http://localhost:8085/api/v1/users';
  private readonly tokenKey = 'dm_token';

  /** The current user's profile, cached for the topbar. Null when logged out
   *  or not yet loaded; populated by login() and loadProfile(). */
  private readonly profileSubject = new BehaviorSubject<UserResponse | null>(null);
  readonly profile$ = this.profileSubject.asObservable();

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
          const profile = response.body as UserResponse;
          this.profileSubject.next(profile);
          return profile;
        })
      );
  }

  me(): Observable<UserResponse> {
    return this.http
      .get<UserResponse>(`${this.usersUrl}/me`)
      .pipe(tap((profile) => this.profileSubject.next(profile)));
  }

  /** Another account's public view — not cached, and it never carries an email. */
  publicProfile(userId: number): Observable<PublicUser> {
    return this.http.get<PublicUser>(`${this.usersUrl}/${userId}`);
  }

  /** Fetch and cache the profile if logged in and not already loaded (e.g. after
   *  a page reload where only the token survives). Safe to call repeatedly. */
  loadProfile(): void {
    if (this.isLoggedIn && !this.profileSubject.value) {
      this.me().subscribe({ error: () => {} });
    }
  }

  get profile(): UserResponse | null {
    return this.profileSubject.value;
  }

  storeToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /** Logged in = a token that is present and not past its `exp`. */
  get isLoggedIn(): boolean {
    const claims = this.claims();
    if (!claims) {
      return false;
    }
    const exp = claims['exp'];
    return typeof exp !== 'number' || exp * 1000 > Date.now();
  }

  /** Current user's id, read from the token's `sub`. Null when logged out. */
  get userId(): number | null {
    const sub = this.claims()?.['sub'];
    return sub != null ? Number(sub) : null;
  }

  /** Current user's role, read from the token's `role` claim. */
  get role(): UserRole | null {
    const role = this.claims()?.['role'];
    return role === 'DESIGNER' || role === 'PILOT' ? role : null;
  }

  get isDesigner(): boolean {
    return this.role === 'DESIGNER';
  }

  get isPilot(): boolean {
    return this.role === 'PILOT';
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.profileSubject.next(null);
  }

  /**
   * Decodes the JWT payload (base64url) into its claims. The token is minted by
   * the backend with `sub` = user id and a `role` claim; the signature is not
   * verified here (the server does that on every request) — this only reads
   * claims to drive the UI. Returns null for a missing or malformed token.
   */
  private claims(): Record<string, unknown> | null {
    const token = this.token;
    if (!token) {
      return null;
    }
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      return JSON.parse(atob(padded)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
