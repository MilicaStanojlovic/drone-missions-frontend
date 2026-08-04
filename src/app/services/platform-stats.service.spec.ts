import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PlatformStatsService } from './platform-stats.service';

describe('PlatformStatsService', () => {
  let service: PlatformStatsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PlatformStatsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the snapshot with no params', () => {
    let received = false;
    service.getOverview().subscribe(() => (received = true));

    const req = http.expectOne('http://localhost:8085/api/v1/platform-stats');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush({
      missionsByStatus: {
        DRAFT: 0, PUBLISHED: 0, BIDDING: 0, AWARDED: 0,
        IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0
      },
      activePilots: 0,
      bidCount: 0,
      bidAmountTotal: 0,
      suspendedUsers: 0,
      usersByRole: { DESIGNER: 0, PILOT: 0, ADMIN: 0 },
      topMissionsByBids: []
    });
    expect(received).toBeTrue();
  });
});
