import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Mission, MissionPayload, MissionStatus } from '../../models/mission.model';
import { MissionService } from '../../services/mission.service';

/** Fails if the value is only whitespace (so " " doesn't satisfy `required`). */
const notBlank: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  return typeof value === 'string' && value.length > 0 && value.trim().length === 0
    ? { blank: true }
    : null;
};

/** Group validator: end time, when set, must not be before the start time. */
const endAfterStart: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const start = group.get('startTime')?.value;
  const end = group.get('endTime')?.value;
  if (!start || !end) {
    return null;
  }
  return new Date(end).getTime() < new Date(start).getTime() ? { endBeforeStart: true } : null;
};

@Component({
  selector: 'app-mission-form',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './mission-form.component.html',
  styleUrl: './mission-form.component.css'
})
export class MissionFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly missionService = inject(MissionService);

  /** Present in edit mode, null in create mode. */
  missionId: number | null = null;
  /** In edit mode, the mission's existing status — carried through unchanged. */
  private currentStatus: MissionStatus | null = null;

  submitting = false;
  loadError = false;
  saveError: string | null = null;

  /** Field limits — mirror the backend columns (name varchar(255), description varchar(2000)). */
  readonly maxName = 200;
  readonly maxDescription = 2000;

  readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, notBlank, Validators.maxLength(this.maxName)]],
      description: ['', [Validators.required, notBlank, Validators.maxLength(this.maxDescription)]],
      startTime: [''],
      endTime: ['']
    },
    { validators: endAfterStart }
  );

  get isEdit(): boolean {
    return this.missionId !== null;
  }

  get nameLength(): number {
    return this.form.controls.name.value.length;
  }

  get descriptionLength(): number {
    return this.form.controls.description.value.length;
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam !== null) {
      this.missionId = Number(idParam);
      this.loadMission(this.missionId);
    }
  }

  private loadMission(id: number): void {
    this.missionService.getById(id).subscribe({
      next: (mission) => {
        this.currentStatus = mission.status;
        this.form.patchValue({
          name: mission.name,
          description: mission.description,
          startTime: this.toDatetimeLocal(mission.startTime),
          endTime: this.toDatetimeLocal(mission.endTime)
        });
      },
      error: (err) => {
        console.error('Failed to load mission', err);
        this.loadError = true;
      }
    });
  }

  /** Create — "Save as Draft" button. */
  saveAsDraft(): void {
    this.save('DRAFT');
  }

  /** Create — "Publish" button (a finished mission is visible to pilots). */
  publish(): void {
    this.save('PUBLISHED');
  }

  /** Edit — "Save changes"; keeps the mission's existing status unchanged. */
  saveChanges(): void {
    if (this.currentStatus === null) {
      return;
    }
    this.save(this.currentStatus);
  }

  private save(status: MissionStatus): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: MissionPayload = {
      name: raw.name.trim(),
      description: raw.description.trim(),
      status,
      startTime: this.fromDatetimeLocal(raw.startTime),
      endTime: this.fromDatetimeLocal(raw.endTime)
    };

    this.submitting = true;
    this.saveError = null;

    const request$ =
      this.isEdit && this.missionId !== null
        ? this.missionService.update(this.missionId, payload)
        : this.missionService.create(payload);

    request$.subscribe({
      next: (saved) => this.router.navigate(['/missions', saved.id]),
      error: (err) => {
        console.error('Failed to save mission', err);
        this.saveError = 'Could not save the mission. Please try again.';
        this.submitting = false;
      }
    });
  }

  /** ISO-8601 (UTC) from the backend → `yyyy-MM-ddTHH:mm` for <input type="datetime-local">. */
  private toDatetimeLocal(iso: string | undefined): string {
    if (!iso) {
      return '';
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const pad = (n: number) => `${n}`.padStart(2, '0');
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
  }

  /** `yyyy-MM-ddTHH:mm` local input → ISO-8601 string, or undefined when empty. */
  private fromDatetimeLocal(value: string): string | undefined {
    if (!value) {
      return undefined;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
}
