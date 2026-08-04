import { UserRole } from './user.model';

/**
 * Audit types. Mirrors the backend `/api/v1/audit-log` DTO: one immutable
 * entry per state-changing user action — who, did what, to what, when.
 */
export type AuditAction =
  | 'MISSION_CREATED'
  | 'MISSION_UPDATED'
  | 'MISSION_DELETED'
  | 'MISSION_STARTED'
  | 'MISSION_COMPLETED'
  | 'MISSION_CANCELLED'
  | 'MISSION_HIDDEN'
  | 'MISSION_UNHIDDEN'
  | 'MISSION_REMOVED'
  | 'MISSION_RESTORED'
  | 'BID_PLACED'
  | 'BID_WITHDRAWN'
  | 'BID_ACCEPTED'
  | 'USER_REGISTERED'
  | 'USER_LOGGED_IN'
  | 'USER_SUSPENDED'
  | 'USER_REACTIVATED'
  | 'RATING_CREATED';

export type AuditTargetType = 'MISSION' | 'BID' | 'USER' | 'RATING';

export interface AuditLogEntry {
  id: number;
  actorId: number;
  actorUsername: string;
  actorRole: UserRole;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: number;
  /** Human-readable snapshot (mission name, bid amount…); null when there is none. */
  details: string | null;
  /** `Instant` serialized as an ISO-8601 string. */
  createdAt: string;
}

/** Feed row verb phrase — `details` carries the noun after it. */
export const AUDIT_ACTION_SENTENCES: Record<AuditAction, string> = {
  MISSION_CREATED: 'created a mission',
  MISSION_UPDATED: 'updated a mission',
  MISSION_DELETED: 'deleted a mission',
  MISSION_STARTED: 'started a mission',
  MISSION_COMPLETED: 'completed a mission',
  MISSION_CANCELLED: 'cancelled a mission',
  MISSION_HIDDEN: 'hid a mission',
  MISSION_UNHIDDEN: 'unhid a mission',
  MISSION_REMOVED: 'removed a mission',
  MISSION_RESTORED: 'restored a mission',
  BID_PLACED: 'placed a bid',
  BID_WITHDRAWN: 'withdrew a bid',
  BID_ACCEPTED: 'accepted a bid',
  USER_REGISTERED: 'registered an account',
  USER_LOGGED_IN: 'logged in',
  USER_SUSPENDED: 'suspended a user',
  USER_REACTIVATED: 'reactivated a user',
  RATING_CREATED: 'left a rating'
};

/** Title-case labels for the action filter select. */
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  MISSION_CREATED: 'Mission created',
  MISSION_UPDATED: 'Mission updated',
  MISSION_DELETED: 'Mission deleted',
  MISSION_STARTED: 'Mission started',
  MISSION_COMPLETED: 'Mission completed',
  MISSION_CANCELLED: 'Mission cancelled',
  MISSION_HIDDEN: 'Mission hidden',
  MISSION_UNHIDDEN: 'Mission unhidden',
  MISSION_REMOVED: 'Mission removed',
  MISSION_RESTORED: 'Mission restored',
  BID_PLACED: 'Bid placed',
  BID_WITHDRAWN: 'Bid withdrawn',
  BID_ACCEPTED: 'Bid accepted',
  USER_REGISTERED: 'User registered',
  USER_LOGGED_IN: 'User logged in',
  USER_SUSPENDED: 'User suspended',
  USER_REACTIVATED: 'User reactivated',
  RATING_CREATED: 'Rating created'
};
