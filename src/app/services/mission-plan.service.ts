import { Injectable } from '@angular/core';

import { MissionPlan } from '../models/mission-plan.model';

/**
 * Client-side persistence for a mission's flight plan (location, waypoints, flight
 * zone, bidding deadline) — the backend doesn't store these yet. Kept in
 * localStorage keyed by mission id. When the `feature/mission-planning` backend
 * fields land, only this service needs to change to point at the API.
 */
@Injectable({ providedIn: 'root' })
export class MissionPlanService {
  private readonly prefix = 'dm_plan_';

  get(missionId: number): MissionPlan | null {
    try {
      const raw = localStorage.getItem(this.prefix + missionId);
      return raw ? (JSON.parse(raw) as MissionPlan) : null;
    } catch {
      return null;
    }
  }

  save(missionId: number, plan: MissionPlan): void {
    try {
      localStorage.setItem(this.prefix + missionId, JSON.stringify(plan));
    } catch {
      /* storage full / unavailable — plan is best-effort only */
    }
  }

  remove(missionId: number): void {
    try {
      localStorage.removeItem(this.prefix + missionId);
    } catch {
      /* ignore */
    }
  }
}
