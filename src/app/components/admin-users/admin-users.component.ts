import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UserService } from '../../services/user.service';
import {
  USER_ROLE_COLORS,
  USER_ROLE_LABELS,
  UserResponse
} from '../../models/user.model';

/** Admin view: every account on the platform, with role and join date. */
@Component({
  selector: 'app-admin-users',
  imports: [CommonModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.css'
})
export class AdminUsersComponent implements OnInit {
  private readonly userService = inject(UserService);

  readonly roleLabels = USER_ROLE_LABELS;
  readonly roleColors = USER_ROLE_COLORS;

  loading = true;
  error = false;
  users: UserResponse[] = [];

  ngOnInit(): void {
    this.userService.getAll().subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = true;
        this.loading = false;
      }
    });
  }
}
