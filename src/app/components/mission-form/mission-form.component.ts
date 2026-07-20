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
import { ActivatedRoute, Router } from '@angular/router';

import { Mission, MissionPayload, MissionStatus } from '../../models/mission.model';
import { Geofence, MissionPlan, Waypoint } from '../../models/mission-plan.model';
import { MissionService } from '../../services/mission.service';
import { MissionPlanService } from '../../services/mission-plan.service';
import { MissionMapComponent } from '../mission-map/mission-map.component';
import {
  distanceText,
  durationText,
  enclosingCircle,
  zoneToCircle,
  zoneToPolygon
} from '../../util/plan-geometry';

/** Fails if the value is only whitespace (so " " doesn't satisfy `required`). */
const notBlank: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  return typeof value === 'string' && value.length > 0 && value.trim().length === 0
    ? { blank: true }
    : null;
};

/** Group validator: end date, when set, must not be before the start date. */
const endAfterStart: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const start = group.get('startDate')?.value;
  const end = group.get('endDate')?.value;
  if (!start || !end) {
    return null;
  }
  return new Date(end).getTime() < new Date(start).getTime() ? { endBeforeStart: true } : null;
};

const DEFAULT_ZONE: Geofence = { type: 'circle', cx: 500, cy: 320, r: 300 };

/**
 * The mission planner/editor: a map pane (plot & adjust the flight plan) beside a
 * brief form. The mission fields the backend owns (name/description/status/times)
 * are saved via MissionService; the plan (location, waypoints, zone, bidding
 * deadline) is saved client-side via MissionPlanService, keyed by the mission id.
 */
@Component({
  selector: 'app-mission-form',
  imports: [CommonModule, ReactiveFormsModule, MissionMapComponent],
  templateUrl: './mission-form.component.html',
  styleUrl: './mission-form.component.css'
})
export class MissionFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly missionService = inject(MissionService);
  private readonly planService = inject(MissionPlanService);

  missionId: number | null = null;
  private currentStatus: MissionStatus | null = null;

  submitting = false;
  loadError = false;
  saveError: string | null = null;
  zoneWarn = false;
  private warnTimer: ReturnType<typeof setTimeout> | null = null;

  readonly maxName = 200;
  readonly maxDescription = 2000;

  // ---- plan (map) state ----
  waypoints: Waypoint[] = [];
  geofence: Geofence = DEFAULT_ZONE;
  mode: 'add' | 'select' | 'pan' = 'add';
  cursor: Waypoint = { x: 0, y: 0 };
  private history: { waypoints: Waypoint[]; geofence: Geofence }[] = [];

  readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, notBlank, Validators.maxLength(this.maxName)]],
      location: [''],
      description: ['', [Validators.required, notBlank, Validators.maxLength(this.maxDescription)]],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      biddingDeadline: ['']
    },
    { validators: endAfterStart }
  );

  get isEdit(): boolean {
    return this.missionId !== null;
  }
  get mapSeed(): string {
    return this.missionId !== null ? 'm' + this.missionId : 'new';
  }
  get descriptionLength(): number {
    return this.form.controls.description.value.length;
  }

  // ---- readouts / checklist ----
  get waypointCount(): number {
    return this.waypoints.length;
  }
  get pathText(): string {
    return distanceText(this.waypoints);
  }
  get flightText(): string {
    return durationText(this.waypoints);
  }
  get cursorText(): string {
    const pad = (n: number) => `${Math.max(0, n)}`.padStart(4, '0');
    return `${pad(this.cursor.x)} · ${pad(this.cursor.y)}`;
  }
  get hasTitle(): boolean {
    return this.form.controls.name.value.trim().length > 0;
  }
  get hasWaypoints(): boolean {
    return this.waypoints.length >= 2;
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
          startDate: this.toDateInput(mission.startTime),
          endDate: this.toDateInput(mission.endTime)
        });
        const plan = this.planService.get(id);
        if (plan) {
          this.waypoints = plan.waypoints ?? [];
          this.geofence = plan.geofence ?? enclosingCircle(this.waypoints);
          this.form.patchValue({
            location: plan.location ?? '',
            biddingDeadline: plan.biddingDeadline ?? ''
          });
        }
      },
      error: (err) => {
        console.error('Failed to load mission', err);
        this.loadError = true;
      }
    });
  }

  // ---- map events ----
  onWaypoints(next: Waypoint[]): void {
    if (next.length !== this.waypoints.length) {
      this.pushHistory();
    }
    this.waypoints = next;
  }
  onGeofence(next: Geofence): void {
    if (next.type !== this.geofence.type) {
      this.pushHistory();
    }
    this.geofence = next;
  }
  onOutOfZone(): void {
    this.zoneWarn = true;
    if (this.warnTimer) {
      clearTimeout(this.warnTimer);
    }
    this.warnTimer = setTimeout(() => (this.zoneWarn = false), 1600);
  }

  // ---- toolbar ----
  setMode(mode: 'add' | 'select' | 'pan'): void {
    this.mode = mode;
  }
  setZone(type: 'circle' | 'polygon'): void {
    const next = type === 'circle' ? zoneToCircle(this.geofence) : zoneToPolygon(this.geofence);
    if (next.type !== this.geofence.type) {
      this.pushHistory();
      this.geofence = next;
    }
  }
  undo(): void {
    const prev = this.history.pop();
    if (prev) {
      this.waypoints = prev.waypoints;
      this.geofence = prev.geofence;
    }
  }
  clear(): void {
    if (!this.waypoints.length) {
      return;
    }
    this.pushHistory();
    this.waypoints = [];
  }
  private pushHistory(): void {
    this.history.push({ waypoints: this.waypoints, geofence: this.geofence });
    if (this.history.length > 50) {
      this.history.shift();
    }
  }

  // ---- save ----
  saveAsDraft(): void {
    this.save('DRAFT');
  }
  publish(): void {
    if (!this.hasTitle || !this.hasWaypoints) {
      this.form.markAllAsTouched();
      this.saveError = 'Add a title and at least 2 waypoints before publishing.';
      return;
    }
    this.save('PUBLISHED');
  }
  saveChanges(): void {
    if (this.currentStatus === null) {
      return;
    }
    this.save(this.currentStatus);
  }

  cancel(): void {
    this.router.navigate(this.isEdit && this.missionId !== null ? ['/missions', this.missionId] : ['/missions/mine']);
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
      startTime: this.fromDateInput(raw.startDate),
      endTime: this.fromDateInput(raw.endDate)
    };

    this.submitting = true;
    this.saveError = null;

    const request$ =
      this.isEdit && this.missionId !== null
        ? this.missionService.update(this.missionId, payload)
        : this.missionService.create(payload);

    request$.subscribe({
      next: (saved) => {
        this.persistPlan(saved.id, raw.location, raw.biddingDeadline);
        this.router.navigate(['/missions', saved.id]);
      },
      error: (err) => {
        console.error('Failed to save mission', err);
        this.saveError = 'Could not save the mission. Please try again.';
        this.submitting = false;
      }
    });
  }

  private persistPlan(id: number, location: string, biddingDeadline: string): void {
    const plan: MissionPlan = {
      location: location.trim() || undefined,
      biddingDeadline: biddingDeadline || undefined,
      waypoints: this.waypoints,
      geofence: this.geofence
    };
    this.planService.save(id, plan);
  }

  /** ISO-8601 → `yyyy-MM-dd` for <input type="date">. */
  private toDateInput(iso?: string): string {
    if (!iso) {
      return '';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    const pad = (n: number) => `${n}`.padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  /** `yyyy-MM-dd` (local midnight) → ISO-8601, or undefined when empty. */
  private fromDateInput(value: string): string | undefined {
    if (!value) {
      return undefined;
    }
    const d = new Date(value + 'T00:00:00');
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
}
