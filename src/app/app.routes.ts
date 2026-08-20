import { Routes } from '@angular/router';

import { MissionListComponent } from './components/mission-list/mission-list.component';
import { MissionDetailComponent } from './components/mission-detail/mission-detail.component';
import { MissionFormComponent } from './components/mission-form/mission-form.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { LandingComponent } from './components/landing/landing.component';
import { ProfileComponent } from './components/profile/profile.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { MyBidsComponent } from './components/my-bids/my-bids.component';
import { AdminMissionsComponent } from './components/admin-missions/admin-missions.component';
import { AdminUsersComponent } from './components/admin-users/admin-users.component';
import { AdminAuditLogComponent } from './components/admin-audit-log/admin-audit-log.component';
import { AdminOverviewComponent } from './components/admin-overview/admin-overview.component';
import { AdminRegisterComponent } from './components/admin-register/admin-register.component';
import { adminGuard, authGuard, designerGuard, landingGuard, pilotGuard } from './guards/auth.guard';

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

  // Admin section: every mission and every account (admin-only, like the backend).
  { path: 'admin/overview', component: AdminOverviewComponent, canActivate: [authGuard, adminGuard] },
  { path: 'admin/missions', component: AdminMissionsComponent, canActivate: [authGuard, adminGuard] },
  { path: 'admin/users', component: AdminUsersComponent, canActivate: [authGuard, adminGuard] },
  { path: 'admin/users/new', component: AdminRegisterComponent, canActivate: [authGuard, adminGuard] },
  { path: 'admin/audit-log', component: AdminAuditLogComponent, canActivate: [authGuard, adminGuard] },

  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  // Anyone else's profile, reached from a feed card or a mission's rating panel.
  { path: 'users/:id', component: UserProfileComponent, canActivate: [authGuard] },

  { path: '**', redirectTo: '' }
];
