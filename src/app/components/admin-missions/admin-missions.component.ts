import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { MissionService } from '../../services/mission.service';
import {
  MISSION_STATUS_COLORS,
  MISSION_STATUS_LABELS,
  Mission
} from '../../models/mission.model';

/**
 * Admin view: every mission on the platform, any status or owner. The backend
 * returns the full set on GET /missions when the caller is an admin.
 */
@Component({
  selector: 'app-admin-missions',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-missions.component.html',
  styleUrl: './admin-missions.component.css'
})
export class AdminMissionsComponent implements OnInit {
  private readonly missionService = inject(MissionService);

  readonly statusLabels = MISSION_STATUS_LABELS;
  readonly statusColors = MISSION_STATUS_COLORS;
  readonly search = inject(FormBuilder).nonNullable.control('');

  loading = true;
  error = false;
  missions: Mission[] = [];

  ngOnInit(): void {
    this.missionService.getAll().subscribe({
      next: (missions) => {
        this.missions = missions;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  /** Client-side narrowing by mission name or designer, per the design's search box. */
  get visibleMissions(): Mission[] {
    const term = this.search.value.trim().toLowerCase();
    if (!term) {
      return this.missions;
    }
    return this.missions.filter(
      (m) =>
        m.name.toLowerCase().includes(term) ||
        (m.designerName ?? '').toLowerCase().includes(term)
    );
  }

  /** "Novi Sad · Aug 12 – Aug 14", degrading gracefully when fields are unset. */
  meta(mission: Mission): string {
    const parts: string[] = [mission.location?.trim() || 'No location'];
    if (mission.startTime && mission.endTime) {
      parts.push(`${this.day(mission.startTime)} – ${this.day(mission.endTime)}`);
    }
    return parts.join(' · ');
  }

  private day(iso: string): string {
    return formatDate(iso, 'MMM d', 'en-US');
  }
}
