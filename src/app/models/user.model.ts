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
export type UserRole = 'DESIGNER' | 'PILOT';

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  role: UserRole;
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
