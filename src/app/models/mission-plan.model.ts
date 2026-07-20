/**
 * The flight-plan half of a mission — waypoints, flight zone and a couple of
 * planning-only fields. The backend doesn't store any of this yet, so it is
 * persisted client-side (see MissionPlanService), keyed by the mission id.
 *
 * All coordinates live in a fixed 1000 x 640 virtual map space (matching the
 * DroneMissions design), independent of the rendered pixel size.
 */

/** A single point on the map, in the 1000 x 640 virtual space. */
export interface Waypoint {
  x: number;
  y: number;
}

/** The permitted flight area. Waypoints must stay inside it. */
export type Geofence =
  | { type: 'circle'; cx: number; cy: number; r: number }
  | { type: 'polygon'; pts: Waypoint[] };

/** Everything about a mission that the backend doesn't (yet) persist. */
export interface MissionPlan {
  location?: string;
  /** ISO date (yyyy-MM-dd). */
  biddingDeadline?: string;
  waypoints: Waypoint[];
  geofence: Geofence;
}

/** The map's virtual dimensions. */
export const MAP_W = 1000;
export const MAP_H = 640;
