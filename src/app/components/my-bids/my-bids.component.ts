import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Bid, BID_STATUS_COLORS, BID_STATUS_LABELS } from '../../models/bid.model';
import { BidService } from '../../services/bid.service';
import { ToastService } from '../../services/toast.service';

/**
 * The pilot's bid history: every bid they've placed, with its status. Pending
 * bids can be withdrawn from here; each row links to the mission detail.
 */
@Component({
  selector: 'app-my-bids',
  imports: [CommonModule, RouterLink],
  templateUrl: './my-bids.component.html',
  styleUrl: './my-bids.component.css'
})
export class MyBidsComponent implements OnInit {
  private readonly bidService = inject(BidService);
  private readonly toast = inject(ToastService);

  readonly statusLabels = BID_STATUS_LABELS;
  readonly statusColors = BID_STATUS_COLORS;

  loading = true;
  error = false;
  bids: Bid[] = [];
  withdrawing: number | null = null;

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading = true;
    this.error = false;
    this.bidService.myBids().subscribe({
      next: (bids) => {
        this.bids = bids;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load bids', err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  withdraw(bid: Bid): void {
    if (this.withdrawing !== null) {
      return;
    }
    this.withdrawing = bid.id;
    this.bidService.withdraw(bid.id).subscribe({
      next: () => {
        this.withdrawing = null;
        this.toast.show(`Bid on “${bid.missionName}” withdrawn`);
        this.load();
      },
      error: (err) => {
        console.error('Failed to withdraw bid', err);
        this.withdrawing = null;
        this.toast.show('Could not withdraw the bid', '#e04a3f');
      }
    });
  }
}
