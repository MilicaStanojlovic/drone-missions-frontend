import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';

import { Mission, MISSION_STATUS_LABELS } from '../../models/mission.model';
import { MissionService } from '../../services/mission.service';

@Component({
  selector: 'app-mission-list',
  imports: [CommonModule, RouterLink],
  templateUrl: './mission-list.component.html',
  styleUrl: './mission-list.component.css'
})
export class MissionListComponent implements OnInit {
  private readonly missionService = inject(MissionService);

  readonly statusLabels = MISSION_STATUS_LABELS;

  missions$!: Observable<Mission[]>;

  ngOnInit(): void {
    this.loadMissions();
  }

  private loadMissions(): void {
    this.missions$ = this.missionService.getAll();
  }

  deleteMission(mission: Mission): void {
    if (!confirm(`Delete mission "${mission.name}"?`)) {
      return;
    }
    this.missionService.delete(mission.id).subscribe({
      next: () => this.loadMissions(),
      error: (err) => console.error('Failed to delete mission', err)
    });
  }
}
