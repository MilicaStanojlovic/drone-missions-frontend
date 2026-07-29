import { Component, Input } from '@angular/core';

import { Rating } from '../../models/rating.model';
import { RatingStarsComponent } from '../rating-stars/rating-stars.component';

/** One rating with a caption — used for both directions on the mission page. */
@Component({
  selector: 'app-rating-note',
  imports: [RatingStarsComponent],
  template: `
    <div class="note" [class.note--divided]="bordered">
      <div class="note__label">{{ label }}</div>
      <app-rating-stars [average]="rating.score" [count]="1" [compact]="true" />
      @if (rating.comment) {
        <p class="note__comment">“{{ rating.comment }}”</p>
      }
    </div>
  `,
  styles: [
    `
      .note {
        display: grid;
        gap: 6px;
        justify-items: start;
      }

      .note--divided {
        margin-top: 14px;
        padding-top: 14px;
        border-top: 1px solid #eef2f6;
      }

      .note__label {
        font-size: 12.5px;
        font-weight: 600;
        color: #1b2732;
      }

      .note__comment {
        margin: 2px 0 0;
        font-size: 13px;
        line-height: 1.5;
        color: #3c4a58;
      }
    `
  ]
})
export class RatingNoteComponent {
  @Input({ required: true }) rating!: Rating;
  @Input() label = '';
  /** Rule above, for the second note in a stack. */
  @Input() bordered = false;
}
