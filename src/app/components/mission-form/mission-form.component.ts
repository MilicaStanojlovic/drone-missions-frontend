import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { Geofence, LatLng, Mission, MissionPayload, MissionStatus } from '../../models/mission.model';
import { MissionService } from '../../services/mission.service';
import { MissionMapComponent } from '../mission-map/mission-map.component';
import { distanceText, durationText, enclosingCircle, zoneToCircle, zoneToPolygon } from '../../util/geo';

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

interface PlanSnapshot {
  waypoints: LatLng[];
  geofence: Geofence | null;
}

/**
 * The mission planner/editor: a Leaflet map pane (plot & adjust the flight plan)
 * beside a brief form. Everything — mission fields and the flight plan (location,
 * waypoints, zone, bidding deadline) — is saved through MissionService to the backend.
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
  waypoints: LatLng[] = [];
  geofence: Geofence | null = null;
  mode: 'add' | 'select' | 'pan' = 'add';
  private history: PlanSnapshot[] = [];

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
  get zoneType(): 'CIRCLE' | 'POLYGON' | null {
    return this.geofence?.type ?? null;
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
        this.waypoints = mission.waypoints ?? [];
        this.geofence = mission.geofence ?? null;
        this.form.patchValue({
          name: mission.name,
          description: mission.description,
          location: mission.location ?? '',
          startDate: this.toDateInput(mission.startTime),
          endDate: this.toDateInput(mission.endTime),
          biddingDeadline: mission.biddingDeadline ?? ''
        });
      },
      error: (err) => {
        console.error('Failed to load mission', err);
        this.loadError = true;
      }
    });
  }

  // ---- map events ----
  onWaypoints(next: LatLng[]): void {
    if (next.length !== this.waypoints.length) {
      this.pushHistory();
    }
    this.waypoints = next;
  }
  onGeofence(next: Geofence): void {
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
  /** Circle/Polygon build (or convert) a flight zone that encloses the waypoints. */
  setZone(type: 'CIRCLE' | 'POLYGON'): void {
    if (!this.geofence && !this.waypoints.length) {
      return; // nothing to enclose yet
    }
    const base = this.geofence ?? enclosingCircle(this.waypoints);
    this.pushHistory();
    this.geofence = type === 'CIRCLE' ? zoneToCircle(base) : zoneToPolygon(base);
  }
  clearZone(): void {
    if (!this.geofence) {
      return;
    }
    this.pushHistory();
    this.geofence = null;
  }
  undo(): void {
    const prev = this.history.pop();
    if (prev) {
      this.waypoints = prev.waypoints;
      this.geofence = prev.geofence;
    }
  }
  clear(): void {
    if (!this.waypoints.length && !this.geofence) {
      return;
    }
    this.pushHistory();
    this.waypoints = [];
    this.geofence = null;
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
    this.router.navigate(
      this.isEdit && this.missionId !== null ? ['/missions', this.missionId] : ['/missions/mine']
    );
  }

  private save(status: MissionStatus): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.waypoints.length < 2) {
      this.saveError =
        'Draw a flight path with at least 2 waypoints — a single point or an empty path can’t be saved.';
      return;
    }
    const raw = this.form.getRawValue();
    const payload: MissionPayload = {
      name: raw.name.trim(),
      description: raw.description.trim(),
      status,
      startTime: this.fromDateInput(raw.startDate),
      endTime: this.fromDateInput(raw.endDate),
      location: raw.location.trim() || undefined,
      biddingDeadline: raw.biddingDeadline || undefined,
      waypoints: this.waypoints,
      geofence: this.geofence
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
        this.saveError = this.serverMessage(err) ?? 'Could not save the mission. Please try again.';
        this.submitting = false;
      }
    });
  }

  /**
   * Pull a human message out of the backend's `{ data, status, message }` error body
   * (data is a field→message map, e.g. `{ waypoints: 'a flight path needs at least 2 waypoints' }`),
   * so server-side validation surfaces clearly instead of the generic fallback.
   */
  private serverMessage(err: unknown): string | null {
    const body = err instanceof HttpErrorResponse ? err.error : null;
    if (body && typeof body === 'object') {
      const data = (body as { data?: unknown }).data;
      if (data && typeof data === 'object') {
        const messages = Object.values(data as Record<string, unknown>).filter(
          (m): m is string => typeof m === 'string' && m.length > 0
        );
        if (messages.length) {
          return messages.join(' ');
        }
      }
      const message = (body as { message?: unknown }).message;
      if (typeof message === 'string' && message.length > 0) {
        return message;
      }
    }
    return null;
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
