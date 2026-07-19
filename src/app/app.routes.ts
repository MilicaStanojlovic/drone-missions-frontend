import { Routes } from '@angular/router';

import { MissionListComponent } from './components/mission-list/mission-list.component';
import { MissionDetailComponent } from './components/mission-detail/mission-detail.component';
import { MissionFormComponent } from './components/mission-form/mission-form.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';

export const routes: Routes = [
  { path: '', component: MissionListComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'missions/new', component: MissionFormComponent },
  { path: 'missions/:id/edit', component: MissionFormComponent },
  { path: 'missions/:id', component: MissionDetailComponent }
];
