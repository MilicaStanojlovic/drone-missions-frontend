/**
 * Auth/account types. Mirrors the backend `/api/v1/auth` DTOs:
 * `UserResponse` (public user view — never includes the password) and the
 * register/login request bodies. Login returns the JWT in the `Authorization`
 * response header and this `UserResponse` in the body.
 */
/**
 * Which side of the marketplace an account is on. Chosen at registration and
 * permanent — mirrors the backend `UserRole` enum. DESIGNER lists and owns
 * missions; PILOT finds work and bids on it.
 */
export type UserRole = 'DESIGNER' | 'PILOT' | 'ADMIN';

/** Chip labels per role — mirrors the design canvas wording. */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  DESIGNER: 'Designer',
  PILOT: 'Pilot',
  ADMIN: 'Admin'
};

/** Accent colour per role — designer blue, pilot green, admin purple. */
export const USER_ROLE_COLORS: Record<UserRole, string> = {
  DESIGNER: '#2f6bff',
  PILOT: '#12a06a',
  ADMIN: '#6d5ef0'
};

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  /** Set by an admin suspension; the when lives in the audit log. */
  suspended: boolean;
  /** `Instant` serialized as an ISO-8601 string. */
  createdAt: string;
}

/**
 * GET /users/{id} — what anyone may see about another account. No email: the
 * backend withholds it from strangers.
 */
export interface PublicUser {
  id: number;
  username: string;
  role: UserRole;
  createdAt: string;
}

/** Body for POST /auth/register. */
export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  role: UserRole;
}

/** Body for POST /auth/login. */
export interface LoginPayload {
  email: string;
  password: string;
}
