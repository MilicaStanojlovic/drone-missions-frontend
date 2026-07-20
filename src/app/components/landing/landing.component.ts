import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  MISSION_LIFECYCLE,
  MISSION_STATUS_COLORS,
  MISSION_STATUS_LABELS
} from '../../models/mission.model';

/**
 * Public landing page (the design's first screen). The two role cards route into
 * the existing registration flow with the role prefilled; a footer link goes to
 * sign-in. Logged-in visitors never reach here — the landingGuard on '' sends
 * them to their role home.
 */
@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  /** The mission lifecycle chips shown under the role cards. */
  readonly lifecycle = MISSION_LIFECYCLE;
  readonly statusColors = MISSION_STATUS_COLORS;
  readonly statusLabels = MISSION_STATUS_LABELS;
}
