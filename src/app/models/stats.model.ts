import { MissionStatus } from './mission.model';
import { UserRole } from './user.model';

/**
 * Platform-wide snapshot counts. Mirrors the backend `/api/v1/platform-stats`
 * DTO: both maps arrive zero-filled with every status/role.
 */
export interface PlatformStats {
  missionsByStatus: Record<MissionStatus, number>;
  activePilots: number;
  bidCount: number;
  bidAmountTotal: number;
  suspendedUsers: number;
  usersByRole: Record<UserRole, number>;
  topMissionsByBids: TopMission[];
}

/** One bar of the bids-per-mission chart — mission name only, never an id. */
export interface TopMission {
  name: string;
  bids: number;
}
