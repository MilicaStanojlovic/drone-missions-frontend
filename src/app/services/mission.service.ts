import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Mission, MissionPayload } from '../models/mission.model';

@Injectable({ providedIn: 'root' })
export class MissionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8085/api/v1/missions';

  getAll(): Observable<Mission[]> {
    return this.http.get<Mission[]>(this.baseUrl);
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
