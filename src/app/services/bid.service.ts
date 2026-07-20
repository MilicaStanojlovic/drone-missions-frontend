import { Injectable } from '@angular/core';

/**
 * A single pilot's bid on a mission. Client-only demo data — the backend has no
 * bids yet, so these live in localStorage keyed by mission id. Swap this for a
 * real API when bidding is added server-side.
 */
export interface Bid {
  id: string;
  pilotName: string;
  amount: number;
  createdAt: number;
  status: 'pending' | 'accepted' | 'declined';
}

@Injectable({ providedIn: 'root' })
export class BidService {
  private readonly prefix = 'dm_bids_';

  list(missionId: number): Bid[] {
    try {
      const raw = localStorage.getItem(this.prefix + missionId);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as Bid[]) : [];
    } catch {
      return [];
    }
  }

  myBid(missionId: number, pilotName: string): Bid | undefined {
    return this.list(missionId).find((b) => b.pilotName === pilotName);
  }

  /** Place or update the caller's bid; returns the full bid list. */
  place(missionId: number, pilotName: string, amount: number): Bid[] {
    const bids = this.list(missionId);
    const mine = bids.find((b) => b.pilotName === pilotName);
    if (mine) {
      mine.amount = amount;
      mine.createdAt = Date.now();
      mine.status = 'pending';
    } else {
      bids.unshift({ id: this.genId(), pilotName, amount, createdAt: Date.now(), status: 'pending' });
    }
    this.write(missionId, bids);
    return bids;
  }

  /** Accept one bid; decline the rest. Returns the updated list. */
  award(missionId: number, bidId: string): Bid[] {
    const bids = this.list(missionId).map((b) => ({
      ...b,
      status: (b.id === bidId ? 'accepted' : 'declined') as Bid['status']
    }));
    this.write(missionId, bids);
    return bids;
  }

  private write(missionId: number, bids: Bid[]): void {
    try {
      localStorage.setItem(this.prefix + missionId, JSON.stringify(bids));
    } catch {
      /* best-effort */
    }
  }

  private genId(): string {
    return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
}
