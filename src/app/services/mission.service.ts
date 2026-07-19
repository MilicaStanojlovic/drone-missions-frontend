import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Mission, MissionPayload } from '../models/mission.model';

@Injectable({ providedIn: 'root' })
export class MissionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8085/api/v1/missions';

  /** The open marketplace — every mission the backend exposes to all users
   *  (PUBLISHED / BIDDING). */
  getAll(): Observable<Mission[]> {
    return this.http.get<Mission[]>(this.baseUrl);
  }

  /** Only the missions created by the current user. */
  getMine(): Observable<Mission[]> {
    return this.http.get<Mission[]>(`${this.baseUrl}/my-missions`);
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
