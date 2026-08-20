import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';

import { WAYPOINT_ACTION_LABELS, Waypoint, WaypointAction } from '../../models/mission.model';

/** What the modal collects for a waypoint — the fields the backend requires. */
export interface WaypointDetails {
  altitude: number;
  action: WaypointAction;
  hoverDurationSeconds?: number;
}

/** Validators.min(0) would let 0 through, which the backend rejects. */
const positive: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  return value === null || value === '' || Number(value) > 0 ? null : { positive: true };
};

/** The backend's hover duration is a whole number of seconds. */
const wholeNumber: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  return value === null || value === '' || Number.isInteger(Number(value)) ? null : { integer: true };
};

/**
 * Captures a waypoint's altitude and drone action. Controlled via [open]; emits
 * (save) with the collected values or (cancelled). Escape and a backdrop click
 * both cancel. Pass [initial] to edit an existing waypoint, null to create one.
 */
@Component({
  selector: 'app-waypoint-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './waypoint-dialog.component.html',
  styleUrl: './waypoint-dialog.component.css'
})
export class WaypointDialogComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() open = false;
  @Input() initial: Waypoint | null = null;

  @Output() save = new EventEmitter<WaypointDetails>();
  @Output() cancelled = new EventEmitter<void>();

  /** Metres; the backend caps a waypoint at this altitude. */
  readonly maxAltitude = 120;
  readonly actionLabels = WAYPOINT_ACTION_LABELS;
  readonly actions = Object.keys(WAYPOINT_ACTION_LABELS) as WaypointAction[];

  readonly form = this.fb.group({
    altitude: this.fb.control<number | null>(null, [
      Validators.required,
      positive,
      Validators.max(this.maxAltitude)
    ]),
    action: this.fb.control<WaypointAction | null>(null, [Validators.required]),
    hoverDurationSeconds: this.fb.control<number | null>(null)
  });

  constructor() {
    this.form.controls.action.valueChanges.subscribe((action) => this.syncHoverField(action));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.open && (changes['open'] || changes['initial'])) {
      this.resetForm();
    }
  }

  get isHover(): boolean {
    return this.form.controls.action.value === 'HOVER';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { altitude, action, hoverDurationSeconds } = this.form.getRawValue();
    if (altitude === null || action === null) {
      return;
    }
    this.save.emit(
      action === 'HOVER'
        ? { altitude, action, hoverDurationSeconds: Number(hoverDurationSeconds) }
        : { altitude, action }
    );
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.cancelled.emit();
    }
  }

  /** Cancel only when the backdrop itself is clicked, not the card above it. */
  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cancelled.emit();
    }
  }

  private resetForm(): void {
    this.form.reset({
      altitude: this.initial?.altitude ?? null,
      action: this.initial?.action ?? null,
      hoverDurationSeconds: this.initial?.hoverDurationSeconds ?? null
    });
    this.syncHoverField(this.form.controls.action.value);
  }

  /** The duration is required for HOVER and dropped for every other action. */
  private syncHoverField(action: WaypointAction | null): void {
    const control = this.form.controls.hoverDurationSeconds;
    if (action === 'HOVER') {
      control.setValidators([Validators.required, positive, wholeNumber]);
    } else {
      control.clearValidators();
      control.setValue(null, { emitEvent: false });
    }
    control.updateValueAndValidity({ emitEvent: false });
  }
}
