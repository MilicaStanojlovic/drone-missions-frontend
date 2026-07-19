import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';

import { Mission, MISSION_STATUS_LABELS } from '../../models/mission.model';
import { MissionService } from '../../services/mission.service';
import { AuthService } from '../../services/auth.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-mission-list',
  imports: [CommonModule, RouterLink, ConfirmDialogComponent],
  templateUrl: './mission-list.component.html',
  styleUrl: './mission-list.component.css'
})
export class MissionListComponent implements OnInit {
  private readonly missionService = inject(MissionService);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);

  readonly statusLabels = MISSION_STATUS_LABELS;

  /** true on the "My Missions" route (data.mine); false on the marketplace. */
  mine = false;
  missions$!: Observable<Mission[]>;

  /** The mission awaiting delete confirmation (drives the confirm dialog). */
  pendingDelete: Mission | null = null;

  ngOnInit(): void {
    this.mine = this.route.snapshot.data['mine'] === true;
    this.loadMissions();
  }

  /** Edit/delete are for the owning designer only (backend enforces too). */
  canModify(mission: Mission): boolean {
    return this.auth.isDesigner && mission.userId === this.auth.userId;
  }

  private loadMissions(): void {
    this.missions$ = this.mine ? this.missionService.getMine() : this.missionService.getAll();
  }

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
      next: () => this.loadMissions(),
      error: (err) => console.error('Failed to delete mission', err)
    });
  }
}
