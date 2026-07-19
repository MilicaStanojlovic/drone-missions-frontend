import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  /** Shown after a successful registration redirects here (`?registered=1`). */
  readonly justRegistered = this.route.snapshot.queryParamMap.get('registered') === '1';

  submitting = false;
  submitError: string | null = null;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.submitError = null;

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        // AuthService stores the token from the Authorization header.
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('Login failed', err);
        this.submitError =
          err.status === 401
            ? 'Invalid email or password.'
            : 'Could not sign in. Please try again.';
        this.submitting = false;
      }
    });
  }
}
