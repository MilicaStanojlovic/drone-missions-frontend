import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuditLogService } from './audit-log.service';
import { AuditLogEntry } from '../models/audit.model';
import { PagedModel } from '../models/page.model';

const EMPTY_PAGE: PagedModel<AuditLogEntry> = {
  content: [],
  page: { size: 20, number: 0, totalElements: 0, totalPages: 0 }
};

describe('AuditLogService', () => {
  let service: AuditLogService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuditLogService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('omits every param for a default query', () => {
    service.getPage().subscribe();

    const req = http.expectOne('http://localhost:8085/api/v1/audit-log');
    expect(req.request.params.keys()).toEqual([]);
    req.flush(EMPTY_PAGE);
  });

  it('omits the page param for the first page', () => {
    service.getPage({ page: 0, q: '   ' }).subscribe();

    const req = http.expectOne('http://localhost:8085/api/v1/audit-log');
    expect(req.request.params.has('page')).toBeFalse();
    expect(req.request.params.has('q')).toBeFalse();
    req.flush(EMPTY_PAGE);
  });

  it('sends set filters, trims q, and keeps page 0-based', () => {
    service.getPage({ page: 2, role: 'PILOT', action: 'BID_PLACED', q: ' orchard ' }).subscribe();

    const req = http.expectOne((r) => r.url === 'http://localhost:8085/api/v1/audit-log');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('role')).toBe('PILOT');
    expect(req.request.params.get('action')).toBe('BID_PLACED');
    expect(req.request.params.get('q')).toBe('orchard');
    req.flush(EMPTY_PAGE);
  });
});
