import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../models/user.model';
import { UserRatings } from '../../models/rating.model';
import { RatingService } from '../../services/rating.service';
import { RatingListComponent } from '../rating-list/rating-list.component';
import { RatingStarsComponent } from '../rating-stars/rating-stars.component';

/**
 * The signed-in user's profile (both roles). Reads the cached `/me` profile from
 * AuthService; no editing — the backend has no update-profile endpoint yet.
 */
@Component({
  selector: 'app-profile',
  imports: [CommonModule, RatingListComponent, RatingStarsComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ratingService = inject(RatingService);

  readonly profile$ = this.auth.profile$;
  ratings: UserRatings | null = null;

  ngOnInit(): void {
    this.auth.loadProfile();
    // The id only arrives with the profile, which may still be in flight after a reload.
    this.profile$.subscribe((profile) => {
      if (profile && this.ratings === null) {
        this.loadRatings(profile.id);
      }
    });
  }

  private loadRatings(userId: number): void {
    this.ratingService.forUser(userId).subscribe({
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

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
