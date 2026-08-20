import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('omits every param for a default page', () => {
    service.getPage().subscribe();

    const req = http.expectOne('http://localhost:8085/api/v1/users');
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ content: [], page: { size: 20, number: 0, totalElements: 0, totalPages: 0 } });
  });

  it('sends the role filter and a 0-based page', () => {
    service.getPage({ role: 'PILOT', page: 2 }).subscribe();

    const req = http.expectOne((r) => r.url === 'http://localhost:8085/api/v1/users');
    expect(req.request.params.get('role')).toBe('PILOT');
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ content: [], page: { size: 20, number: 2, totalElements: 41, totalPages: 3 } });
  });

  it('posts the new-admin payload to /users/admins', () => {
    const payload = { username: 'a', email: 'a@example.com', password: 'pw-long-enough' };
    service.createAdmin(payload).subscribe();

    const req = http.expectOne('http://localhost:8085/api/v1/users/admins');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({
      id: 4, username: 'a', email: 'a@example.com', role: 'ADMIN',
      suspended: false, createdAt: '2026-08-04T00:00:00Z'
    });
  });
});
