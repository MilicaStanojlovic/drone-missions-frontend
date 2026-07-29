import { DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';

import { Rating } from '../../models/rating.model';
import { RatingStarsComponent } from '../rating-stars/rating-stars.component';

/** The comments behind an average. Shared by the own-profile and public-profile pages. */
@Component({
  selector: 'app-rating-list',
  imports: [DatePipe, RatingStarsComponent],
  template: `
    @if (ratings.length) {
      <ul class="reviews">
        @for (r of ratings; track r.id) {
          <li class="review">
            <div class="review__head">
              <span class="review__who">{{ r.raterName }}</span>
              <app-rating-stars [average]="r.score" [count]="1" [compact]="true" />
            </div>
            <div class="review__mission">on {{ r.missionName }}</div>
            @if (r.comment) {
              <p class="review__body">{{ r.comment }}</p>
            }
            <div class="review__date">{{ r.createdAt | date: 'mediumDate' }}</div>
          </li>
        }
      </ul>
    } @else {
      <p class="reviews__empty">No ratings yet.</p>
    }
  `,
  styles: [
    `
      .reviews {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 12px;
      }

      .review {
        border: 1px solid #e6ebf1;
        border-radius: 10px;
        padding: 12px 14px;
        background: #fff;
      }

      .review__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .review__who {
        font-weight: 600;
        font-size: 13.5px;
        color: #1b2732;
      }

      .review__mission {
        font-size: 12px;
        color: #7d8b9a;
        margin-top: 2px;
      }

      .review__body {
        margin: 8px 0 0;
        font-size: 13.5px;
        line-height: 1.5;
        color: #3c4a58;
      }

      .review__date {
        margin-top: 8px;
        font-size: 11.5px;
        color: #9aa7b4;
      }

      .reviews__empty {
        color: #7d8b9a;
        font-size: 13.5px;
        margin: 0;
      }
    `
  ]
})
export class RatingListComponent {
  @Input() ratings: Rating[] = [];
}
