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

/** Accent colour per status — lifted from the DroneMissions design system. */
export const MISSION_STATUS_COLORS: Record<MissionStatus, string> = {
  DRAFT: '#64748b',
  PUBLISHED: '#0e9bb5',
  BIDDING: '#d9860a',
  AWARDED: '#7c5cff',
  IN_PROGRESS: '#2f6bff',
  COMPLETED: '#12a06a',
  CANCELLED: '#e04a3f'
};

/** The lifecycle order used by the status timeline (excludes CANCELLED). */
export const MISSION_LIFECYCLE: readonly MissionStatus[] = [
  'DRAFT',
  'PUBLISHED',
  'BIDDING',
  'AWARDED',
  'IN_PROGRESS',
  'COMPLETED'
];

/** A geographic point (WGS84 degrees) — matches the backend `GeoPoint`. */
export interface LatLng {
  lat: number;
  lng: number;
}

/** The mission's flight zone — matches the backend `Geofence` (radius in metres). */
export type Geofence =
  | { type: 'CIRCLE'; center: LatLng; radiusMeters: number }
  | { type: 'POLYGON'; points: LatLng[] };

/**
 * Mirrors the backend `Mission` JPA entity. `Instant` fields are serialized as
 * ISO-8601 strings over JSON; the flight-plan fields are now persisted server-side.
 */
export interface Mission {
  id: number;
  name: string;
  description: string;
  status: MissionStatus;
  /** Id of the user who created (owns) the mission. Set server-side from the
   *  authenticated principal — used client-side to gate edit/delete to the owner. */
  userId: number;
  /** Email of the mission's designer (owner), resolved server-side. */
  designerEmail?: string;
  /** Id of the pilot whose bid was accepted; null until the mission is awarded. */
  awardedPilotId?: number | null;
  startTime?: string;
  endTime?: string;
  // ---- flight plan (persisted on the backend) ----
  location?: string;
  /** ISO date `yyyy-MM-dd`. */
  biddingDeadline?: string;
  waypoints?: LatLng[];
  geofence?: Geofence | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload for creating/updating a mission. The backend assigns `id`, `userId`
 * (from the authenticated principal) and the `@CreationTimestamp` /
 * `@UpdateTimestamp` fields, so they are omitted from the client-supplied data.
 */
export type MissionPayload = Omit<Mission, 'id' | 'userId' | 'designerEmail' | 'createdAt' | 'updatedAt'>;
