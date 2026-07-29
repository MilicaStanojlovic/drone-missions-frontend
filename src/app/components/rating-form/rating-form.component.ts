import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RatingPayload } from '../../models/rating.model';
import { RatingService } from '../../services/rating.service';
import { ToastService } from '../../services/toast.service';

/**
 * Star picker + optional comment for a completed mission. Emits `rated` on success so the
 * parent can swap it for the submitted rating; a rating cannot be edited afterwards.
 */
@Component({
  selector: 'app-rating-form',
  imports: [FormsModule],
  template: `
    <div class="rate">
      <div class="rate__label">How was {{ counterpartName || 'the other side' }}?</div>

      <div class="rate__stars" role="radiogroup" [attr.aria-label]="'Score out of 5'">
        @for (star of starSlots; track star) {
          <button
            type="button"
            class="rate__star"
            [class.rate__star--on]="star <= (hovered || score)"
            role="radio"
            [attr.aria-checked]="score === star"
            [attr.aria-label]="star + ' out of 5'"
            (mouseenter)="hovered = star"
            (mouseleave)="hovered = 0"
            (click)="score = star"
          >★</button>
        }
      </div>

      <textarea
        class="rate__comment"
        rows="3"
        maxlength="500"
        placeholder="Add a comment (optional)…"
        [(ngModel)]="comment"
      ></textarea>

      <button type="button" class="rate__submit" [disabled]="!score || busy" (click)="submit()">
        {{ busy ? 'Submitting…' : 'Submit rating' }}
      </button>
      <div class="rate__note">Ratings are final and cannot be changed.</div>
    </div>
  `,
  styles: [
    `
      .rate {
        display: grid;
        gap: 10px;
      }

      .rate__label {
        font-size: 13.5px;
        font-weight: 600;
        color: #1b2732;
      }

      .rate__stars {
        display: flex;
        gap: 4px;
      }

      .rate__star {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        font-size: 26px;
        line-height: 1;
        color: #d7dee7;
        transition: color 0.12s ease;
      }

      .rate__star--on {
        color: #f2a93b;
      }

      .rate__comment {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #e6ebf1;
        border-radius: 8px;
        padding: 9px 11px;
        font-family: inherit;
        font-size: 13.5px;
        resize: vertical;
      }

      .rate__submit {
        border: none;
        border-radius: 8px;
        background: #2f6bff;
        color: #fff;
        font-family: inherit;
        font-size: 13.5px;
        font-weight: 600;
        padding: 10px 14px;
        cursor: pointer;
      }

      .rate__submit:disabled {
        background: #c3cedd;
        cursor: not-allowed;
      }

      .rate__note {
        font-size: 11.5px;
        color: #9aa7b4;
      }
    `
  ]
})
export class RatingFormComponent {
  private readonly ratings = inject(RatingService);
  private readonly toast = inject(ToastService);

  @Input({ required: true }) missionId!: number;
  @Input() counterpartName?: string;
  @Output() rated = new EventEmitter<void>();

  readonly starSlots = [1, 2, 3, 4, 5];
  score = 0;
  hovered = 0;
  comment = '';
  busy = false;

  submit(): void {
    if (!this.score || this.busy) {
      return;
    }
    this.busy = true;
    const payload: RatingPayload = { score: this.score };
    if (this.comment.trim()) {
      payload.comment = this.comment.trim();
    }
    this.ratings.rate(this.missionId, payload).subscribe({
      next: () => {
        this.busy = false;
        this.toast.show('Thanks — your rating was saved', '#12a06a');
        this.rated.emit();
      },
      error: (err) => {
        this.busy = false;
        this.toast.show(this.serverMessage(err), '#e04a3f');
      }
    });
  }

  /** Surface the backend's own message (409 "already rated", 403 "not a participant"). */
  private serverMessage(err: unknown): string {
    const body = (err as { error?: { message?: string } })?.error;
    return body?.message ?? 'Could not save your rating';
  }
}
