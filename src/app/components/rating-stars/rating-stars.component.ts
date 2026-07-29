import { DecimalPipe } from '@angular/common';
import { Component, Input } from '@angular/core';

/** Read-only star average. Used on feed cards, profiles and the mission page. */
@Component({
  selector: 'app-rating-stars',
  imports: [DecimalPipe],
  template: `
    @if (count > 0) {
      <span class="stars" [attr.aria-label]="ariaLabel">
        <span class="stars__glyphs" aria-hidden="true">
          @for (star of starSlots; track $index) {
            <span class="stars__star" [class.stars__star--on]="star <= rounded">★</span>
          }
        </span>
        @if (!compact) {
          <span class="stars__value">{{ average | number: '1.1-1' }}</span>
          <span class="stars__count">({{ count }})</span>
        }
      </span>
    } @else if (showEmpty) {
      <span class="stars stars--empty">No ratings yet</span>
    }
  `,
  styles: [
    `
      .stars {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-family: 'Space Grotesk', system-ui, sans-serif;
        font-size: 12.5px;
        white-space: nowrap;
      }

      .stars__glyphs {
        letter-spacing: 0.5px;
        color: #d7dee7;
      }

      .stars__star--on {
        color: #f2a93b;
      }

      .stars__value {
        font-weight: 600;
        color: #1b2732;
      }

      .stars__count {
        color: #7d8b9a;
      }

      .stars--empty {
        color: #9aa7b4;
        font-size: 12px;
      }
    `
  ]
})
export class RatingStarsComponent {
  @Input() average = 0;
  @Input() count = 0;
  /** When false an unrated user renders nothing at all, which suits dense card layouts. */
  @Input() showEmpty = true;
  /** Glyphs only — for one review's own score, where "4.0 (1)" would be noise. */
  @Input() compact = false;

  readonly starSlots = [1, 2, 3, 4, 5];

  get rounded(): number {
    return Math.round(this.average);
  }

  get ariaLabel(): string {
    return `${this.average.toFixed(1)} out of 5, ${this.count} rating${this.count === 1 ? '' : 's'}`;
  }
}
