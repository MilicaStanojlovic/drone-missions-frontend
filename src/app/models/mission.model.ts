export type MissionStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'BIDDING'
  | 'AWARDED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

/** All statuses, in lifecycle order. Must match the backend `MissionStatus`
 *  enum exactly (Jackson rejects unknown values with a 400). */
export const MISSION_STATUSES: readonly MissionStatus[] = [
  'DRAFT',
  'PUBLISHED',
  'BIDDING',
  'AWARDED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
];

/** Human-friendly labels for display (badges, detail view). */
export const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  BIDDING: 'Bidding',
  AWARDED: 'Awarded',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
};

/**
 * Mirrors the backend `Mission` JPA entity. `Instant` fields are serialized as
 * ISO-8601 strings over JSON.
 */
export interface Mission {
  id: number;
  name: string;
  description: string;
  status: MissionStatus;
  startTime?: string;
  endTime?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload for creating/updating a mission. The backend assigns `id` and the
 * `@CreationTimestamp` / `@UpdateTimestamp` fields, so they are omitted from
 * the client-supplied data.
 */
export type MissionPayload = Omit<Mission, 'id' | 'createdAt' | 'updatedAt'>;
