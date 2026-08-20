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

/**
 * Admin moderation state, orthogonal to the lifecycle status — mirrors the
 * backend `MissionModeration`. HIDDEN leaves the pilot feed only (reversible);
 * admin removal is a permanent delete, not a state.
 */
export type MissionModeration = 'VISIBLE' | 'HIDDEN';

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

/** What the drone does at a waypoint — matches the backend `WaypointAction` enum. */
export type WaypointAction = 'PHOTO' | 'START_RECORDING' | 'STOP_RECORDING' | 'HOVER';

/** Human-friendly labels for display (waypoint modal, map tooltips). */
export const WAYPOINT_ACTION_LABELS: Record<WaypointAction, string> = {
  PHOTO: 'Take a picture',
  START_RECORDING: 'Start recording',
  STOP_RECORDING: 'Stop recording',
  HOVER: 'Hover'
};

/**
 * Glyph per action, as the inner markup of a 24×24 stroked `<svg>` — the map
 * marker badge supplies the wrapper, size and colour (`currentColor`).
 */
export const WAYPOINT_ACTION_ICONS: Record<WaypointAction, string> = {
  PHOTO: '<path d="M4 8.5h3.2L9 6h6l1.8 2.5H20v10H4z" /><circle cx="12" cy="13" r="3" />',
  START_RECORDING: '<circle cx="12" cy="12" r="5.5" fill="currentColor" stroke="none" />',
  STOP_RECORDING: '<rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none" />',
  HOVER: '<circle cx="12" cy="12" r="7.5" /><path d="M12 7.5V12l3 1.8" />'
};

/**
 * A waypoint of the flight plan — matches the backend `Waypoint`. The extra
 * fields are optional so missions saved before they existed still typecheck;
 * the waypoint modal requires them for every new or edited point.
 */
export interface Waypoint extends LatLng {
  /** Metres above ground; the backend caps it at 120. */
  altitude?: number;
  action?: WaypointAction;
  /** Seconds to hover — only for the HOVER action. */
  hoverDurationSeconds?: number;
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
  /** Admin moderation state; 'VISIBLE' for anything untouched by moderation. */
  moderation: MissionModeration;
  /** Whether the mission's designer is currently suspended (admin views). */
  designerSuspended: boolean;
  /** Id of the user who created (owns) the mission. Set server-side from the
   *  authenticated principal — used client-side to gate edit/delete to the owner. */
  userId: number;
  /** Email of the mission's designer (owner), resolved server-side. */
  designerEmail?: string;
  /** Designer's username, resolved server-side — what feed cards show. */
  designerName?: string;
  /** Designer's average rating; 0 with a count of 0 when nobody has rated them. */
  designerRating?: number;
  designerRatingCount?: number;
  /** Id of the pilot whose bid was accepted; null until the mission is awarded. */
  awardedPilotId?: number | null;
  startTime?: string;
  endTime?: string;
  // ---- flight plan (persisted on the backend) ----
  location?: string;
  /** ISO date `yyyy-MM-dd`. */
  biddingDeadline?: string;
  waypoints?: Waypoint[];
  geofence?: Geofence | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload for creating/updating a mission. The backend assigns `id`, `userId`
 * (from the authenticated principal) and the `@CreationTimestamp` /
 * `@UpdateTimestamp` fields, so they are omitted from the client-supplied data.
 */
export type MissionPayload = Omit<
  Mission,
  | 'id'
  | 'userId'
  | 'designerEmail'
  | 'designerName'
  | 'designerSuspended'
  | 'designerRating'
  | 'designerRatingCount'
  | 'moderation'
  | 'createdAt'
  | 'updatedAt'
>;
