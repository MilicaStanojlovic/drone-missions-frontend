import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/** Requires a logged-in user; otherwise redirects to the login page. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn ? true : router.createUrlTree(['/login']);
};

/**
 * Requires a logged-in DESIGNER (the only role allowed to create/edit/delete
 * missions — mirrors the backend `@PreAuthorize("hasRole('DESIGNER')")`).
 * Pilots are bounced to the marketplace; logged-out users to login.
 */
export const designerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn) {
    return router.createUrlTree(['/login']);
  }
  return auth.isDesigner ? true : router.createUrlTree(['/missions']);
};

/**
 * The role-based landing: DESIGNERs go to their own missions, PILOTs to the
 * open marketplace. Logged-out users go to login. Used on the '' route so
 * every entry point resolves to the right home.
 */
export const homeRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn) {
    return router.createUrlTree(['/login']);
  }
  return router.createUrlTree([auth.isDesigner ? '/missions/mine' : '/missions']);
};
