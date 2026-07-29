import { DatePipe, UpperCasePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { PublicUser, UserRole } from '../../models/user.model';
import { UserRatings } from '../../models/rating.model';
import { AuthService } from '../../services/auth.service';
import { RatingService } from '../../services/rating.service';
import { RatingListComponent } from '../rating-list/rating-list.component';
import { RatingStarsComponent } from '../rating-stars/rating-stars.component';

/**
 * Someone else's profile, reached from a feed card or a mission's rating panel. Separate
 * from ProfileComponent, which is built around "my account" — email and a logout button.
 */
@Component({
  selector: 'app-user-profile',
  imports: [DatePipe, UpperCasePipe, RatingListComponent, RatingStarsComponent],
  template: `
    <section class="profile">
      @if (user) {
        <header class="profile__head">
          <div class="profile__eyebrow">{{ roleLabel(user.role) | uppercase }}</div>
          <h1 class="profile__title">{{ user.username }}</h1>
        </header>

        <div class="profile__card">
          <div class="profile__id">
            <div
              class="profile__avatar"
              [style.background]="roleColor(user.role) + '1a'"
              [style.color]="roleColor(user.role)"
            >{{ initial(user.username) }}</div>
            <div>
              <div class="profile__name">{{ user.username }}</div>
              <div class="profile__since">Member since {{ user.createdAt | date: 'longDate' }}</div>
            </div>
            @if (ratings) {
              <div class="profile__score">
                <app-rating-stars [average]="ratings.average" [count]="ratings.count" />
              </div>
            }
          </div>
        </div>

        <div class="profile__card">
          <h2 class="profile__section-title">Ratings</h2>
          @if (ratings) {
            <app-rating-list [ratings]="ratings.ratings" />
          } @else {
            <p class="profile__state">Loading ratings…</p>
          }
        </div>
      } @else if (error) {
        <p class="profile__state">That profile could not be loaded.</p>
      } @else {
        <p class="profile__state">Loading profile…</p>
      }
    </section>
  `,
  styles: [
    `
      .profile {
        max-width: 720px;
        margin: 0 auto;
        padding: 28px 20px 48px;
        font-family: 'Space Grotesk', system-ui, sans-serif;
      }

      .profile__eyebrow {
        font-size: 11px;
        letter-spacing: 1.4px;
        color: #93a1b0;
        font-weight: 600;
      }

      .profile__title {
        margin: 4px 0 20px;
        font-size: 26px;
        color: #1b2732;
      }

      .profile__card {
        background: #fff;
        border: 1px solid #e6ebf1;
        border-radius: 14px;
        padding: 20px;
        margin-bottom: 16px;
      }

      .profile__id {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .profile__avatar {
        width: 46px;
        height: 46px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-size: 19px;
        font-weight: 600;
        flex: none;
      }

      .profile__name {
        font-size: 16px;
        font-weight: 600;
        color: #1b2732;
      }

      .profile__since {
        font-size: 12.5px;
        color: #7d8b9a;
      }

      .profile__score {
        margin-left: auto;
      }

      .profile__section-title {
        margin: 0 0 14px;
        font-size: 15px;
        font-weight: 600;
        color: #1b2732;
      }

      .profile__state {
        color: #7d8b9a;
        font-size: 13.5px;
      }
    `
  ]
})
export class UserProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly ratingService = inject(RatingService);

  user: PublicUser | null = null;
  ratings: UserRatings | null = null;
  error = false;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => this.load(Number(params.get('id'))));
  }

  private load(id: number): void {
    this.user = null;
    this.ratings = null;
    this.error = false;
    this.auth.publicProfile(id).subscribe({
      next: (user) => (this.user = user),
      error: () => (this.error = true)
    });
    this.ratingService.forUser(id).subscribe({
      next: (ratings) => (this.ratings = ratings),
      error: (err) => console.error('Failed to load ratings', err)
    });
  }

  roleLabel(role: UserRole): string {
    return role === 'DESIGNER' ? 'Mission Designer' : 'Pilot';
  }
  roleColor(role: UserRole): string {
    return role === 'PILOT' ? '#12a06a' : '#2f6bff';
  }
  initial(name: string): string {
    return name?.trim()?.[0]?.toUpperCase() ?? '?';
  }
}
