import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';

/**
 * Attaches the stored JWT as an `Authorization: Bearer` header to backend API
 * calls, and on a 401 (expired/invalid token) logs out and sends the user to
 * login. The auth endpoints themselves are skipped for the 401 handling so a
 * bad-credentials login still surfaces its own error instead of redirecting.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isApiCall = req.url.startsWith('http://localhost:8085');
  const isAuthEndpoint = req.url.includes('/api/v1/auth/');
  const token = auth.token;

  const request =
    isApiCall && token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthEndpoint) {
        auth.logout();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
