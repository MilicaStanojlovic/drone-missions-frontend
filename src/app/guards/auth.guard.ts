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
 * The '' route: a logged-in user is sent to their role home (DESIGNER → their
 * missions, PILOT → the open marketplace); a logged-out visitor stays to see
 * the public landing page.
 */
export const landingGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn
    ? router.createUrlTree([auth.isDesigner ? '/missions/mine' : '/missions'])
    : true;
};
