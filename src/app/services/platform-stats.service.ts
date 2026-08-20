import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { PlatformStats } from '../models/stats.model';

@Injectable({ providedIn: 'root' })
export class PlatformStatsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8085/api/v1/platform-stats';

  /** One snapshot of the platform counts (admin-only endpoint). */
  getOverview(): Observable<PlatformStats> {
    return this.http.get<PlatformStats>(this.baseUrl);
  }
}
