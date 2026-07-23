import { Routes } from '@angular/router';

import { MissionListComponent } from './components/mission-list/mission-list.component';
import { MissionDetailComponent } from './components/mission-detail/mission-detail.component';
import { MissionFormComponent } from './components/mission-form/mission-form.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { LandingComponent } from './components/landing/landing.component';
import { ProfileComponent } from './components/profile/profile.component';
import { MyBidsComponent } from './components/my-bids/my-bids.component';
import { authGuard, designerGuard, landingGuard, pilotGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Public landing; logged-in users are redirected to their role home by the guard.
  { path: '', component: LandingComponent, canActivate: [landingGuard] },
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

  // The pilot's bid history (pilot-only, like the backend's /bids/my).
  { path: 'my-bids', component: MyBidsComponent, canActivate: [authGuard, pilotGuard] },

  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },

  { path: '**', redirectTo: '' }
];
