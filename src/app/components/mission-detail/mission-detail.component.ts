import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';

import { Mission, MISSION_STATUS_LABELS } from '../../models/mission.model';
import { MissionService } from '../../services/mission.service';

interface DetailState {
  status: 'loading' | 'loaded' | 'error';
  mission: Mission | null;
}

@Component({
  selector: 'app-mission-detail',
  imports: [CommonModule, RouterLink],
  templateUrl: './mission-detail.component.html',
  styleUrl: './mission-detail.component.css'
})
export class MissionDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly missionService = inject(MissionService);

  readonly statusLabels = MISSION_STATUS_LABELS;

  readonly vm$: Observable<DetailState> = this.route.paramMap.pipe(
    switchMap((params) =>
      this.missionService.getById(Number(params.get('id'))).pipe(
        map((mission): DetailState => ({ status: 'loaded', mission })),
        catchError(() => of<DetailState>({ status: 'error', mission: null })),
        startWith<DetailState>({ status: 'loading', mission: null })
      )
    )
  );

  deleteMission(mission: Mission): void {
    if (!confirm(`Delete mission "${mission.name}"?`)) {
      return;
    }
    this.missionService.delete(mission.id).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => console.error('Failed to delete mission', err)
    });
  }
}
