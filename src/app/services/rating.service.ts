import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Rating, RatingPayload, UserRatings } from '../models/rating.model';

/**
 * Ratings against the backend `/api/v1/ratings` API. Cold Observables — subscription
 * (and therefore the HTTP call) is the caller's responsibility.
 */
@Injectable({ providedIn: 'root' })
export class RatingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8085/api/v1/ratings';

  /** Rate the other side of a completed mission. 409 if you have already rated it. */
  rate(missionId: number, payload: RatingPayload): Observable<Rating> {
    return this.http.post<Rating>(`${this.baseUrl}/mission/${missionId}`, payload);
  }

  /** Both ratings on a mission — participants only. */
  forMission(missionId: number): Observable<Rating[]> {
    return this.http.get<Rating[]>(`${this.baseUrl}/mission/${missionId}`);
  }

  /** A user's average, count and comments. */
  forUser(userId: number): Observable<UserRatings> {
    return this.http.get<UserRatings>(`${this.baseUrl}/user/${userId}`);
  }
}
