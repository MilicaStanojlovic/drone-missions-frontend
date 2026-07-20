import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../models/user.model';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  submitting = false;
  submitError: string | null = null;

  /** Password must be at least 8 characters — mirrors the backend constraint. */
  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    // Which side of the marketplace this account is on. Required and permanent —
    // the backend rejects a register without it (@NotNull UserRole role).
    role: ['' as UserRole | '', [Validators.required]]
  });

  constructor() {
    // The landing page links here with ?role=DESIGNER|PILOT to prefill the choice.
    const role = this.route.snapshot.queryParamMap.get('role');
    if (role === 'DESIGNER' || role === 'PILOT') {
      this.form.controls.role.setValue(role);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.submitError = null;

    // `role` is `UserRole | ''` on the form; the invalid guard above proves it is
    // set, so narrow it for the RegisterPayload.
    const { role, ...rest } = this.form.getRawValue();
    this.auth.register({ ...rest, role: role as UserRole }).subscribe({
      next: () => this.router.navigate(['/login'], { queryParams: { registered: 1 } }),
      error: (err) => {
        console.error('Registration failed', err);
        this.submitError =
          err.status === 409
            ? 'That email is already registered.'
            : 'Could not create your account. Please try again.';
        this.submitting = false;
      }
    });
  }
}
