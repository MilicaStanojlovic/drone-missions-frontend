import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Bid, BidPayload } from '../models/bid.model';

/**
 * Bids against the backend `/api/v1/bids` API. Cold Observables — subscription
 * (and therefore the HTTP call) is the caller's responsibility.
 */
@Injectable({ providedIn: 'root' })
export class BidService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8085/api/v1/bids';

  /** Place the caller's bid on a mission, or update their pending one. */
  place(missionId: number, payload: BidPayload): Observable<Bid> {
    return this.http.post<Bid>(`${this.baseUrl}/mission/${missionId}`, payload);
  }

  /** The mission owner gets every bid; a pilot gets only their own (0/1). */
  listForMission(missionId: number): Observable<Bid[]> {
    return this.http.get<Bid[]>(`${this.baseUrl}/mission/${missionId}`);
  }

  /** Every bid the calling pilot has placed, newest first. */
  myBids(): Observable<Bid[]> {
    return this.http.get<Bid[]>(`${this.baseUrl}/my`);
  }

  /** Withdraw (delete) the caller's pending bid. */
  withdraw(bidId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${bidId}`);
  }

  /** Accept one bid — rejects the rest and awards the mission to its pilot. */
  accept(bidId: number): Observable<Bid> {
    return this.http.post<Bid>(`${this.baseUrl}/${bidId}/accept`, {});
  }
}
