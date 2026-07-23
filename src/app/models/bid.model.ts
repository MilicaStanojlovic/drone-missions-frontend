/**
 * Bid types. Mirrors the backend `Bid` entity / `BidResponse` DTO — bids are a
 * real backend resource under `/api/v1` (no longer the localStorage demo).
 * `Instant` fields cross the wire as ISO-8601 strings.
 */
export type BidStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

/** Human-friendly labels for status chips. */
export const BID_STATUS_LABELS: Record<BidStatus, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected'
};

/** Accent colour per status — matches the mission palette. */
export const BID_STATUS_COLORS: Record<BidStatus, string> = {
  PENDING: '#d9860a',
  ACCEPTED: '#12a06a',
  REJECTED: '#e04a3f'
};

export interface Bid {
  id: number;
  missionId: number;
  /** Resolved server-side so the UI never shows raw ids. */
  missionName: string;
  pilotId: number;
  pilotName: string;
  amount: number;
  message?: string;
  status: BidStatus;
  createdAt: string;
  updatedAt: string;
}

/** Body for placing/updating a bid. */
export interface BidPayload {
  amount: number;
  message?: string;
}
