/**
 * Rating types. Mirrors the backend `Rating` entity / `RatingResponse` DTO under
 * `/api/v1/ratings`. A rating is written once and never changed.
 */

export interface Rating {
  id: number;
  missionId: number;
  /** Resolved server-side so the UI never shows raw ids. */
  missionName: string;
  raterId: number;
  raterName: string;
  rateeId: number;
  /** 1–5. */
  score: number;
  comment?: string;
  /** `Instant` serialized as an ISO-8601 string. */
  createdAt: string;
}

/** A user's reputation: what every view of it needs. */
export interface RatingSummary {
  average: number;
  count: number;
}

/** GET /ratings/user/{id} — the headline numbers plus what people wrote. */
export interface UserRatings extends RatingSummary {
  ratings: Rating[];
}

/** Body for POST /ratings/mission/{id}. */
export interface RatingPayload {
  score: number;
  comment?: string;
}
