import { Routes } from '@angular/router';

import { MissionListComponent } from './components/mission-list/mission-list.component';
import { MissionDetailComponent } from './components/mission-detail/mission-detail.component';
import { MissionFormComponent } from './components/mission-form/mission-form.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { authGuard, designerGuard, homeRedirectGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Role-based landing: designers -> their missions, pilots -> marketplace.
  { path: '', canActivate: [homeRedirectGuard], children: [] },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // The open marketplace (every mission the backend exposes to all users).
  { path: 'missions', component: MissionListComponent, canActivate: [authGuard] },
  // Just the current user's missions.
  {
    path: 'missions/mine',
    component: MissionListComponent,
    canActivate: [authGuard],
    data: { mine: true }
  },
  // Create/edit are designer-only (also enforced by the backend).
  { path: 'missions/new', component: MissionFormComponent, canActivate: [authGuard, designerGuard] },
  { path: 'missions/:id/edit', component: MissionFormComponent, canActivate: [authGuard, designerGuard] },
  { path: 'missions/:id', component: MissionDetailComponent, canActivate: [authGuard] },

  { path: '**', redirectTo: '' }
];
