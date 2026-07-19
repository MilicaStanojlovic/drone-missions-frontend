import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';

import { Mission, MISSION_STATUS_LABELS } from '../../models/mission.model';
import { MissionService } from '../../services/mission.service';
import { AuthService } from '../../services/auth.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

interface DetailState {
  status: 'loading' | 'loaded' | 'error';
  mission: Mission | null;
}

@Component({
  selector: 'app-mission-detail',
  imports: [CommonModule, RouterLink, ConfirmDialogComponent],
  templateUrl: './mission-detail.component.html',
  styleUrl: './mission-detail.component.css'
})
export class MissionDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly missionService = inject(MissionService);
  private readonly auth = inject(AuthService);

  readonly statusLabels = MISSION_STATUS_LABELS;

  /** The mission awaiting delete confirmation (drives the confirm dialog). */
  pendingDelete: Mission | null = null;

  /** Edit/delete are for the owning designer only (backend enforces too). */
  canModify(mission: Mission): boolean {
    return this.auth.isDesigner && mission.userId === this.auth.userId;
  }

  readonly vm$: Observable<DetailState> = this.route.paramMap.pipe(
    switchMap((params) =>
      this.missionService.getById(Number(params.get('id'))).pipe(
        map((mission): DetailState => ({ status: 'loaded', mission })),
        catchError(() => of<DetailState>({ status: 'error', mission: null })),
        startWith<DetailState>({ status: 'loading', mission: null })
      )
    )
  );

  askDelete(mission: Mission): void {
    this.pendingDelete = mission;
  }

  confirmDelete(): void {
    const mission = this.pendingDelete;
    this.pendingDelete = null;
    if (!mission) {
      return;
    }
    this.missionService.delete(mission.id).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => console.error('Failed to delete mission', err)
    });
  }
}
