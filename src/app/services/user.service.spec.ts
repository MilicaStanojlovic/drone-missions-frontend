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
