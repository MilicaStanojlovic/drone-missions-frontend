import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { UserService } from '../../services/user.service';
import { ToastService } from '../../services/toast.service';

/** Admin view: register another admin account (role is forced server-side). */
@Component({
  selector: 'app-admin-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './admin-register.component.html',
  styleUrl: './admin-register.component.css'
})
export class AdminRegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  private readonly toast = inject(ToastService);

  submitting = false;
  submitError: string | null = null;

  /** Password must be at least 8 characters — mirrors the backend constraint. */
  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.submitError = null;
    this.userService.createAdmin(this.form.getRawValue()).subscribe({
      next: (created) => {
        this.toast.show(`Admin created — ${created.username}`, '#12a06a');
        this.router.navigate(['/admin/users']);
      },
      error: (err) => {
        console.error(err);
        this.submitError =
          err.status === 409
            ? 'That email is already registered.'
            : this.serverMessage(err, 'Could not create the admin account. Please try again.');
        this.submitting = false;
      }
    });
  }

  private serverMessage(err: unknown, fallback: string): string {
    const message = (err as { error?: { message?: string } })?.error?.message;
    return message || fallback;
  }
}
