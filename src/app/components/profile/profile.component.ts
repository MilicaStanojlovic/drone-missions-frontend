import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../models/user.model';

/**
 * The signed-in user's profile (both roles). Reads the cached `/me` profile from
 * AuthService; no editing — the backend has no update-profile endpoint yet.
 */
@Component({
  selector: 'app-profile',
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly profile$ = this.auth.profile$;

  ngOnInit(): void {
    this.auth.loadProfile();
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
