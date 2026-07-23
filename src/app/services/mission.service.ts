import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Mission, MissionPayload } from '../models/mission.model';

/** Optional server-side filters for the open feed. `date` is a `yyyy-MM-dd` string. */
export interface FeedFilters {
  location?: string;
  keyword?: string;
  date?: string;
}

@Injectable({ providedIn: 'root' })
export class MissionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8085/api/v1/missions';

  /** The open marketplace — every mission the backend exposes to all users
   *  (PUBLISHED / BIDDING), optionally narrowed by location / keyword / date. */
  getAll(filters: FeedFilters = {}): Observable<Mission[]> {
    let params = new HttpParams();
    if (filters.location?.trim()) {
      params = params.set('location', filters.location.trim());
    }
    if (filters.keyword?.trim()) {
      params = params.set('keyword', filters.keyword.trim());
    }
    if (filters.date) {
      params = params.set('date', filters.date);
    }
    return this.http.get<Mission[]>(this.baseUrl, { params });
  }

  /** Only the missions created by the current user. */
  getMine(): Observable<Mission[]> {
    return this.http.get<Mission[]>(`${this.baseUrl}/my-missions`);
  }

  /** The missions awarded to the current pilot ("my jobs"). */
  getMyJobs(): Observable<Mission[]> {
    return this.http.get<Mission[]>(`${this.baseUrl}/my-jobs`);
  }

  /** The awarded pilot marks a mission finished (IN_PROGRESS → COMPLETED). */
  complete(id: number): Observable<Mission> {
    return this.http.post<Mission>(`${this.baseUrl}/${id}/complete`, {});
  }

  getById(id: number): Observable<Mission> {
    return this.http.get<Mission>(`${this.baseUrl}/${id}`);
  }

  create(mission: MissionPayload): Observable<Mission> {
    return this.http.post<Mission>(this.baseUrl, mission);
  }

  update(id: number, mission: MissionPayload): Observable<Mission> {
    return this.http.put<Mission>(`${this.baseUrl}/${id}`, mission);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
