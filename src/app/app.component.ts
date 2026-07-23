import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from './services/auth.service';
import { ToastComponent } from './components/toast/toast.component';
import { NotificationBellComponent } from './components/notification-bell/notification-bell.component';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastComponent, NotificationBellComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    // Repopulate the profile after a reload (only the token survives in storage).
    this.auth.loadProfile();
  }

  /** Human label for the role chip. */
  get roleLabel(): string {
    return this.auth.isDesigner ? 'Mission Designer' : this.auth.isPilot ? 'Pilot' : '';
  }

  /** Accent colour for the role chip dot (blue designer, green pilot). */
  get roleColor(): string {
    return this.auth.isPilot ? '#12a06a' : '#2f6bff';
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
